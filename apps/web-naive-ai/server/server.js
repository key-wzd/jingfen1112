import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { randomBytes, createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { installAuth } from './auth.js';
import { createSqlPlanStore, installAnalysisPlanRoutes } from './analysis-plans.js';
import { toMeasurement } from '../shared/measurement.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const app = express();
const localEnv = path.join(__dirname, '.env.local');
if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
const PORT = Number(process.env.TC_API_PORT || 3002);
const HOST = process.env.TC_API_HOST || '0.0.0.0';
const GLM_API_KEY = process.env.GLM_API_KEY || '';
const GLM_MODEL = process.env.GLM_MODEL || 'glm-5.3-flash';
const GLM_BASE_URL = (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/$/, '');
const GLM_TIMEOUT_MS = Number(process.env.GLM_TIMEOUT_MS || 30000);

app.use(cors({ origin: process.env.TC_WEB_ORIGIN || 'http://127.0.0.1:5890' }));
app.use(express.json({ limit: '1mb' }));
installAuth(app);
app.use('/uploads', express.static(uploadsDir));

const dbConfig = {
  host: process.env.TC_DB_HOST || 'localhost',
  port: Number(process.env.TC_DB_PORT || 3306),
  user: process.env.TC_DB_USER || 'root',
  password: process.env.TC_DB_PASSWORD || '',
  database: process.env.TC_DB_NAME || 'techcompare_internal_copy',
  waitForConnections: true,
  connectionLimit: 10,
};
if (
  dbConfig.database === 'phone_compare' ||
  !/^[a-zA-Z0-9_]+$/.test(dbConfig.database)
) {
  throw new Error('副本必须使用独立数据库，请配置 TC_DB_NAME。');
}

const rawPool = mysql.createPool(dbConfig);
const transactionContext = new AsyncLocalStorage();
const pool = {
  query: (...args) => (transactionContext.getStore() || rawPool).query(...args),
  getConnection: () => rawPool.getConnection(),
};

const planStore = createSqlPlanStore(rawPool);
installAnalysisPlanRoutes(app, {
  store: planStore,
  getDataset: async (category, ids) => {
    const meta = await getMetaFromDb();
    const config = meta[category]?.power;
    if (!config) return null;
    const [records] = await pool.query(`SELECT id,brand,model FROM ${mysql.escapeId(config.table)} WHERE id IN (?)`, [ids]);
    return { version: config.table, records };
  },
});

const CHART_TYPE_MAP = {
  折线图: 'line',
  柱状图: 'bar',
  纵向柱状图: 'bar',
  横向柱状图: 'barH',
  饼图: 'pie',
  雷达图: 'radar',
};

const FIXED_COLUMNS = ['id', 'brand', 'model', 'created_at', 'updated_at'];
const CN_TO_EN_RESERVED = { 品牌: 'brand', 型号: 'model' };

function cnToEnField(cnName) {
  if (CN_TO_EN_RESERVED[cnName]) return CN_TO_EN_RESERVED[cnName];
  const pinyinMap = {
    图片: 'image',
    屏幕: 'screen',
    处理器: 'processor',
    内存: 'ram',
    存储: 'storage',
    摄像头: 'camera',
    电池: 'battery',
    价格: 'price',
    电池容量: 'battery_capacity',
    视频播放功耗: 'video_power',
    视频播放: 'video_power',
    游戏功耗: 'game_power',
    游戏: 'game_power',
    待机功耗: 'standby_power',
    待机: 'standby_power',
    浏览网页功耗: 'browser_power',
    浏览网页: 'browser_power',
    睡眠功耗: 'sleep_power',
    睡眠: 'sleep_power',
    休眠功耗: 'dormancy_power',
    休眠: 'dormancy_power',
    使用功耗: 'usage_power',
    使用: 'usage_power',
    功耗对比场景: 'power_scenario',
    场景: 'power_scenario',
    图表类型: 'chart_type',
    单位: 'unit',
    公司: 'company',
    品牌: 'brand',
    型号: 'model',
  };
  if (pinyinMap[cnName]) return pinyinMap[cnName];
  return (
    cnName
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `field_${cnName.charCodeAt(0)}`
  );
}

function isNumericValue(val) {
  if (typeof val === 'number') return true;
  if (typeof val === 'string' && val.trim() !== '') {
    return !isNaN(Number(val)) && val.trim() !== '';
  }
  return false;
}

function isImageValue(val) {
  if (!val || typeof val !== 'string') return false;
  return /=DISPIMG\(/i.test(val);
}

function parseSheetType(sheetName) {
  const trimmed = sheetName.trim();
  if (trimmed.endsWith('产品信息')) {
    return {
      type: 'info',
      categoryName: trimmed.replace(/产品信息$/, '').trim(),
    };
  }
  if (trimmed.endsWith('功耗数据')) {
    return {
      type: 'power',
      categoryName: trimmed.replace(/功耗数据$/, '').trim(),
    };
  }
  return { type: 'config', categoryName: trimmed };
}

function categoryNameToKey(name) {
  const map = {
    旗舰手机: 'phones',
    中低端手机: 'mid_low_phones',
    鼠标: 'mice',
    键盘: 'keyboards',
    遥控器: 'remote_controls',
  };
  if (map[name]) return map[name];
  return (
    name
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'cat_' + Date.now()
  );
}

function parseTransposedSheet(rows) {
  if (!rows || rows.length === 0) return [];
  const maxCols = Math.max(...rows.map((row) => (row && row.length) || 0));
  const records = [];
  for (let col = 1; col < maxCols; col++) {
    const record = {};
    let hasData = false;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || row[0] === undefined || row[0] === null) continue;
      const fieldName = String(row[0]).trim();
      if (!fieldName) continue;
      if (fieldName === '功耗对比场景' || fieldName === '图表类型') continue;
      const value = col < row.length ? row[col] : '';
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ''
      ) {
        record[fieldName] = value;
        hasData = true;
      } else {
        if (!(fieldName in record)) {
          record[fieldName] = '';
        }
      }
    }
    if (hasData) {
      records.push(record);
    }
  }
  return records;
}

function extractDispimgId(cellValue) {
  if (!cellValue || typeof cellValue !== 'string') return null;
  const match = cellValue.match(/=DISPIMG\("([^"]+)"/i);
  return match ? match[1] : null;
}

