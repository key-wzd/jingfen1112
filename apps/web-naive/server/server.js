import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'w20010820.',
  database: 'phone_compare',
  waitForConnections: true,
  connectionLimit: 10,
};

const pool = mysql.createPool(dbConfig);

const CHART_TYPE_MAP = {
  '折线图': 'line',
  '柱状图': 'bar',
  '纵向柱状图': 'bar',
  '横向柱状图': 'barH',
  '饼图': 'pie',
  '雷达图': 'radar',
};

const FIXED_COLUMNS = ['id', 'brand', 'model', 'created_at', 'updated_at'];
const CN_TO_EN_RESERVED = { '品牌': 'brand', '型号': 'model' };

function cnToEnField(cnName) {
  if (CN_TO_EN_RESERVED[cnName]) return CN_TO_EN_RESERVED[cnName];
  const pinyinMap = {
    '图片': 'image', '屏幕': 'screen', '处理器': 'processor', '内存': 'ram',
    '存储': 'storage', '摄像头': 'camera', '电池': 'battery', '价格': 'price',
    '电池容量': 'battery_capacity', '视频播放功耗': 'video_power', '游戏功耗': 'game_power',
    '待机功耗': 'standby_power', '浏览网页功耗': 'browser_power', '睡眠功耗': 'sleep_power',
    '休眠功耗': 'dormancy_power', '使用功耗': 'usage_power', '功耗对比场景': 'power_scenario',
    '图表类型': 'chart_type', '单位': 'unit',
  };
  if (pinyinMap[cnName]) return pinyinMap[cnName];
  return cnName
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || `field_${cnName.charCodeAt(0)}`;
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
    return { type: 'info', categoryName: trimmed.replace(/产品信息$/, '').trim() };
  }
  if (trimmed.endsWith('功耗数据')) {
    return { type: 'power', categoryName: trimmed.replace(/功耗数据$/, '').trim() };
  }
  return { type: 'config', categoryName: trimmed };
}

function categoryNameToKey(name) {
  const map = {
    '旗舰手机': 'phones', '中低端手机': 'mid_low_phones',
    '鼠标': 'mice', '键盘': 'keyboards', '遥控器': 'remote_controls',
  };
  if (map[name]) return map[name];
  return name
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'cat_' + Date.now();
}

function parseTransposedSheet(rows) {
  if (!rows || rows.length === 0) return [];
  const maxCols = Math.max(...rows.map(row => (row && row.length) || 0));
  const records = [];
  for (let col = 1; col < maxCols; col++) {
    const record = {};
    let hasData = false;
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      if (!row || !row[0]) continue;
      const fieldName = String(row[0]).trim();
      if (!fieldName) continue;
      const value = col < row.length ? row[col] : '';
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        record[fieldName] = value;
        hasData = true;
      } else {
        if (!(fieldName in record)) {
          record[fieldName] = '';
        }
      }
    }
    if (hasData && (record['品牌'] || record['型号'])) {
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
        const filename = `${name}${ext}`;
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
      [categoryKey, dispimgId, imagePath]
    );
  }
}

async function getImageMapFromDb(categoryKey) {
  const [rows] = await pool.query(
    'SELECT dispimg_id, image_path FROM image_mapping WHERE category_key = ?',
    [categoryKey]
  );
  const map = {};
  for (const row of rows) {
    map[row.dispimg_id] = row.image_path;
  }
  return map;
}