function extractImagesFromXlsx(xlsxPath) {
  try {
    const fileBuffer = fs.readFileSync(xlsxPath);
    const zip = new AdmZip(fileBuffer);
    if (!zip.getEntry('xl/cellimages.xml')) return {};

    const cellImagesXml = zip.readAsText('xl/cellimages.xml');
    if (!zip.getEntry('xl/_rels/cellimages.xml.rels')) return {};
    const relsXml = zip.readAsText('xl/_rels/cellimages.xml.rels');

    const nameToRid = {};
    const picRegex = /<xdr:pic>([\s\S]*?)<\/xdr:pic>/g;
    let picMatch;
    while ((picMatch = picRegex.exec(cellImagesXml)) !== null) {
      const picContent = picMatch[1];
      const nameMatch = picContent.match(/name="([^"]+)"/);
      const ridMatch = picContent.match(/r:embed="([^"]+)"/);
      if (nameMatch && ridMatch) nameToRid[nameMatch[1]] = ridMatch[1];
    }

    const ridToPath = {};
    const relRegex = /Id="([^"]+)"[^>]*Target="([^"]+)"/g;
    let relMatch;
    while ((relMatch = relRegex.exec(relsXml)) !== null) {
      ridToPath[relMatch[1]] = relMatch[2];
    }

    const nameToFile = {};
    for (const [name, rid] of Object.entries(nameToRid)) {
      const mediaPath = ridToPath[rid];
      if (!mediaPath) continue;
      const fullPath = `xl/${mediaPath}`;
      const entry = zip.getEntry(fullPath);
      if (entry) {
        const ext = path.extname(mediaPath) || '.jpeg';
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${safeName}_${randomBytes(6).toString('hex')}${ext}`;
        fs.writeFileSync(path.join(imagesDir, filename), entry.getData());
        nameToFile[name] = `/uploads/images/${filename}`;
      }
    }
    return nameToFile;
  } catch (error) {
    console.error('提取图片失败:', error.message);
    return {};
  }
}

async function syncImageMapToDb(categoryKey, imageMap) {
  if (!imageMap || Object.keys(imageMap).length === 0) return;
  for (const [dispimgId, imagePath] of Object.entries(imageMap)) {
    await pool.query(
      `INSERT INTO image_mapping (category_key, dispimg_id, image_path) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE image_path = VALUES(image_path)`,
      [categoryKey, dispimgId, imagePath],
    );
  }
}

async function getImageMapFromDb(categoryKey) {
  const [rows] = await pool.query(
    'SELECT dispimg_id, image_path FROM image_mapping WHERE category_key = ?',
    [categoryKey],
  );
  const map = {};
  for (const row of rows) {
    map[row.dispimg_id] = row.image_path;
  }
  return map;
}

async function getMetaFromDb() {
  const [sheets] = await pool.query(
    'SELECT * FROM sheet_meta ORDER BY category_key, sheet_type',
  );
  const [fields] = await pool.query(
    'SELECT * FROM field_meta ORDER BY category_key, sheet_type, display_order',
  );
  const [charts] = await pool.query(
    'SELECT * FROM chart_config ORDER BY category_key, scenario_order',
  );
  const [headerRowsDb] = await pool.query(
    'SELECT * FROM header_rows ORDER BY category_key, row_index, col_index',
  );

  const result = {};
  for (const s of sheets) {
    if (!result[s.category_key]) {
      result[s.category_key] = {
        name: s.category_name,
        info: null,
        power: null,
      };
    }
    const sheetFields = fields
      .filter(
        (f) =>
          f.category_key === s.category_key && f.sheet_type === s.sheet_type,
      )
      .map((f) => ({
        en_name: f.en_name,
        cn_name: f.cn_name,
        field_type: f.field_type,
        display_order: f.display_order,
      }));

    const sheetCharts = charts
      .filter(
        (c) =>
          c.category_key === s.category_key && c.sheet_type === s.sheet_type,
      )
      .reduce((acc, c) => {
        let existing = acc.find((a) => a.order === c.scenario_order);
        if (!existing) {
          existing = {
            scenario: c.scenario,
            chartType: c.chart_type,
            unit: c.unit || '',
            order: c.scenario_order,
            fields: [],
            labels: [],
          };
          acc.push(existing);
        }
        if (c.field_name !== null && c.field_label !== null) {
          existing.fields.push(c.field_name);
          existing.labels.push(c.field_label);
        }
        return acc;
      }, []);

    const displayColumns = sheetFields
      .filter((f) => f.en_name !== 'brand' && f.en_name !== 'model')
      .map((f) => {
        const col = { key: f.en_name, label: f.cn_name };
        if (f.field_type === 'image') col.type = 'image';
        return col;
      });

    const cnToEnFieldMap = {};
    for (const f of sheetFields) {
      cnToEnFieldMap[f.cn_name] = f.en_name;
    }

    const sheetHeaderRows = headerRowsDb
      .filter(
        (h) =>
          h.category_key === s.category_key && h.sheet_type === s.sheet_type,
      )
      .reduce((acc, h) => {
        if (!acc[h.row_index]) acc[h.row_index] = [];
        const fieldKey =
          cnToEnFieldMap[h.field_label] || cnToEnField(h.field_label) || '';
        acc[h.row_index].push({
          label: h.field_label,
          value: h.field_value,
          fieldKey,
        });
        return acc;
      }, []);

    result[s.category_key][s.sheet_type] = {
      table: s.table_name,
      fields: [
        'brand',
        'model',
        ...sheetFields
          .filter((f) => f.en_name !== 'brand' && f.en_name !== 'model')
          .map((f) => f.en_name),
      ],
      cnFields: [
        '品牌',
        '型号',
        ...sheetFields
          .filter((f) => f.en_name !== 'brand' && f.en_name !== 'model')
          .map((f) => f.cn_name),
      ],
      displayColumns,
      chartConfig: sheetCharts,
      headerRows: Object.values(sheetHeaderRows),
    };
  }
  return result;
}

async function createTable(tableName, fieldDefs) {
  await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  const nonFixedFields = fieldDefs.filter(
    (f) => !FIXED_COLUMNS.includes(f.en_name),
  );
  const columnDefs = nonFixedFields.map((f) => {
    if (f.en_name === 'brand' || f.en_name === 'model') {
      return `\`${f.en_name}\` VARCHAR(100) NOT NULL COMMENT ${mysql.escape(f.cn_name)}`;
    }
    if (f.field_type === 'number') {
      return `\`${f.en_name}\` DOUBLE DEFAULT NULL COMMENT ${mysql.escape(f.cn_name)}`;
    }
    if (f.field_type === 'image') {
      return `\`${f.en_name}\` TEXT COMMENT ${mysql.escape(f.cn_name)}`;
    }
    return `\`${f.en_name}\` TEXT COMMENT ${mysql.escape(f.cn_name)}`;
  });

  const allColumns = [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    `\`brand\` VARCHAR(100) NOT NULL COMMENT '品牌'`,
    `\`model\` VARCHAR(100) NOT NULL COMMENT '型号'`,
    ...columnDefs.filter(
      (c) => !c.startsWith('`brand`') && !c.startsWith('`model`'),
    ),
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  ];

  await pool.query(
    `CREATE TABLE \`${tableName}\` (${allColumns.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC`,
  );
}

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  const conn = await pool.getConnection();

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sheet_meta (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_key VARCHAR(100) NOT NULL,
      category_name VARCHAR(100) NOT NULL,
      sheet_name VARCHAR(200) NOT NULL,
      sheet_type ENUM('info','power') NOT NULL,
      table_name VARCHAR(200) NOT NULL,
      UNIQUE KEY uk_cat_type (category_key, sheet_type),
      UNIQUE KEY uk_sheet_name (sheet_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS field_meta (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_key VARCHAR(100) NOT NULL,
      sheet_type ENUM('info','power') NOT NULL,
      en_name VARCHAR(100) NOT NULL,
      cn_name VARCHAR(100) NOT NULL,
      field_type ENUM('text','number','image') NOT NULL DEFAULT 'text',
      display_order INT DEFAULT 0,
      UNIQUE KEY uk_cat_type_field (category_key, sheet_type, en_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS chart_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_key VARCHAR(100) NOT NULL,
      sheet_type ENUM('info','power') NOT NULL DEFAULT 'power',
      scenario VARCHAR(100) NOT NULL,
      scenario_order INT DEFAULT 0,
      chart_type VARCHAR(20) NOT NULL DEFAULT 'bar',
      unit VARCHAR(20),
      field_name VARCHAR(100),
      field_label VARCHAR(100),
      field_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(
    `ALTER TABLE chart_config MODIFY COLUMN field_name VARCHAR(100), MODIFY COLUMN field_label VARCHAR(100)`,
  );
  try {
    await conn.query(`ALTER TABLE chart_config ADD COLUMN unit VARCHAR(20)`);
  } catch (e) {
    if (!e.message.includes('Duplicate column name')) throw e;
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS image_mapping (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_key VARCHAR(100) NOT NULL,
      dispimg_id VARCHAR(200) NOT NULL,
      image_path TEXT NOT NULL,
      UNIQUE KEY uk_cat_dispimg (category_key, dispimg_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS header_rows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_key VARCHAR(100) NOT NULL,
      sheet_type ENUM('info','power') NOT NULL,
      row_index INT NOT NULL,
      col_index INT NOT NULL,
      field_label VARCHAR(200) NOT NULL,
      field_value TEXT,
      UNIQUE KEY uk_cat_row_col (category_key, sheet_type, row_index, col_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS dataset_manifest (
      batch_id VARCHAR(20) PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      file_hash CHAR(64) NOT NULL,
      categories TEXT NOT NULL,
      total_records INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_dataset_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  conn.release();
  console.log('数据库初始化完成（含元数据表、图片映射表、表头行表）');
}

function detectFieldTypes(records, sheetType) {
  const fieldTypes = {};
  const allFields = new Set();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      allFields.add(key);
    }
  }

  for (const field of allFields) {
    if (field === '品牌' || field === '型号') {
      fieldTypes[field] = 'text';
      continue;
    }

    if (sheetType === 'power' && field.includes('功耗')) {
      fieldTypes[field] = 'number';
      continue;
    }

    let hasImage = false;
    let allNumeric = true;
    let hasValue = false;

    for (const record of records) {
      const val = record[field];
      if (val === undefined || val === null || String(val).trim() === '')
        continue;
      hasValue = true;
      if (isImageValue(val)) {
        hasImage = true;
        allNumeric = false;
        break;
      }
      if (!isNumericValue(val)) {
        allNumeric = false;
      }
    }

    if (!hasValue) {
      fieldTypes[field] = 'text';
    } else if (hasImage) {
      fieldTypes[field] = 'image';
    } else if (allNumeric) {
      fieldTypes[field] = 'number';
    } else {
      fieldTypes[field] = 'text';
    }
  }

  return fieldTypes;
}

function extractAllFieldNames(rawRows) {
  const fieldNames = [];
  for (let rowIdx = 0; rowIdx < rawRows.length; rowIdx++) {
    const row = rawRows[rowIdx];
    if (!row || !row[0]) continue;
    const fieldName = String(row[0]).trim();
    if (fieldName && !fieldNames.includes(fieldName)) {
      fieldNames.push(fieldName);
    }
  }
  return fieldNames;
}

function mergeFieldTypesWithAllNames(fieldTypes, allFieldNames) {
  const merged = { ...fieldTypes };
  for (const fieldName of allFieldNames) {
    if (!merged[fieldName]) {
      merged[fieldName] = 'text';
    }
  }
  return merged;
}

function extractHeaderRows(rawRows, maxRows = 5) {
  const headerRows = [];
  const maxCols = Math.max(...rawRows.map((row) => (row && row.length) || 0));
  const rowCount = Math.min(rawRows.length, maxRows);
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const row = rawRows[rowIdx];
    if (!row) continue;
    const rowData = [];
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const label = colIdx === 0 ? (row[0] ? String(row[0]).trim() : '') : '';
      const value =
        colIdx > 0 && colIdx < row.length
          ? row[colIdx] != null
            ? String(row[colIdx]).trim()
            : ''
          : '';
      rowData.push({ label, value });
    }
    if (rowData.some((d) => d.label || d.value)) {
      headerRows.push(rowData);
    }
  }
  return headerRows;
}

async function syncHeaderRowsToDb(categoryKey, sheetType, headerRows) {
  await pool.query(
    'DELETE FROM header_rows WHERE category_key = ? AND sheet_type = ?',
    [categoryKey, sheetType],
  );
  for (let rowIdx = 0; rowIdx < headerRows.length; rowIdx++) {
    const row = headerRows[rowIdx];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      if (row[colIdx].label || row[colIdx].value) {
        await pool.query(
          `INSERT INTO header_rows (category_key, sheet_type, row_index, col_index, field_label, field_value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            categoryKey,
            sheetType,
            rowIdx,
            colIdx,
            row[colIdx].label,
            row[colIdx].value,
          ],
        );
      }
    }
  }
}

async function syncMetaToDb(
  categoryKey,
  categoryName,
  sheetName,
  sheetType,
  tableName,
  fieldTypes,
  records,
) {
  await pool.query(
    `INSERT INTO sheet_meta (category_key, category_name, sheet_name, sheet_type, table_name)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), sheet_name = VALUES(sheet_name), table_name = VALUES(table_name)`,
    [categoryKey, categoryName, sheetName, sheetType, tableName],
  );

  await pool.query(
    'DELETE FROM field_meta WHERE category_key = ? AND sheet_type = ?',
    [categoryKey, sheetType],
  );

  const cnFieldNames = Object.keys(fieldTypes);
  let order = 0;
  for (const cnName of cnFieldNames) {
    const enName = cnToEnField(cnName);
    const fType =
      cnName === '品牌' || cnName === '型号' ? 'text' : fieldTypes[cnName];
    await pool.query(
      `INSERT INTO field_meta (category_key, sheet_type, en_name, cn_name, field_type, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryKey, sheetType, enName, cnName, fType, order++],
    );
  }
}

async function syncChartConfigToDb(categoryKey, chartConfigs) {
  await pool.query(
    'DELETE FROM chart_config WHERE category_key = ? AND sheet_type = ?',
    [categoryKey, 'power'],
  );
  for (let si = 0; si < chartConfigs.length; si++) {
    const cc = chartConfigs[si];
    if (cc.fields.length === 0) {
      await pool.query(
        `INSERT INTO chart_config (category_key, sheet_type, scenario, scenario_order, chart_type, unit)
         VALUES (?, 'power', ?, ?, ?, ?)`,
        [categoryKey, cc.scenario, si, cc.chartType, cc.unit || null],
      );
    } else {
      for (let fi = 0; fi < cc.fields.length; fi++) {
        await pool.query(
          `INSERT INTO chart_config (category_key, sheet_type, scenario, scenario_order, chart_type, unit, field_name, field_label, field_order)
           VALUES (?, 'power', ?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryKey,
            cc.scenario,
            si,
            cc.chartType,
            cc.unit || null,
            cc.fields[fi],
            cc.labels[fi],
            fi,
          ],
        );
      }
    }
  }
}

function parseChartConfigFromRows(rows, cnToEnMap) {
  const configs = [];
  for (const row of rows) {
    const scenario = (row['功耗对比场景'] || row['场景'] || '').trim();
    const chartTypeCn = (row['图表类型'] || '柱状图').trim();
    const chartType = CHART_TYPE_MAP[chartTypeCn] || 'bar';
    const unit = (row['单位'] || '').trim();

    const dataFields = [];
    const dataLabels = [];

    for (const [key, val] of Object.entries(row)) {
      if (
        key === '功耗对比场景' ||
        key === '场景' ||
        key === '图表类型' ||
        key === '单位'
      )
        continue;
      if (!val || typeof val !== 'string') continue;
      const trimmedVal = val.trim();
      const enName = cnToEnMap[trimmedVal];
      if (enName) {
        dataFields.push(enName);
        dataLabels.push(trimmedVal);
      }
    }

    if (scenario) {
      configs.push({
        scenario,
        chartType,
        unit,
        fields: dataFields,
        labels: dataLabels,
      });
    }
  }
  return configs;
}

async function importSheetData(
  tableName,
  records,
  fieldTypes,
  imageMap,
  headerRowsData,
) {
  if (records.length === 0) return { success: 0, fail: 0 };

  const cnFieldNames = Object.keys(fieldTypes);
  const enFieldNames = cnFieldNames.map((cn) => cnToEnField(cn));
  const nonKeyEnNames = enFieldNames.filter(
    (en) => en !== 'brand' && en !== 'model',
  );
  const nonKeyCnNames = cnFieldNames.filter(
    (cn) => cnToEnField(cn) !== 'brand' && cnToEnField(cn) !== 'model',
  );

  const insertCols = ['brand', 'model', ...nonKeyEnNames];
  const placeholders = insertCols.map(() => '?').join(', ');

  let headerBrandRow = null;
  let headerModelRow = null;
  if (headerRowsData && headerRowsData.length >= 2) {
    for (const row of headerRowsData) {
      if (row[0]?.label === '品牌' || row[0]?.label?.includes('品牌')) {
        headerBrandRow = row;
      }
      if (row[0]?.label === '型号' || row[0]?.label?.includes('型号')) {
        headerModelRow = row;
      }
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (let ri = 0; ri < records.length; ri++) {
    try {
      const row = records[ri];
      let brand = row['品牌'] || '';
      let model = row['型号'] || '';

      if (!brand && headerBrandRow && ri + 1 < headerBrandRow.length) {
        brand = headerBrandRow[ri + 1]?.value || '';
      }
      if (!model && headerModelRow && ri + 1 < headerModelRow.length) {
        model = headerModelRow[ri + 1]?.value || '';
      }

      const values = [brand, model];
      for (const cnName of nonKeyCnNames) {
        const enName = cnToEnField(cnName);
        const fType = fieldTypes[cnName];
        let val = row[cnName] ?? '';

        if (fType === 'image') {
          const dispimgId = extractDispimgId(String(val));
          if (dispimgId && imageMap[dispimgId]) {
            val = imageMap[dispimgId];
          } else if (String(val).startsWith('=')) {
            val = '';
          }
        } else if (fType === 'number') {
          val = toMeasurement(val);
        } else {
          val = String(val);
          if (val.startsWith('=')) val = '';
        }

        values.push(val);
      }

      await pool.query(
        `INSERT INTO \`${tableName}\` (${insertCols.map((c) => '`' + c + '`').join(', ')}) VALUES (${placeholders})`,
        values,
      );
      successCount++;
    } catch (err) {
      console.error(`导入行失败:`, err.message);
      failCount++;
    }
  }

  return { success: successCount, fail: failCount };
}

app.get('/api/overview', async (_req, res) => {
  try {
    const meta = await getMetaFromDb();
    const categories = [];
    for (const [key, config] of Object.entries(meta)) {
      const counts = {};
      for (const type of ['info', 'power']) {
        if (!config[type]) {
          counts[type] = 0;
          continue;
        }
        const [rows] = await pool.query(
          `SELECT COUNT(*) AS count FROM ${mysql.escapeId(config[type].table)}`,
        );
        counts[type] = Number(rows[0].count);
      }
      categories.push({
        key,
        name: config.name,
        infoCount: counts.info,
        powerCount: counts.power,
      });
    }
    res.json({
      success: true,
      data: {
        categories,
        infoCount: categories.reduce((n, c) => n + c.infoCount, 0),
        powerCount: categories.reduce((n, c) => n + c.powerCount, 0),
      },
    });
  } catch {
    res
      .status(500)
      .json({ success: false, message: '统计数据暂时不可用，请重试。' });
  }
});

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function fieldLabel(config, field) {
  for (const chart of config.power?.chartConfig || []) {
    const index = chart.fields?.indexOf(field);
    if (index >= 0) return chart.labels?.[index] || field;
  }
  return field;
}

async function buildLabSummary() {
  const meta = await getMetaFromDb();
  const categories = [];
  const anomalies = [];
  let totalRecords = 0;
  let totalMissing = 0;
  let totalCells = 0;

  for (const [key, config] of Object.entries(meta)) {
    if (!config.power) continue;
    const [rows] = await pool.query(
      `SELECT * FROM ${mysql.escapeId(config.power.table)} ORDER BY updated_at DESC`,
    );
    const dataFields = (config.power.fields || []).filter(
      (field) => !['id', 'brand', 'model', 'created_at', 'updated_at'].includes(field),
    );
    const duplicateKeys = new Set();
    let duplicateCount = 0;
    for (const row of rows) {
      const identity = `${row.brand || ''}\u0000${row.model || ''}`;
      if (duplicateKeys.has(identity)) duplicateCount++;
      duplicateKeys.add(identity);
    }
    const fieldStats = dataFields.map((field) => {
      const values = rows
        .map((row) => toMeasurement(row[field]))
        .filter((value) => value !== null);
      const missing = rows.length - values.length;
      const center = median(values);
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.25)] : null;
      const q3 = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.75)] : null;
      const iqr = q1 !== null && q3 !== null ? q3 - q1 : 0;
      const low = q1 === null ? null : q1 - iqr * 1.5;
      const high = q3 === null ? null : q3 + iqr * 1.5;
      if (low !== null && high !== null && values.length >= 4) {
        for (const row of rows) {
          const value = toMeasurement(row[field]);
          if (value !== null && (value < low || value > high)) {
            anomalies.push({
              category: key,
              categoryName: config.name,
              recordId: row.id,
              brand: row.brand,
              model: row.model,
              field,
              label: fieldLabel(config, field),
              value,
              median: center,
              deviation: center === 0 || center === null ? null : ((value - center) / center) * 100,
            });
          }
        }
      }
      return { field, label: fieldLabel(config, field), missing, measured: values.length };
    });
    const missing = fieldStats.reduce((sum, item) => sum + item.missing, 0);
    const cells = rows.length * dataFields.length;
    const missingRate = cells ? missing / cells : 0;
    totalRecords += rows.length;
    totalMissing += missing;
    totalCells += cells;
    categories.push({
      key,
      name: config.name,
      records: rows.length,
      fields: dataFields.length,
      missing,
      missingRate,
      duplicateCount,
      qualityScore: Math.max(0, Math.round(100 - missingRate * 100 - (rows.length ? (duplicateCount / rows.length) * 20 : 0))),
      fieldStats,
      datasetVersion: config.power.table,
    });
  }

  let datasets = [];
  try {
    const [rows] = await pool.query(
      'SELECT batch_id, file_name, file_hash, categories, total_records, created_at FROM dataset_manifest ORDER BY created_at DESC LIMIT 12',
    );
    datasets = rows.map((row) => ({
      ...row,
      categories: (() => {
        try { return JSON.parse(row.categories); } catch { return []; }
      })(),
    }));
  } catch (error) {
    console.warn('读取数据批次清单失败:', error.message);
  }

  anomalies.sort((a, b) => Math.abs(b.deviation || 0) - Math.abs(a.deviation || 0));
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      categories: categories.length,
      records: totalRecords,
      missing: totalMissing,
      missingRate: totalCells ? totalMissing / totalCells : 0,
      qualityScore: totalCells ? Math.max(0, Math.round(100 - (totalMissing / totalCells) * 100)) : 100,
      anomalies: anomalies.length,
    },
    categories,
    anomalies: anomalies.slice(0, 20),
    datasets,
  };
}

function formatAnalysisNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toFixed(2)).toString();
}

function powerDescriptors(config) {
  const allowed = new Set(
    (config.power?.fields || []).filter(
      (field) => !['id', 'brand', 'model', 'created_at', 'updated_at'].includes(field),
    ),
  );
  const descriptors = [];
  for (const chart of config.power?.chartConfig || []) {
    const scenario = String(chart.scenario || '').trim();
    if (!scenario || ['line', 'summary', 'null'].includes(scenario.toLowerCase())) continue;
    for (let index = 0; index < (chart.fields || []).length; index++) {
      const field = chart.fields[index];
      if (!allowed.has(field) || descriptors.some((item) => item.field === field && item.scenario === scenario)) continue;
      descriptors.push({
        field,
        label: String(chart.labels?.[index] || field),
        scenario,
        unit: String(chart.unit || '').trim(),
      });
    }
  }
  if (!descriptors.length) {
    for (const field of allowed) descriptors.push({ field, label: field, scenario: '', unit: '' });
  }
  return descriptors;
}

function selectPowerDescriptors(question, config) {
  const query = question.toLowerCase();
  const descriptors = powerDescriptors(config);
  const direct = descriptors.filter((item) =>
    [item.field, item.label, item.scenario]
      .filter(Boolean)
      .some((term) => {
        const normalized = String(term).toLowerCase();
        return normalized.length > 2 && !['功耗', 'power'].includes(normalized) && query.includes(normalized);
      }),
  );
  if (direct.length) return { descriptors: direct, title: [...new Set(direct.map((item) => item.label))].join('、'), specific: true };

  const aliases = [
    { pattern: /待机|standby|idle/, test: /待机|standby|idle/ },
    { pattern: /视频|video/, test: /视频|video/ },
    { pattern: /游戏|game/, test: /游戏|game/ },
    { pattern: /浏览|网页|browser/, test: /浏览|网页|browser/ },
    { pattern: /睡眠|sleep/, test: /睡眠|sleep/ },
    { pattern: /休眠|dormancy|hibernate/, test: /休眠|dormancy|hibernate/ },
    { pattern: /使用|usage|active/, test: /使用|usage|active/ },
  ];
  for (const alias of aliases) {
    if (!alias.pattern.test(query)) continue;
    const matched = descriptors.filter((item) =>
      alias.test.test(`${item.field} ${item.label} ${item.scenario}`),
    );
    if (matched.length) return { descriptors: matched, title: [...new Set(matched.map((item) => item.label))].join('、'), specific: true };
    return { descriptors: [], title: '', specific: true };
  }
  return { descriptors, title: '全部有效功耗场景', specific: false };
}