async function getMetaFromDb() {
  const [sheets] = await pool.query('SELECT * FROM sheet_meta ORDER BY category_key, sheet_type');
  const [fields] = await pool.query('SELECT * FROM field_meta ORDER BY category_key, sheet_type, display_order');
  const [charts] = await pool.query('SELECT * FROM chart_config ORDER BY category_key, scenario_order');
  const [headerRowsDb] = await pool.query('SELECT * FROM header_rows ORDER BY category_key, row_index, col_index');

  const result = {};
  for (const s of sheets) {
    if (!result[s.category_key]) {
      result[s.category_key] = { name: s.category_name, info: null, power: null };
    }
    const sheetFields = fields
      .filter(f => f.category_key === s.category_key && f.sheet_type === s.sheet_type)
      .map(f => ({
        en_name: f.en_name,
        cn_name: f.cn_name,
        field_type: f.field_type,
        display_order: f.display_order,
      }));

    const sheetCharts = charts
      .filter(c => c.category_key === s.category_key && c.sheet_type === s.sheet_type)
      .reduce((acc, c) => {
        let existing = acc.find(a => a.scenario === c.scenario);
        if (!existing) {
          existing = { scenario: c.scenario, chartType: c.chart_type, fields: [], labels: [] };
          acc.push(existing);
        }
        existing.fields.push(c.field_name);
        existing.labels.push(c.field_label);
        return acc;
      }, []);

    const displayColumns = sheetFields
      .filter(f => f.en_name !== 'brand' && f.en_name !== 'model')
      .map(f => {
        const col = { key: f.en_name, label: f.cn_name };
        if (f.field_type === 'image') col.type = 'image';
        return col;
      });

    const sheetHeaderRows = headerRowsDb
      .filter(h => h.category_key === s.category_key && h.sheet_type === s.sheet_type)
      .reduce((acc, h) => {
        if (!acc[h.row_index]) acc[h.row_index] = [];
        acc[h.row_index].push({ label: h.field_label, value: h.field_value });
        return acc;
      }, []);

    result[s.category_key][s.sheet_type] = {
      table: s.table_name,
      fields: ['brand', 'model', ...sheetFields.filter(f => f.en_name !== 'brand' && f.en_name !== 'model').map(f => f.en_name)],
      cnFields: ['品牌', '型号', ...sheetFields.filter(f => f.en_name !== 'brand' && f.en_name !== 'model').map(f => f.cn_name)],
      displayColumns,
      chartConfig: sheetCharts,
      headerRows: Object.values(sheetHeaderRows),
    };
  }
  return result;
}

async function createTable(tableName, fieldDefs) {
  const nonFixedFields = fieldDefs.filter(f => !FIXED_COLUMNS.includes(f.en_name));
  const columnDefs = nonFixedFields.map(f => {
    if (f.en_name === 'brand' || f.en_name === 'model') {
      return `\`${f.en_name}\` VARCHAR(100) NOT NULL COMMENT '${f.cn_name}'`;
    }
    if (f.field_type === 'number') {
      return `\`${f.en_name}\` FLOAT DEFAULT 0 COMMENT '${f.cn_name}'`;
    }
    if (f.field_type === 'image') {
      return `\`${f.en_name}\` TEXT COMMENT '${f.cn_name}'`;
    }
    return `\`${f.en_name}\` TEXT COMMENT '${f.cn_name}'`;
  });

  const allColumns = [
    'id INT AUTO_INCREMENT PRIMARY KEY',
    `\`brand\` VARCHAR(100) NOT NULL COMMENT '品牌'`,
    `\`model\` VARCHAR(100) NOT NULL COMMENT '型号'`,
    ...columnDefs.filter(c => !c.startsWith('`brand`') && !c.startsWith('`model`')),
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    'UNIQUE KEY unique_brand_model (brand, model)',
  ];

  await pool.query(
    `CREATE TABLE \`${tableName}\` (${allColumns.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC`
  );
}

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host, port: dbConfig.port,
    user: dbConfig.user, password: dbConfig.password,
  });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
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
      field_name VARCHAR(100) NOT NULL,
      field_label VARCHAR(100) NOT NULL,
      field_order INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

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

  conn.release();
  console.log('数据库初始化完成（含元数据表、图片映射表、表头行表）');
}