async function buildPowerRanking(question) {
  const meta = await getMetaFromDb();
  const categoryEntries = Object.entries(meta).filter(([, config]) => config.power);
  const requestedCategory = categoryEntries.find(([key, config]) =>
    question.includes(key) || question.includes(config.name),
  );
  const entries = requestedCategory ? [requestedCategory] : categoryEntries;
  const high = /更高|最高|最大|耗电最多|最耗电|高耗/.test(question);
  const low = /最好|最低|最省|省电|低耗|最小/.test(question);
  const direction = high && !low ? 'highest' : 'lowest';
  const categoryResults = [];
  for (const [key, config] of entries) {
    const selected = selectPowerDescriptors(question, config);
    if (!selected.descriptors.length) continue;
    const [rows] = await pool.query(
      `SELECT * FROM ${mysql.escapeId(config.power.table)} ORDER BY brand, model`,
    );
    const groups = selected.specific
      ? [selected.descriptors]
      : (() => {
          const grouped = new Map();
          for (const item of selected.descriptors) {
            const key = item.unit || '未标注单位';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(item);
          }
          return [...grouped.values()];
        })();
    for (const descriptorGroup of groups) {
      const groupTitle = selected.specific
        ? selected.title
        : `${selected.title}${descriptorGroup[0]?.unit ? `（${descriptorGroup[0].unit}）` : '（未标注单位）'}`;
      const ranked = rows
        .map((row) => {
          const measurements = descriptorGroup
          .map((item) => ({ item, value: toMeasurement(row[item.field]) }))
          .filter(({ value }) => value !== null);
        if (!measurements.length) return null;
        const total = measurements.reduce((sum, entry) => sum + entry.value, 0);
        return {
          recordId: row.id,
          brand: row.brand,
          model: row.model,
          average: total / measurements.length,
          total,
          measured: measurements.length,
          missing: descriptorGroup.length - measurements.length,
          values: measurements.map(({ item, value }) => ({ field: item.field, label: item.label, value })),
        };
        })
        .filter(Boolean)
        .sort((a, b) => direction === 'highest' ? b.average - a.average : a.average - b.average);
      if (ranked.length) categoryResults.push({
        key,
        name: config.name,
        title: groupTitle,
        comprehensive: !selected.specific && groups.length === 1,
        unitWarning: !selected.specific && groups.length > 1,
        ranked,
      });
    }
  }
  return { direction, categoryResults };
}

function normalizeModelText(content) {
  if (Array.isArray(content)) {
    content = content
      .map((item) => (typeof item === 'string' ? item : item?.text || item?.content || ''))
      .join('');
  }
  return String(content || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\|begin_of_box\|>|<\|end_of_box\|>/g, '')
    .trim();
}

async function askGlm(question, draft, citations, summary) {
  if (!GLM_API_KEY) return null;
  const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GLM_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(GLM_TIMEOUT_MS),
    body: JSON.stringify({
      model: GLM_MODEL,
      stream: false,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '你是 TechCompare 功耗实验室的分析助手。只能依据用户问题和服务端确定性分析草稿回答，不得改写数值、排序、单位、缺测含义或凭空添加设备。不同单位不能合并；数值越低表示功耗越低。用简洁中文回答，先给结论，再用一句话说明计算口径。不要声称自己访问了数据库或执行了操作，不要输出 Markdown 表格。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            question,
            deterministicDraft: draft,
            citations,
            dataOverview: summary.totals,
          }),
        },
      ],
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`GLM 请求失败（${response.status}）：${payload?.error?.message || payload?.message || '未知错误'}`);
  }
  const text = normalizeModelText(payload?.choices?.[0]?.message?.content);
  if (!text) throw new Error('GLM 返回了空回答。');
  return text;
}