function detectFieldTypes(records) {
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

    let hasImage = false;
    let allNumeric = true;
    let hasValue = false;

    for (const record of records) {
      const val = record[field];
      if (val === undefined || val === null || String(val).trim() === '') continue;
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

function extractHeaderRows(rawRows, maxRows = 3) {
  const headerRows = [];
  const maxCols = Math.max(...rawRows.map(row => (row && row.length) || 0));
  const rowCount = Math.min(rawRows.length, maxRows);
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const row = rawRows[rowIdx];
    if (!row) continue;
    const rowData = [];
    for (let colIdx = 0; colIdx < maxCols; colIdx++) {
      const label = colIdx === 0 ? (row[0] ? String(row[0]).trim() : '') : '';
      const value = colIdx > 0 && colIdx < row.length ? (row[colIdx] != null ? String(row[colIdx]).trim() : '') : '';
      rowData.push({ label, value });
    }
    if (rowData.some(d => d.label || d.value)) {
      headerRows.push(rowData);
    }
  }
  return headerRows;
}

async function syncHeaderRowsToDb(categoryKey, sheetType, headerRows) {
  await pool.query(
    'DELETE FROM header_rows WHERE category_key = ? AND sheet_type = ?',
    [categoryKey, sheetType]
  );
  for (let rowIdx = 0; rowIdx < headerRows.length; rowIdx++) {
    const row = headerRows[rowIdx];
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      if (row[colIdx].label || row[colIdx].value) {
        await pool.query(
          `INSERT INTO header_rows (category_key, sheet_type, row_index, col_index, field_label, field_value)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [categoryKey, sheetType, rowIdx, colIdx, row[colIdx].label, row[colIdx].value]
        );
      }
    }
  }
}

async function syncMetaToDb(categoryKey, categoryName, sheetName, sheetType, tableName, fieldTypes, records) {
  await pool.query(
    `INSERT INTO sheet_meta (category_key, category_name, sheet_name, sheet_type, table_name)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE category_name = VALUES(category_name), sheet_name = VALUES(sheet_name), table_name = VALUES(table_name)`,
    [categoryKey, categoryName, sheetName, sheetType, tableName]
  );

  await pool.query(
    'DELETE FROM field_meta WHERE category_key = ? AND sheet_type = ?',
    [categoryKey, sheetType]
  );

  const cnFieldNames = Object.keys(fieldTypes);
  let order = 0;
  for (const cnName of cnFieldNames) {
    const enName = cnToEnField(cnName);
    const fType = cnName === '品牌' || cnName === '型号' ? 'text' : fieldTypes[cnName];
    await pool.query(
      `INSERT INTO field_meta (category_key, sheet_type, en_name, cn_name, field_type, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryKey, sheetType, enName, cnName, fType, order++]
    );
  }
}

async function syncChartConfigToDb(categoryKey, chartConfigs) {
  await pool.query('DELETE FROM chart_config WHERE category_key = ? AND sheet_type = ?', [categoryKey, 'power']);
  for (let si = 0; si < chartConfigs.length; si++) {
    const cc = chartConfigs[si];
    for (let fi = 0; fi < cc.fields.length; fi++) {
      await pool.query(
        `INSERT INTO chart_config (category_key, sheet_type, scenario, scenario_order, chart_type, field_name, field_label, field_order)
         VALUES (?, 'power', ?, ?, ?, ?, ?, ?)`,
        [categoryKey, cc.scenario, si, cc.chartType, cc.fields[fi], cc.labels[fi], fi]
      );
    }
  }
}

function parseChartConfigFromRows(rows, cnToEnMap) {
  const configs = [];
  for (const row of rows) {
    const scenario = (row['功耗对比场景'] || row['场景'] || '').trim();
    const chartTypeCn = (row['图表类型'] || '柱状图').trim();
    const chartType = CHART_TYPE_MAP[chartTypeCn] || 'bar';

    const dataFields = [];
    const dataLabels = [];

    for (const [key, val] of Object.entries(row)) {
      if (key === '功耗对比场景' || key === '场景' || key === '图表类型') continue;
      if (!val || typeof val !== 'string') continue;
      const enName = cnToEnMap[val];
      if (enName) {
        dataFields.push(enName);
        dataLabels.push(val);
      }
    }

    if (scenario && dataFields.length > 0) {
      configs.push({ scenario, chartType, fields: dataFields, labels: dataLabels });
    }
  }
  return configs;
}

async function importSheetData(tableName, records, fieldTypes, imageMap) {
  if (records.length === 0) return { success: 0, fail: 0 };

  const cnFieldNames = Object.keys(fieldTypes);
  const enFieldNames = cnFieldNames.map(cn => cnToEnField(cn));
  const nonKeyEnNames = enFieldNames.filter(en => en !== 'brand' && en !== 'model');
  const nonKeyCnNames = cnFieldNames.filter(cn => cnToEnField(cn) !== 'brand' && cnToEnField(cn) !== 'model');

  const insertCols = ['brand', 'model', ...nonKeyEnNames];
  const placeholders = insertCols.map(() => '?').join(', ');

  let successCount = 0;
  let failCount = 0;

  for (const row of records) {
    try {
      const brand = row['品牌'] || '';
      const model = row['型号'] || '';
      if (!brand && !model) continue;

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
          val = parseFloat(val) || 0;
        } else {
          val = String(val);
          if (val.startsWith('=')) val = '';
        }

        values.push(val);
      }

      await pool.query(
        `INSERT INTO \`${tableName}\` (${insertCols.map(c => '`' + c + '`').join(', ')}) VALUES (${placeholders})`,
        values
      );
      successCount++;
    } catch (err) {
      console.error(`导入行失败:`, err.message);
      failCount++;
    }
  }

  return { success: successCount, fail: failCount };
}

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
    const [rows] = await pool.query(`SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`);
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
    const [rows] = await pool.query(`SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`);
    res.json({ success: true, data: rows, headerRows: config.power.headerRows || [] });
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
        try { [infoRows] = await pool.query(`SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`); } catch (_) {}
      }
      if (config.power) {
        try { [powerRows] = await pool.query(`SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`); } catch (_) {}
      }
      result[key] = {
        name: config.name,
        info: config.info ? { table: config.info.table, displayColumns: config.info.displayColumns, data: infoRows } : { table: '', displayColumns: [], data: [] },
        power: config.power ? { table: config.power.table, displayColumns: config.power.displayColumns, chartConfig: config.power.chartConfig, data: powerRows, headerRows: config.power.headerRows || [] } : { table: '', displayColumns: [], chartConfig: [], data: [], headerRows: [] },
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
    const firstInfo = Object.values(meta).find(m => m.info);
    if (!firstInfo) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(`SELECT DISTINCT brand FROM \`${firstInfo.info.table}\` ORDER BY brand`);
    res.json({ success: true, data: rows.map(r => r.brand) });
  } catch (error) {
    console.error('查询品牌失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/models/:brand', async (req, res) => {
  try {
    const meta = await getMetaFromDb();
    const firstInfo = Object.values(meta).find(m => m.info);
    if (!firstInfo) return res.json({ success: true, data: [] });
    const [rows] = await pool.query(`SELECT DISTINCT model FROM \`${firstInfo.info.table}\` WHERE brand = ? ORDER BY model`, [req.params.brand]);
    res.json({ success: true, data: rows.map(r => r.model) });
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
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
      [infoRows] = await pool.query(`SELECT * FROM \`${config.info.table}\` ORDER BY brand, model`);
    }
    if (config.power) {
      [powerRows] = await pool.query(`SELECT * FROM \`${config.power.table}\` ORDER BY brand, model`);
    }
    const merged = infoRows.map(info => {
      const power = powerRows.find(p => p.brand === info.brand && p.model === info.model) || {};
      return { ...info, ...power, id: info.id };
    });
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error('查询数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/import-all', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const imageMap = extractImagesFromXlsx(req.file.path);
    console.log('提取到的图片映射:', Object.keys(imageMap).length > 0 ? '有图片' : '无图片');

    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;

    const sheetInfoMap = {};
    for (const sheetName of sheetNames) {
      const parsed = parseSheetType(sheetName);
      if (parsed.type === 'config') continue;
      const categoryKey = categoryNameToKey(parsed.categoryName);
      if (!sheetInfoMap[categoryKey]) {
        sheetInfoMap[categoryKey] = { name: parsed.categoryName, sheets: {} };
      }
      sheetInfoMap[categoryKey].sheets[sheetName] = parsed;
    }

    const existingMeta = await getMetaFromDb();

    for (const [categoryKey, catInfo] of Object.entries(sheetInfoMap)) {
      if (existingMeta[categoryKey]) {
        if (existingMeta[categoryKey].info) {
          try { await pool.query(`DROP TABLE IF EXISTS \`${existingMeta[categoryKey].info.table}\``); } catch (_) {}
        }
        if (existingMeta[categoryKey].power) {
          try { await pool.query(`DROP TABLE IF EXISTS \`${existingMeta[categoryKey].power.table}\``); } catch (_) {}
        }
      }
      await pool.query('DELETE FROM sheet_meta WHERE category_key = ?', [categoryKey]);
      await pool.query('DELETE FROM field_meta WHERE category_key = ?', [categoryKey]);
      await pool.query('DELETE FROM chart_config WHERE category_key = ?', [categoryKey]);
      await pool.query('DELETE FROM header_rows WHERE category_key = ?', [categoryKey]);
      await pool.query('DELETE FROM image_mapping WHERE category_key = ?', [categoryKey]);
    }

    const results = {};
    let totalSuccess = 0;
    let totalFail = 0;
    let processedSheets = 0;

    for (const [categoryKey, catInfo] of Object.entries(sheetInfoMap)) {
      await syncImageMapToDb(categoryKey, imageMap);

      for (const [sheetName, sheetParsed] of Object.entries(catInfo.sheets)) {
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        const records = parseTransposedSheet(rawRows);

        const allFieldNames = extractAllFieldNames(rawRows);
        let fieldTypes = records.length > 0 ? detectFieldTypes(records) : {};
        fieldTypes = mergeFieldTypesWithAllNames(fieldTypes, allFieldNames);
        const tableName = `${categoryKey}_${sheetParsed.type}`;

        const fieldDefs = Object.entries(fieldTypes).map(([cnName, fType], idx) => ({
          en_name: cnToEnField(cnName),
          cn_name: cnName,
          field_type: fType,
          display_order: idx,
        }));

        await createTable(tableName, fieldDefs);
        await syncMetaToDb(categoryKey, catInfo.name, sheetName, sheetParsed.type, tableName, fieldTypes, records);

        const headerRows = extractHeaderRows(rawRows, 3);
        await syncHeaderRowsToDb(categoryKey, sheetParsed.type, headerRows);

        if (records.length > 0) {
          const dbImageMap = await getImageMapFromDb(categoryKey);
          const mergedImageMap = { ...imageMap, ...dbImageMap };
          const importResult = await importSheetData(tableName, records, fieldTypes, mergedImageMap);

          results[`${categoryKey}_${sheetParsed.type}`] = {
            sheetName,
            categoryName: catInfo.name + (sheetParsed.type === 'info' ? '产品信息' : '功耗数据'),
            successCount: importResult.success,
            failCount: importResult.fail,
          };
          totalSuccess += importResult.success;
          totalFail += importResult.fail;
        }
        processedSheets++;
      }
    }

    for (const sheetName of sheetNames) {
      const parsed = parseSheetType(sheetName);
      if (parsed.type !== 'config') continue;

      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);
      if (rows.length === 0) continue;

      const categoryKey = categoryNameToKey(parsed.categoryName);
      const catInfo = sheetInfoMap[categoryKey];
      if (!catInfo) continue;

      const [powerFields] = await pool.query(
        'SELECT en_name, cn_name FROM field_meta WHERE category_key = ? AND sheet_type = ?',
        [categoryKey, 'power']
      );
      const cnToEnMap = {};
      for (const f of powerFields) {
        cnToEnMap[f.cn_name] = f.en_name;
      }

      const chartConfigs = parseChartConfigFromRows(rows, cnToEnMap);
      if (chartConfigs.length > 0) {
        await syncChartConfigToDb(categoryKey, chartConfigs);
        console.log(`已从配置sheet加载 ${categoryKey} 的图表配置`);
      }
    }

    res.json({
      success: true,
      message: `处理完成，共处理 ${processedSheets} 个Sheet，成功 ${totalSuccess} 条，失败 ${totalFail} 条`,
      results,
      totalSuccess,
      totalFail,
    });
  } catch (error) {
    console.error('导入文件失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const imageUpload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

app.post('/api/:category/info/:id/image', imageUpload.single('image'), async (req, res) => {
  try {
    const { category, id } = req.params;
    if (!req.file) return res.status(400).json({ success: false, message: '请上传图片' });

    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.info) return res.status(404).json({ success: false, message: '类别不存在' });

    const ext = path.extname(req.file.originalname) || '.jpeg';
    const newFilename = `${category}_${id}_${Date.now()}${ext}`;
    const newPath = path.join(imagesDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    const imagePath = `/uploads/images/${newFilename}`;
    const imageField = config.info.fields.find(f => f !== 'brand' && f !== 'model' && config.info.displayColumns.find(c => c.key === f && c.type === 'image'));

    if (imageField) {
      await pool.query(`UPDATE \`${config.info.table}\` SET \`${imageField}\` = ? WHERE id = ?`, [imagePath, id]);
    } else {
      await pool.query(`UPDATE \`${config.info.table}\` SET image = ? WHERE id = ?`, [imagePath, id]);
    }

    res.json({ success: true, data: { image: imagePath }, message: '图片上传成功' });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/:category/info/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const meta = await getMetaFromDb();
    const config = meta[category];
    if (!config || !config.info) return res.status(404).json({ success: false, message: '类别不存在' });

    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.info.fields) {
      if (field !== 'brand' && field !== 'model' && updates[field] !== undefined) {
        setClauses.push(`\`${field}\` = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0) return res.json({ success: true, message: '无更新' });
    values.push(id);
    await pool.query(`UPDATE \`${config.info.table}\` SET ${setClauses.join(', ')} WHERE id = ?`, values);
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
    if (!config || !config.info) return res.status(404).json({ success: false, message: '类别不存在' });

    const [rows] = await pool.query(`SELECT * FROM \`${config.info.table}\` WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM \`${config.info.table}\` WHERE id = ?`, [id]);

    const imageCols = config.info.displayColumns.filter(c => c.type === 'image');
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
    if (!config || !config.power) return res.status(404).json({ success: false, message: '类别不存在' });

    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.power.fields) {
      if (field !== 'brand' && field !== 'model' && updates[field] !== undefined) {
        setClauses.push(`\`${field}\` = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0) return res.json({ success: true, message: '无更新' });
    values.push(id);
    await pool.query(`UPDATE \`${config.power.table}\` SET ${setClauses.join(', ')} WHERE id = ?`, values);
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
    if (!config || !config.power) return res.status(404).json({ success: false, message: '类别不存在' });

    await pool.query(`DELETE FROM \`${config.power.table}\` WHERE id = ?`, [id]);
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
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
    const records = parseTransposedSheet(rawRows);
    if (records.length === 0) continue;

    const allFieldNames = extractAllFieldNames(rawRows);
    let fieldTypes = detectFieldTypes(records);
    fieldTypes = mergeFieldTypesWithAllNames(fieldTypes, allFieldNames);
    const tableName = `${categoryKey}_${parsed.type}`;
    const fieldDefs = Object.entries(fieldTypes).map(([cnName, fType], idx) => ({
      en_name: cnToEnField(cnName), cn_name: cnName, field_type: fType, display_order: idx,
    }));

    await createTable(tableName, fieldDefs);
    await syncMetaToDb(categoryKey, parsed.categoryName, sheetName, parsed.type, tableName, fieldTypes, records);

    const headerRows = extractHeaderRows(rawRows, 3);
    await syncHeaderRowsToDb(categoryKey, parsed.type, headerRows);

    const dbImageMap = await getImageMapFromDb(categoryKey);
    const mergedImageMap = { ...imageMap, ...dbImageMap };
    await importSheetData(tableName, records, fieldTypes, mergedImageMap);
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
      [categoryKey, 'power']
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
    await loadFromTemplateOnFirstRun();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`数据库服务已启动: http://0.0.0.0:${PORT}`);
      console.log('数据库配置:', dbConfig);
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

startServer();