app.get('/api/lab/summary', async (_req, res) => {
  try {
    res.json({ success: true, data: await buildLabSummary() });
  } catch (error) {
    console.error('生成实验工作台摘要失败:', error);
    res.status(500).json({ success: false, message: '实验工作台数据暂时不可用，请重试。' });
  }
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question || question.length > 500)
      return res.status(400).json({ success: false, message: '请输入 1 到 500 个字符的问题。' });
    const summary = await buildLabSummary();
    const citations = [];
    let answer;
    if (/综合功耗|场景|功耗.*(高|低|好|差|省)|谁.*功耗|最省电|最耗电/.test(question)) {
      const ranking = await buildPowerRanking(question);
      const label = ranking.direction === 'highest' ? '功耗最高' : '功耗最低、最省电';
      if (!ranking.categoryResults.length) {
        answer = '当前授权数据中没有找到可比较的有效功耗值。请确认已选择正确品类，并检查该场景是否存在有效测量。';
      } else {
        const blocks = ranking.categoryResults.map((category) => {
          const first = category.ranked[0];
          const second = category.ranked[1];
          const values = category.ranked.slice(0, 5).map((item, index) =>
            `${index + 1}. ${item.brand} ${item.model}（${formatAnalysisNumber(item.average)}，有效 ${item.measured}/${item.measured + item.missing} 项）`,
          ).join('；');
          citations.push(
            ...category.ranked.slice(0, 3).map((item) => ({
              category: category.key,
              recordId: item.recordId,
              field: category.title,
              value: item.average,
            })),
          );
          return `${category.name} · ${category.title}：${label}是 ${first.brand} ${first.model}（${formatAnalysisNumber(first.average)}）；${second ? `另一端为 ${second.brand} ${second.model}（${formatAnalysisNumber(second.average)}）` : '当前只有一条可比较记录'}。排序：${values}`;
        });
        const hasUnitConflict = ranking.categoryResults.some((item) => item.unitWarning);
        const introduction = hasUnitConflict
          ? '当前数据包含不同单位，不能直接合并成一个综合值，以下按单位分别排名；缺测不参与平均。'
          : ranking.categoryResults.some((item) => item.comprehensive)
            ? '综合功耗按同一单位下所有有效场景的平均值计算，缺测不参与平均；不同品类分开比较。'
            : `本次按“${ranking.categoryResults[0].title}”比较，数值越低表示越省电。`;
        answer = `${introduction} ${blocks.join(' ')}${ranking.direction === 'highest' ? ' 你问的是功耗更高，因此排序从高到低。' : ' 你问的是功耗最好，因此排序从低到高。'}`;
      }
    } else if (/异常|离群|超限|波动/.test(question)) {
      const items = summary.anomalies.slice(0, 5);
      answer = items.length
        ? `当前授权数据中发现 ${summary.totals.anomalies} 个统计异常。优先关注：${items.map((item) => `${item.categoryName} / ${item.brand} ${item.model} 的 ${item.label} 为 ${item.value}${item.deviation === null ? '' : `，相对中位数 ${item.deviation > 0 ? '+' : ''}${item.deviation.toFixed(1)}%`}`).join('；')}。建议先核对对应测试批次和测试条件。`
        : '当前数据暂未发现满足统计规则的明显异常；样本较少的场景不会被强行判定为异常。';
      citations.push(...items.map((item) => ({ category: item.category, recordId: item.recordId, field: item.field, value: item.value })));
    } else if (/缺测|完整|质量|数据/.test(question)) {
      const lowest = [...summary.categories].sort((a, b) => a.qualityScore - b.qualityScore).slice(0, 3);
      answer = `当前数据质量评分为 ${summary.totals.qualityScore} 分，缺测单元格 ${summary.totals.missing} 个。质量优先关注：${lowest.length ? lowest.map((item) => `${item.name} ${item.qualityScore} 分（缺测 ${item.missing}）`).join('；') : '暂无功耗数据'}。“/”和空值会按未测量处理，不会当作 0。`;
    } else if (/批次|导入|最近|版本/.test(question)) {
      const latest = summary.datasets[0];
      answer = latest
        ? `最近数据批次为 ${latest.file_name}，包含 ${latest.total_records} 条记录，导入时间为 ${new Date(latest.created_at).toLocaleString('zh-CN')}。当前分析版本仍由服务端数据版本保护，旧方案不会静默套用到新数据。`
        : '当前还没有记录导入批次；管理员完成一次数据导入后，这里会显示文件、批次和记录数。';
    } else {
      answer = `我可以基于当前账号有权限的数据回答“综合功耗排名”“按场景找最省电设备”“异常”“缺测”“质量”“批次”和“版本”问题。目前共有 ${summary.totals.categories} 个品类、${summary.totals.records} 条功耗记录，整体数据质量 ${summary.totals.qualityScore} 分。示例：“旗舰手机综合功耗谁更高？”、“按待机功耗谁最好？”`;
    }
    let mode = 'local-readonly-analysis';
    if (GLM_API_KEY) {
      try {
        const modelAnswer = await askGlm(question, answer, citations, summary);
        if (modelAnswer) {
          answer = modelAnswer;
          mode = GLM_MODEL;
        }
      } catch (error) {
        console.warn('GLM 分析失败，回退到本地确定性回答:', error.message);
      }
    }
    res.json({ success: true, data: { answer, citations, generatedAt: summary.generatedAt, mode } });
  } catch (error) {
    console.error('AI 分析助手失败:', error);
    res.status(500).json({ success: false, message: '分析助手暂时不可用，请重试。' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const categories = Object.entries(meta).map(([key, config]) => ({
      key,
      name: config.name,
      info: config.info || null,
      power: config.power || null,
    }));
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('查询类别失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/categories/:category/chart-config', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const config = meta[req.params.category];
    if (!config || !config.power) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    res.json({ success: true, data: config.power.chartConfig || [] });
  } catch (error) {
    console.error('查询图表配置失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/:category/info', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const config = meta[req.params.category];
    if (!config || !config.info) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    const [rows] = await pool.query(
      `SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('查询产品信息失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/:category/power', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const config = meta[req.params.category];
    if (!config || !config.power) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    const [rows] = await pool.query(
      `SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`,
    );
    res.json({
      success: true,
      data: rows,
      headerRows: config.power.headerRows || [],
      datasetVersion: config.power.table,
    });
  } catch (error) {
    console.error('查询功耗数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/all-data', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const result = {};
    for (const [key, config] of Object.entries(meta)) {
      let infoRows = [];
      let powerRows = [];
      if (config.info) {
        [infoRows] = await pool.query(
          `SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`,
        );
      }
      if (config.power) {
        [powerRows] = await pool.query(
          `SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`,
        );
      }
      result[key] = {
        name: config.name,
        info: config.info
          ? {
              table: config.info.table,
              displayColumns: config.info.displayColumns,
              data: infoRows,
            }
          : { table: '', displayColumns: [], data: [] },
        power: config.power
          ? {
              table: config.power.table,
              displayColumns: config.power.displayColumns,
              chartConfig: config.power.chartConfig,
              data: powerRows,
              headerRows: config.power.headerRows || [],
            }
          : {
              table: '',
              displayColumns: [],
              chartConfig: [],
              data: [],
              headerRows: [],
            },
      };
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('查询所有数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/brands', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const firstInfo = Object.values(meta).find((m) => m.info);
    if (!firstInfo) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(
      `SELECT DISTINCT brand FROM \`${firstInfo.info.table}\` ORDER BY brand`,
    );
    res.json({ success: true, data: rows.map((r) => r.brand) });
  } catch (error) {
    console.error('查询品牌失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/models/:brand', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const firstInfo = Object.values(meta).find((m) => m.info);
    if (!firstInfo) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(
      `SELECT DISTINCT model FROM \`${firstInfo.info.table}\` WHERE brand = ? ORDER BY model`,
      [req.params.brand],
    );
    res.json({ success: true, data: rows.map((r) => r.model) });
  } catch (error) {
    console.error('查询型号失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/template/download-all', (req, res) => {
  const templatePath = path.join(__dirname, '..', 'public', 'gh.xlsx');
  if (fs.existsSync(templatePath)) {
    const buffer = fs.readFileSync(templatePath);
    res.setHeader('Content-Disposition', 'attachment; filename=gh.xlsx');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
    return;
  }
  res.status(404).json({ success: false, message: '模板文件不存在' });
});

app.get('/api/:category', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const config = meta[req.params.category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    let infoRows = [];
    let powerRows = [];
    if (config.info) {
      [infoRows] = await pool.query(
        `SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`,
      );
    }
    if (config.power) {
      [powerRows] = await pool.query(
        `SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`,
      );
    }
    const merged = infoRows.map((info) => {
      const power =
        powerRows.find(
          (p) => p.brand === info.brand && p.model === info.model,
        ) || {};
      return { ...info, ...power, id: info.id };
    });
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('查询数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(
      null,
      ['.xlsx', '.xls'].includes(path.extname(file.originalname).toLowerCase()),
    ),
});
const importPreviews = new Map();
let importRunning = false;

function prepareWorkbook(filename) {
  const workbook = xlsx.readFile(filename, { cellStyles: true });
  const sheets = [];
  const warnings = [];
  const keys = new Set();
  for (const name of workbook.SheetNames) {
    const parsed = parseSheetType(name);
    if (parsed.type === 'config') continue;
    const key = categoryNameToKey(parsed.categoryName);
    if (!key || key.length > 40 || !/^[\p{L}\p{N}_]+$/u.test(key))
      throw new Error(`工作表「${name}」的品类名称不合法。`);
    const identity = `${key}:${parsed.type}`;
    if (keys.has(identity)) throw new Error(`同一品类的数据类型重复：${name}`);
    keys.add(identity);
    const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
    });
    const records = parseTransposedSheet(rawRows);
    if (!records.length)
      throw new Error(`工作表「${name}」没有数据，未执行覆盖。`);
    const fieldTypes = mergeFieldTypesWithAllNames(
      detectFieldTypes(records, parsed.type),
      extractAllFieldNames(rawRows),
    );
    const fields = Object.entries(fieldTypes).map(
      ([cn_name, field_type], display_order) => ({
        cn_name,
        field_type,
        display_order,
        en_name: cnToEnField(cn_name),
      }),
    );
    const fieldNames = new Set();
    for (const field of fields) {
      if (
        !/^[\p{L}\p{N}_]+$/u.test(field.en_name) ||
        field.en_name.length > 64 ||
        fieldNames.has(field.en_name)
      )
        throw new Error(`工作表「${name}」存在重复或无效字段。`);
      fieldNames.add(field.en_name);
    }
    const seen = new Set();
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const brand = String(row['品牌'] || '').trim(),
        model = String(row['型号'] || '').trim();
      if (!brand || !model)
        throw new Error(`工作表「${name}」第 ${i + 2} 列缺少品牌或型号。`);
      if (brand.length > 100 || model.length > 100)
        throw new Error(`工作表「${name}」第 ${i + 2} 列的品牌或型号过长。`);
      const sampleKey = JSON.stringify([brand, model]);
      if (seen.has(sampleKey))
        warnings.push(
          `工作表「${name}」包含同名记录：${brand} ${model}；将保留全部记录。`,
        );
      seen.add(sampleKey);
      for (const field of fields) {
        if (field.field_type !== 'number') continue;
        const value = row[field.cn_name];
        if (
          value == null ||
          ['', '/', '／', '-', '—', 'NA', 'N/A'].includes(
            String(value).trim().toUpperCase(),
          )
        )
          continue;
        if (toMeasurement(value) === null)
          throw new Error(
            `工作表「${name}」第 ${i + 2} 列「${field.cn_name}」不是有效数值；未测量或不适用时可填写 / 或留空。`,
          );
      }
    }
    sheets.push({
      name,
      key,
      category: parsed.categoryName,
      type: parsed.type,
      records,
      fieldTypes,
      fields,
      headers: extractHeaderRows(rawRows, 3),
    });
  }
  if (!sheets.length)
    throw new Error('没有找到以「产品信息」或「功耗数据」结尾的工作表。');
  return { workbook, sheets, warnings };
}
function fileHash(filename) {
  return createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}
function discardUpload(req) {
  if (req.file) fs.rmSync(req.file.path, { force: true });
}

app.post('/api/import-preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: '请选择 .xlsx 或 .xls 文件。' });
    const prepared = prepareWorkbook(req.file.path);
    const token = randomBytes(24).toString('hex');
    for (const [key, value] of importPreviews)
      if (value.expires < Date.now()) importPreviews.delete(key);
    importPreviews.set(token, {
      hash: fileHash(req.file.path),
      session: req.sessionToken,
      expires: Date.now() + 600000,
    });
    res.json({
      success: true,
      data: {
        token,
        sheets: prepared.sheets.map((s) => ({
          name: s.name,
          category: s.category,
          type: s.type,
          rows: s.records.length,
        })),
        message: [
          '校验通过。仅更新列出的数据表，未包含的品类与数据类型保持原样。',
          ...prepared.warnings,
        ].join(' '),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  } finally {
    discardUpload(req);
  }
});

app.post('/api/import-all', upload.single('file'), async (req, res) => {
  let connection;
  let ownsLock = false;
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: '请选择导入文件。' });
    const preview = importPreviews.get(req.body.previewToken);
    if (
      !preview ||
      preview.expires < Date.now() ||
      preview.session !== req.sessionToken ||
      preview.hash !== fileHash(req.file.path)
    ) {
      return res.status(409).json({
        success: false,
        message: '预览已失效或文件已变化，请重新校验。',
      });
    }
    if (importRunning)
      return res
        .status(409)
        .json({ success: false, message: '另一份数据正在导入，请稍后重试。' });
    importRunning = true;
    ownsLock = true;
    const { workbook, sheets } = prepareWorkbook(req.file.path);
    const batch = randomBytes(5).toString('hex');
    const categoryKeys = [...new Set(sheets.map((s) => s.key))];
    const snapshot = {
      database: dbConfig.database,
      categories: categoryKeys,
      createdAt: new Date().toISOString(),
      metadata: {},
    };
    for (const table of [
      'sheet_meta',
      'field_meta',
      'chart_config',
      'header_rows',
      'image_mapping',
    ]) {
      const [rows] = await pool.query(
        `SELECT * FROM ${mysql.escapeId(table)} WHERE category_key IN (?)`,
        [categoryKeys],
      );
      snapshot.metadata[table] = rows;
    }
    const backupDir = path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupName = `import-${batch}.json`;
    fs.writeFileSync(
      path.join(backupDir, backupName),
      JSON.stringify(snapshot, null, 2),
    );
    const imageMap = extractImagesFromXlsx(req.file.path);

    // All DDL and row validation happens on NEW tables. Active tables remain available.
    let totalSuccess = 0;
    for (const sheet of sheets) {
      sheet.table = `stg_${sheet.key}_${sheet.type}_${batch}`;
      await createTable(sheet.table, sheet.fields);
      const result = await importSheetData(
        sheet.table,
        sheet.records,
        sheet.fieldTypes,
        imageMap,
        sheet.headers,
      );
      if (result.fail)
        throw new Error(`工作表「${sheet.name}」写入失败，当前数据未切换。`);
      totalSuccess += result.success;
    }

    connection = await rawPool.getConnection();
    await connection.beginTransaction();
    await transactionContext.run(connection, async () => {
      for (const sheet of sheets) {
        await syncMetaToDb(
          sheet.key,
          sheet.category,
          sheet.name,
          sheet.type,
          sheet.table,
          sheet.fieldTypes,
          sheet.records,
        );
        await syncHeaderRowsToDb(sheet.key, sheet.type, sheet.headers);
        await syncImageMapToDb(sheet.key, imageMap);
        if (sheet.type === 'power')
          await pool.query(
            'DELETE FROM chart_config WHERE category_key = ? AND sheet_type = ?',
            [sheet.key, 'power'],
          );
      }
      for (const name of workbook.SheetNames) {
        const parsed = parseSheetType(name);
        if (parsed.type !== 'config') continue;
        const key = categoryNameToKey(parsed.categoryName);
        if (!categoryKeys.includes(key)) continue;
        const [fields] = await pool.query(
          'SELECT en_name,cn_name FROM field_meta WHERE category_key = ? AND sheet_type = ?',
          [key, 'power'],
        );
        const map = Object.fromEntries(
          fields.map((f) => [f.cn_name, f.en_name]),
        );
        const configs = parseChartConfigFromRows(
          xlsx.utils.sheet_to_json(workbook.Sheets[name]),
          map,
        );
        await syncChartConfigToDb(key, configs);
      }
    });
    await connection.commit();
    try {
      await pool.query(
        `INSERT INTO dataset_manifest (batch_id, file_name, file_hash, categories, total_records)
         VALUES (?, ?, ?, ?, ?)`,
        [
          batch,
          req.file.originalname || '未命名导入文件',
          preview.hash,
          JSON.stringify(categoryKeys),
          totalSuccess,
        ],
      );
    } catch (manifestError) {
      console.warn('保存数据批次清单失败:', manifestError.message);
    }
    importPreviews.delete(req.body.previewToken);
    res.json({
      success: true,
      totalSuccess,
      totalFail: 0,
      message: `已更新 ${sheets.length} 个数据表、${totalSuccess} 条记录。旧数据版本已保留，恢复记录：${backupName}`,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({
      success: false,
      message: error.message || '导入失败，当前数据未切换。',
    });
  } finally {
    connection?.release();
    if (ownsLock) importRunning = false;
    discardUpload(req);
  }
});

const imageUpload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.post(
  '/api/:category/info/:id/image',
  imageUpload.single('image'),
  async (req, res) => {
    try {
      const { category, id } = req.params;
      if (!req.file)
        return res.status(400).json({ success: false, message: '请上传图片' });

      const meta = await getMetaFromDb();
      const config = meta[category];
      if (!config || !config.info)
        return res.status(404).json({ success: false, message: '类别不存在' });

      const ext = path.extname(req.file.originalname) || '.jpeg';
      const newFilename = `${category}_${id}_${Date.now()}${ext}`;
      const newPath = path.join(imagesDir, newFilename);
      fs.renameSync(req.file.path, newPath);

      const imagePath = `/uploads/images/${newFilename}`;
      const imageField = config.info.fields.find(
        (f) =>
          f !== 'brand' &&
          f !== 'model' &&
          config.info.displayColumns.find(
            (c) => c.key === f && c.type === 'image',
          ),
      );

      if (imageField) {
        await pool.query(
          `UPDATE \`${config.info.table}\` SET \`${imageField}\` = ? WHERE id = ?`,
          [imagePath, id],
        );
      } else {
        await pool.query(
          `UPDATE \`${config.info.table}\` SET image = ? WHERE id = ?`,
          [imagePath, id],
        );
      }

      res.json({
        success: true,
        data: { image: imagePath },
        message: '图片上传成功',
      });
    } catch (error) {
      console.error('上传图片失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

app.put('/api/:category/info/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.info)
      return res.status(404).json({ success: false, message: '类别不存在' });

    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.info.fields) {
      if (
        field !== 'brand' &&
        field !== 'model' &&
        updates[field] !== undefined
      ) {
        setClauses.push(`\`${field}\` = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0)
      return res.json({ success: true, message: '无更新' });
    values.push(id);
    await pool.query(
      `UPDATE \`${config.info.table}\` SET ${setClauses.join(', ')} WHERE id = ?`,
      values,
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新产品信息失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/:category/info/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.info)
      return res.status(404).json({ success: false, message: '类别不存在' });

    const [rows] = await pool.query(
      `SELECT * FROM \`${config.info.table}\` WHERE id = ?`,
      [id],
    );
    await pool.query(`DELETE FROM \`${config.info.table}\` WHERE id = ?`, [id]);

    const imageCols = config.info.displayColumns.filter(
      (c) => c.type === 'image',
    );
    for (const col of imageCols) {
      if (rows.length > 0 && rows[0][col.key]) {
        const imgPath = path.join(__dirname, rows[0][col.key]);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除产品信息失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/:category/power/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.power)
      return res.status(404).json({ success: false, message: '类别不存在' });

    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.power.fields) {
      if (
        field !== 'brand' &&
        field !== 'model' &&
        updates[field] !== undefined
      ) {
        setClauses.push(`\`${field}\` = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0)
      return res.json({ success: true, message: '无更新' });
    values.push(id);
    await pool.query(
      `UPDATE \`${config.power.table}\` SET ${setClauses.join(', ')} WHERE id = ?`,
      values,
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新功耗数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/:category/power/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.power)
      return res.status(404).json({ success: false, message: '类别不存在' });

    await pool.query(`DELETE FROM \`${config.power.table}\` WHERE id = ?`, [
      id,
    ]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除功耗数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

async function loadFromTemplateOnFirstRun() {
  const [sheets] = await pool.query('SELECT COUNT(*) as cnt FROM sheet_meta');
  if (sheets[0].cnt > 0) return;

  const templatePath = path.join(__dirname, '..', 'public', 'gh.xlsx');
  if (!fs.existsSync(templatePath)) return;

  console.log('首次运行，从模板加载数据...');
  const imageMap = extractImagesFromXlsx(templatePath);
  const workbook = xlsx.readFile(templatePath);

  for (const sheetName of workbook.SheetNames) {
    const parsed = parseSheetType(sheetName);
    if (parsed.type === 'config') continue;

    const categoryKey = categoryNameToKey(parsed.categoryName);
    await syncImageMapToDb(categoryKey, imageMap);

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    });
    const records = parseTransposedSheet(rawRows);
    if (records.length === 0) continue;

    const allFieldNames = extractAllFieldNames(rawRows);
    let fieldTypes = detectFieldTypes(records, parsed.type);
    fieldTypes = mergeFieldTypesWithAllNames(fieldTypes, allFieldNames);
    const tableName = `${categoryKey}_${parsed.type}`;
    const fieldDefs = Object.entries(fieldTypes).map(
      ([cnName, fType], idx) => ({
        en_name: cnToEnField(cnName),
        cn_name: cnName,
        field_type: fType,
        display_order: idx,
      }),
    );

    await createTable(tableName, fieldDefs);
    await syncMetaToDb(
      categoryKey,
      parsed.categoryName,
      sheetName,
      parsed.type,
      tableName,
      fieldTypes,
      records,
    );

    const headerRows = extractHeaderRows(rawRows, 3);
    await syncHeaderRowsToDb(categoryKey, parsed.type, headerRows);

    const dbImageMap = await getImageMapFromDb(categoryKey);
    const mergedImageMap = { ...imageMap, ...dbImageMap };
    await importSheetData(
      tableName,
      records,
      fieldTypes,
      mergedImageMap,
      headerRows,
    );
    console.log(`已从模板加载 ${parsed.categoryName} ${parsed.type} 数据`);
  }

  for (const sheetName of workbook.SheetNames) {
    const parsed = parseSheetType(sheetName);
    if (parsed.type !== 'config') continue;

    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);
    if (rows.length === 0) continue;

    const categoryKey = categoryNameToKey(parsed.categoryName);
    const [powerFields] = await pool.query(
      'SELECT en_name, cn_name FROM field_meta WHERE category_key = ? AND sheet_type = ?',
      [categoryKey, 'power'],
    );
    const cnToEnMap = {};
    for (const f of powerFields) cnToEnMap[f.cn_name] = f.en_name;

    const chartConfigs = parseChartConfigFromRows(rows, cnToEnMap);
    if (chartConfigs.length > 0) {
      await syncChartConfigToDb(categoryKey, chartConfigs);
      console.log(`已从模板加载 ${categoryKey} 的图表配置`);
    }
  }
}

async function startServer() {
  try {
    await initDatabase();
    await planStore.init();
    await loadFromTemplateOnFirstRun();
    app.listen(PORT, HOST, () => {
      console.log(`数据库服务已启动: http://${HOST}:${PORT}`);
      console.log('独立数据库:', dbConfig.database);
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

startServer();
