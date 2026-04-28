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
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

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

const CONFIG_SHEET_TO_CATEGORY = {
  '旗舰手机': 'phones',
  '中低端手机': 'mid_low_phones',
  '鼠标': 'mice',
  '键盘': 'keyboards',
  '遥控器': 'remote_controls',
};

const INFO_SHEET_TO_CATEGORY = {
  '旗舰手机产品信息': 'phones',
  '中低端手机产品信息': 'mid_low_phones',
  '鼠标产品信息': 'mice',
  '键盘产品信息': 'keyboards',
  '遥控器产品信息': 'remote_controls',
};

const POWER_SHEET_TO_CATEGORY = {
  '旗舰手机功耗数据': 'phones',
  '中低端手机功耗数据': 'mid_low_phones',
  '鼠标功耗数据': 'mice',
  '键盘功耗数据': 'keyboards',
  '遥控器功耗数据': 'remote_controls',
};

const CHART_TYPE_MAP = {
  '折线图': 'line',
  '柱状图': 'bar',
  '纵向柱状图': 'bar',
  '横向柱状图': 'barH',
  '饼图': 'pie',
  '雷达图': 'radar',
};

const CATEGORY_CONFIG = {
  phones: {
    name: '旗舰手机',
    info: {
      table: 'phones_info',
      fields: ['brand', 'model', 'image', 'screen', 'processor', 'ram', 'storage', 'camera', 'battery', 'price', 'battery_capacity'],
      cnFields: ['品牌', '型号', '图片', '屏幕', '处理器', '内存', '存储', '摄像头', '电池', '价格', '电池容量'],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
        { key: 'image', label: '图片', type: 'image' },
        { key: 'screen', label: '屏幕' },
        { key: 'processor', label: '处理器' },
        { key: 'ram', label: '内存' },
        { key: 'storage', label: '存储' },
        { key: 'camera', label: '摄像头' },
        { key: 'battery', label: '电池' },
        { key: 'price', label: '价格' },
        { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      ],
    },
    power: {
      table: 'phones_power',
      fields: ['brand', 'model', 'video_power', 'game_power', 'standby_power', 'browser_power'],
      cnFields: ['品牌', '型号', '视频播放功耗', '游戏功耗', '待机功耗', '浏览网页功耗'],
      chartConfig: [
        { scenario: '使用', chartType: 'bar', fields: ['video_power', 'game_power', 'browser_power'], labels: ['视频播放功耗', '游戏功耗', '浏览网页功耗'] },
        { scenario: '未使用', chartType: 'line', fields: ['standby_power'], labels: ['待机功耗'] },
      ],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
      ],
    },
  },
  mid_low_phones: {
    name: '中低端手机',
    info: {
      table: 'mid_low_phones_info',
      fields: ['brand', 'model', 'image', 'screen', 'processor', 'ram', 'storage', 'camera', 'battery', 'price', 'battery_capacity'],
      cnFields: ['品牌', '型号', '图片', '屏幕', '处理器', '内存', '存储', '摄像头', '电池', '价格', '电池容量'],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
        { key: 'image', label: '图片', type: 'image' },
        { key: 'screen', label: '屏幕' },
        { key: 'processor', label: '处理器' },
        { key: 'ram', label: '内存' },
        { key: 'storage', label: '存储' },
        { key: 'camera', label: '摄像头' },
        { key: 'battery', label: '电池' },
        { key: 'price', label: '价格' },
        { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      ],
    },
    power: {
      table: 'mid_low_phones_power',
      fields: ['brand', 'model', 'video_power', 'game_power', 'standby_power', 'browser_power'],
      cnFields: ['品牌', '型号', '视频播放功耗', '游戏功耗', '待机功耗', '浏览网页功耗'],
      chartConfig: [
        { scenario: '使用', chartType: 'bar', fields: ['video_power', 'game_power', 'browser_power'], labels: ['视频播放功耗', '游戏功耗', '浏览网页功耗'] },
        { scenario: '未使用', chartType: 'line', fields: ['standby_power'], labels: ['待机功耗'] },
      ],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
      ],
    },
  },
  mice: {
    name: '鼠标',
    info: {
      table: 'mice_info',
      fields: ['brand', 'model', 'image', 'battery_capacity'],
      cnFields: ['品牌', '型号', '图片', '电池容量'],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
        { key: 'image', label: '图片', type: 'image' },
        { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      ],
    },
    power: {
      table: 'mice_power',
      fields: ['brand', 'model', 'sleep_power', 'dormancy_power', 'usage_power'],
      cnFields: ['品牌', '型号', '睡眠功耗', '休眠功耗', '使用功耗'],
      chartConfig: [
        { scenario: '使用', chartType: 'bar', fields: ['dormancy_power', 'sleep_power'], labels: ['休眠功耗', '睡眠功耗'] },
        { scenario: '未使用', chartType: 'line', fields: ['usage_power'], labels: ['使用功耗'] },
      ],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
      ],
    },
  },
  keyboards: {
    name: '键盘',
    info: {
      table: 'keyboards_info',
      fields: ['brand', 'model', 'image', 'battery_capacity'],
      cnFields: ['品牌', '型号', '图片', '电池容量'],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
        { key: 'image', label: '图片', type: 'image' },
        { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      ],
    },
    power: {
      table: 'keyboards_power',
      fields: ['brand', 'model', 'sleep_power', 'dormancy_power', 'usage_power'],
      cnFields: ['品牌', '型号', '睡眠功耗', '休眠功耗', '使用功耗'],
      chartConfig: [
        { scenario: '使用', chartType: 'bar', fields: ['dormancy_power', 'sleep_power'], labels: ['休眠功耗', '睡眠功耗'] },
        { scenario: '未使用', chartType: 'line', fields: ['usage_power'], labels: ['使用功耗'] },
      ],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
      ],
    },
  },
  remote_controls: {
    name: '遥控器',
    info: {
      table: 'remote_controls_info',
      fields: ['brand', 'model', 'image', 'battery_capacity'],
      cnFields: ['品牌', '型号', '图片', '电池容量'],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
        { key: 'image', label: '图片', type: 'image' },
        { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      ],
    },
    power: {
      table: 'remote_controls_power',
      fields: ['brand', 'model', 'sleep_power', 'dormancy_power', 'usage_power'],
      cnFields: ['品牌', '型号', '睡眠功耗', '休眠功耗', '使用功耗'],
      chartConfig: [
        { scenario: '使用', chartType: 'bar', fields: ['dormancy_power', 'sleep_power'], labels: ['休眠功耗', '睡眠功耗'] },
        { scenario: '未使用', chartType: 'line', fields: ['usage_power'], labels: ['使用功耗'] },
      ],
      displayColumns: [
        { key: 'brand', label: '品牌' },
        { key: 'model', label: '型号' },
      ],
    },
  },
};

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
    const cellImagesEntry = zip.getEntry('xl/cellimages.xml');
    if (!cellImagesEntry) return {};

    const cellImagesXml = zip.readAsText('xl/cellimages.xml');
    const relsEntry = zip.getEntry('xl/_rels/cellimages.xml.rels');
    if (!relsEntry) return {};
    const relsXml = zip.readAsText('xl/_rels/cellimages.xml.rels');

    const nameToRid = {};
    const picRegex = /<xdr:pic>([\s\S]*?)<\/xdr:pic>/g;
    let picMatch;
    while ((picMatch = picRegex.exec(cellImagesXml)) !== null) {
      const picContent = picMatch[1];
      const nameMatch = picContent.match(/name="([^"]+)"/);
      const ridMatch = picContent.match(/r:embed="([^"]+)"/);
      if (nameMatch && ridMatch) {
        nameToRid[nameMatch[1]] = ridMatch[1];
      }
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
        const savePath = path.join(imagesDir, filename);
        fs.writeFileSync(savePath, entry.getData());
        nameToFile[name] = `/uploads/images/${filename}`;
      }
    }
    return nameToFile;
  } catch (error) {
    console.error('提取图片失败:', error.message);
    return {};
  }
}

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  const conn = await pool.getConnection();

  await conn.query(`
    CREATE TABLE IF NOT EXISTS phones_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      image VARCHAR(500) COMMENT '图片路径',
      screen VARCHAR(200) COMMENT '屏幕',
      processor VARCHAR(200) COMMENT '处理器',
      ram VARCHAR(100) COMMENT '内存',
      storage VARCHAR(100) COMMENT '存储',
      camera VARCHAR(500) COMMENT '摄像头',
      battery VARCHAR(100) COMMENT '电池',
      price VARCHAR(100) COMMENT '价格',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旗舰手机产品信息表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS phones_power (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      video_power INT DEFAULT 0 COMMENT '视频播放功耗(mW)',
      game_power INT DEFAULT 0 COMMENT '游戏功耗(mW)',
      standby_power INT DEFAULT 0 COMMENT '待机功耗(mW)',
      browser_power INT DEFAULT 0 COMMENT '浏览网页功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旗舰手机功耗数据表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mid_low_phones_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      image VARCHAR(500) COMMENT '图片路径',
      screen VARCHAR(200) COMMENT '屏幕',
      processor VARCHAR(200) COMMENT '处理器',
      ram VARCHAR(100) COMMENT '内存',
      storage VARCHAR(100) COMMENT '存储',
      camera VARCHAR(500) COMMENT '摄像头',
      battery VARCHAR(100) COMMENT '电池',
      price VARCHAR(100) COMMENT '价格',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='中低端手机产品信息表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mid_low_phones_power (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      video_power INT DEFAULT 0 COMMENT '视频播放功耗(mW)',
      game_power INT DEFAULT 0 COMMENT '游戏功耗(mW)',
      standby_power INT DEFAULT 0 COMMENT '待机功耗(mW)',
      browser_power INT DEFAULT 0 COMMENT '浏览网页功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='中低端手机功耗数据表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mice_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      image VARCHAR(500) COMMENT '图片路径',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鼠标产品信息表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mice_power (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鼠标功耗数据表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS keyboards_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      image VARCHAR(500) COMMENT '图片路径',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='键盘产品信息表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS keyboards_power (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='键盘功耗数据表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS remote_controls_info (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      image VARCHAR(500) COMMENT '图片路径',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='遥控器产品信息表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS remote_controls_power (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='遥控器功耗数据表'
  `);

  const oldTables = ['phones', 'mid_low_phones', 'mice', 'keyboards', 'remote_controls'];
  for (const table of oldTables) {
    try {
      await conn.query(`DROP TABLE IF EXISTS \`${table}\``);
    } catch (_) {}
  }

  conn.release();
  console.log('数据库初始化完成');
}

app.get('/api/categories', (req, res) => {
  const categories = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key,
    name: config.name,
    info: {
      table: config.info.table,
      fields: config.info.fields,
      cnFields: config.info.cnFields,
      displayColumns: config.info.displayColumns,
    },
    power: {
      table: config.power.table,
      fields: config.power.fields,
      cnFields: config.power.cnFields,
      chartConfig: config.power.chartConfig,
      displayColumns: config.power.displayColumns,
    },
  }));
  res.json({ success: true, data: categories });
});

app.get('/api/categories/:category/chart-config', (req, res) => {
  const config = CATEGORY_CONFIG[req.params.category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  res.json({ success: true, data: config.power.chartConfig });
});

app.get('/api/:category/info', async (req, res) => {
  const category = req.params.category;
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  try {
    const [rows] = await pool.query(`SELECT * FROM ${config.info.table} ORDER BY brand, model`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`查询${config.name}产品信息失败:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/:category/power', async (req, res) => {
  const category = req.params.category;
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  try {
    const [rows] = await pool.query(`SELECT * FROM ${config.power.table} ORDER BY brand, model`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`查询${config.name}功耗数据失败:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/all-data', async (req, res) => {
  try {
    const result = {};
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      const [infoRows] = await pool.query(`SELECT * FROM ${config.info.table} ORDER BY brand, model`);
      const [powerRows] = await pool.query(`SELECT * FROM ${config.power.table} ORDER BY brand, model`);
      result[key] = {
        name: config.name,
        info: {
          table: config.info.table,
          displayColumns: config.info.displayColumns,
          data: infoRows,
        },
        power: {
          table: config.power.table,
          displayColumns: config.power.displayColumns,
          chartConfig: config.power.chartConfig,
          data: powerRows,
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
    const [rows] = await pool.query('SELECT DISTINCT brand FROM phones_info ORDER BY brand');
    res.json({ success: true, data: rows.map(r => r.brand) });
  } catch (error) {
    console.error('查询品牌失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/models/:brand', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT model FROM phones_info WHERE brand = ? ORDER BY model', [req.params.brand]);
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
  const category = req.params.category;
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  try {
    const [infoRows] = await pool.query(`SELECT * FROM ${config.info.table} ORDER BY brand, model`);
    const [powerRows] = await pool.query(`SELECT * FROM ${config.power.table} ORDER BY brand, model`);
    const merged = infoRows.map(info => {
      const power = powerRows.find(p => p.brand === info.brand && p.model === info.model) || {};
      return { ...info, ...power, id: info.id };
    });
    res.json({ success: true, data: merged });
  } catch (error) {
    console.error(`查询${config.name}数据失败:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const upload = multer({ dest: 'uploads/' });

function getPhoneInfoFields() {
  return {
    insert: 'brand, model, image, screen, processor, ram, storage, camera, battery, price, battery_capacity',
    update: 'image = VALUES(image), screen = VALUES(screen), processor = VALUES(processor), ram = VALUES(ram), storage = VALUES(storage), camera = VALUES(camera), battery = VALUES(battery), price = VALUES(price), battery_capacity = VALUES(battery_capacity)',
    placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  };
}

function getPhonePowerFields() {
  return {
    insert: 'brand, model, video_power, game_power, standby_power, browser_power',
    update: 'video_power = VALUES(video_power), game_power = VALUES(game_power), standby_power = VALUES(standby_power), browser_power = VALUES(browser_power)',
    placeholders: '?, ?, ?, ?, ?, ?',
  };
}

function getPeripheralInfoFields() {
  return {
    insert: 'brand, model, image, battery_capacity',
    update: 'image = VALUES(image), battery_capacity = VALUES(battery_capacity)',
    placeholders: '?, ?, ?, ?',
  };
}

function getPeripheralPowerFields() {
  return {
    insert: 'brand, model, sleep_power, dormancy_power, usage_power',
    update: 'sleep_power = VALUES(sleep_power), dormancy_power = VALUES(dormancy_power), usage_power = VALUES(usage_power)',
    placeholders: '?, ?, ?, ?, ?',
  };
}

function getImportValuesPhoneInfo(row, imageMap) {
  const imageCellValue = row['图片'] || row['image'] || '';
  let imagePath = '';
  const dispimgId = extractDispimgId(imageCellValue);
  if (dispimgId && imageMap[dispimgId]) {
    imagePath = imageMap[dispimgId];
  } else if (imageCellValue && !imageCellValue.startsWith('=')) {
    imagePath = imageCellValue;
  }
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    imagePath,
    row['屏幕'] || row['screen'] || '',
    row['处理器'] || row['processor'] || '',
    row['内存'] || row['ram'] || '',
    row['存储'] || row['storage'] || '',
    row['摄像头'] || row['camera'] || '',
    row['电池'] || row['battery'] || '',
    row['价格'] || row['price'] || '',
    row['电池容量'] || row['battery_capacity'] || '',
  ];
}

function getImportValuesPhonePower(row) {
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    parseInt(row['视频播放功耗'] || row['video_power']) || 0,
    parseInt(row['游戏功耗'] || row['game_power']) || 0,
    parseInt(row['待机功耗'] || row['standby_power']) || 0,
    parseInt(row['浏览网页功耗'] || row['browser_power']) || 0,
  ];
}

function getImportValuesPeripheralInfo(row, imageMap) {
  const imageCellValue = row['图片'] || row['image'] || '';
  let imagePath = '';
  const dispimgId = extractDispimgId(imageCellValue);
  if (dispimgId && imageMap[dispimgId]) {
    imagePath = imageMap[dispimgId];
  } else if (imageCellValue && !imageCellValue.startsWith('=')) {
    imagePath = imageCellValue;
  }
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    imagePath,
    row['电池容量'] || row['battery_capacity'] || '',
  ];
}

function getImportValuesPeripheralPower(row) {
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    parseInt(row['睡眠功耗'] || row['sleep_power']) || 0,
    parseInt(row['休眠功耗'] || row['dormancy_power']) || 0,
    parseInt(row['使用功耗'] || row['usage_power']) || 0,
  ];
}

app.post('/api/import-all', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const imageMap = extractImagesFromXlsx(req.file.path);
    console.log('提取到的图片映射:', Object.keys(imageMap).length > 0 ? '有图片' : '无图片');

    const workbook = xlsx.readFile(req.file.path);
    const sheetNames = workbook.SheetNames;

    for (const sheetName of sheetNames) {
      const configCategory = CONFIG_SHEET_TO_CATEGORY[sheetName];
      if (!configCategory) continue;
      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);
      if (rows.length === 0) continue;
      const catConfig = CATEGORY_CONFIG[configCategory];
      if (!catConfig) continue;
      const newChartConfig = parseChartConfigFromRows(rows, catConfig.power);
      if (newChartConfig.length > 0) {
        catConfig.power.chartConfig = newChartConfig;
      }
    }

    const results = {};
    let totalSuccess = 0;
    let totalFail = 0;
    let processedSheets = 0;

    for (const sheetName of sheetNames) {
      const infoCategory = INFO_SHEET_TO_CATEGORY[sheetName];
      const powerCategory = POWER_SHEET_TO_CATEGORY[sheetName];

      if (infoCategory) {
        const config = CATEGORY_CONFIG[infoCategory];
        if (!config) continue;
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        const data = parseTransposedSheet(rawRows);
        if (data.length === 0) continue;

        const isPhoneCategory = infoCategory === 'phones' || infoCategory === 'mid_low_phones';
        const fields = isPhoneCategory ? getPhoneInfoFields() : getPeripheralInfoFields();
        const getValues = isPhoneCategory ? getImportValuesPhoneInfo : getImportValuesPeripheralInfo;

        let successCount = 0;
        let failCount = 0;

        for (const row of data) {
          try {
            const brand = row['品牌'] || row['brand'] || '';
            const model = row['型号'] || row['model'] || '';
            if (!brand && !model) continue;
            const values = getValues(row, imageMap);
            await pool.query(
              `INSERT INTO ${config.info.table} (${fields.insert}) VALUES (${fields.placeholders}) ON DUPLICATE KEY UPDATE ${fields.update}`,
              values
            );
            successCount++;
          } catch (err) {
            console.error(`导入产品信息行失败:`, err.message);
            failCount++;
          }
        }

        results[`${infoCategory}_info`] = {
          sheetName,
          categoryName: config.name + '产品信息',
          successCount,
          failCount,
        };
        totalSuccess += successCount;
        totalFail += failCount;
        processedSheets++;
      }

      if (powerCategory) {
        const config = CATEGORY_CONFIG[powerCategory];
        if (!config) continue;
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });
        const data = parseTransposedSheet(rawRows);
        if (data.length === 0) continue;

        const isPhoneCategory = powerCategory === 'phones' || powerCategory === 'mid_low_phones';
        const fields = isPhoneCategory ? getPhonePowerFields() : getPeripheralPowerFields();
        const getValues = isPhoneCategory ? getImportValuesPhonePower : getImportValuesPeripheralPower;

        let successCount = 0;
        let failCount = 0;

        for (const row of data) {
          try {
            const brand = row['品牌'] || row['brand'] || '';
            const model = row['型号'] || row['model'] || '';
            if (!brand && !model) continue;
            const values = getValues(row);
            await pool.query(
              `INSERT INTO ${config.power.table} (${fields.insert}) VALUES (${fields.placeholders}) ON DUPLICATE KEY UPDATE ${fields.update}`,
              values
            );
            successCount++;
          } catch (err) {
            console.error(`导入功耗数据行失败:`, err.message);
            failCount++;
          }
        }

        results[`${powerCategory}_power`] = {
          sheetName,
          categoryName: config.name + '功耗数据',
          successCount,
          failCount,
        };
        totalSuccess += successCount;
        totalFail += failCount;
        processedSheets++;
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
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  },
});

app.post('/api/:category/info/:id/image', imageUpload.single('image'), async (req, res) => {
  try {
    const { category, id } = req.params;
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传图片' });
    }

    const ext = path.extname(req.file.originalname) || '.jpeg';
    const newFilename = `${category}_${id}_${Date.now()}${ext}`;
    const newPath = path.join(imagesDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    const imagePath = `/uploads/images/${newFilename}`;
    await pool.query(
      `UPDATE ${config.info.table} SET image = ? WHERE id = ?`,
      [imagePath, id]
    );

    res.json({ success: true, data: { image: imagePath }, message: '图片上传成功' });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/:category/info/:id', async (req, res) => {
  try {
    const { category, id } = req.params;
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.info.fields) {
      if (field !== 'brand' && field !== 'model' && updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0) {
      return res.json({ success: true, message: '无更新' });
    }
    values.push(id);
    await pool.query(
      `UPDATE ${config.info.table} SET ${setClauses.join(', ')} WHERE id = ?`,
      values
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
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    const [rows] = await pool.query(`SELECT image FROM ${config.info.table} WHERE id = ?`, [id]);
    await pool.query(`DELETE FROM ${config.info.table} WHERE id = ?`, [id]);
    if (rows.length > 0 && rows[0].image) {
      const imgPath = path.join(__dirname, rows[0].image);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
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
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    const updates = req.body;
    const setClauses = [];
    const values = [];
    for (const field of config.power.fields) {
      if (field !== 'brand' && field !== 'model' && updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    if (setClauses.length === 0) {
      return res.json({ success: true, message: '无更新' });
    }
    values.push(id);
    await pool.query(
      `UPDATE ${config.power.table} SET ${setClauses.join(', ')} WHERE id = ?`,
      values
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
    const config = CATEGORY_CONFIG[category];
    if (!config) {
      return res.status(404).json({ success: false, message: '类别不存在' });
    }
    await pool.query(`DELETE FROM ${config.power.table} WHERE id = ?`, [id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除功耗数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function parseChartConfigFromRows(rows, powerConfig) {
  const newChartConfig = [];
  for (const row of rows) {
    const scenario = row['功耗对比场景'] || row['场景'] || '';
    const chartTypeCn = row['图表类型'] || '柱状图';
    const chartType = CHART_TYPE_MAP[chartTypeCn] || 'bar';

    const dataFields = [];
    const dataLabels = [];

    const keys = Object.keys(row);
    for (const key of keys) {
      if (key === '功耗对比场景' || key === '场景' || key === '图表类型') continue;
      const val = row[key];
      if (!val || typeof val !== 'string') continue;
      const fieldEntry = powerConfig.cnFields.findIndex((f) => f === val);
      if (fieldEntry >= 0) {
        dataFields.push(powerConfig.fields[fieldEntry]);
        dataLabels.push(val);
      }
    }

    if (scenario && dataFields.length > 0) {
      newChartConfig.push({ scenario, chartType, fields: dataFields, labels: dataLabels });
    }
  }
  return newChartConfig;
}

function loadChartConfigFromTemplate() {
  const templatePath = path.join(__dirname, '..', 'public', 'gh.xlsx');
  if (!fs.existsSync(templatePath)) return;

  try {
    const workbook = xlsx.readFile(templatePath);
    for (const sheetName of workbook.SheetNames) {
      const configCategory = CONFIG_SHEET_TO_CATEGORY[sheetName];
      if (!configCategory) continue;

      const worksheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(worksheet);
      if (rows.length === 0) continue;

      const catConfig = CATEGORY_CONFIG[configCategory];
      if (!catConfig) continue;

      const newChartConfig = parseChartConfigFromRows(rows, catConfig.power);
      if (newChartConfig.length > 0) {
        catConfig.power.chartConfig = newChartConfig;
        console.log(`已从模板加载 ${configCategory} 的图表配置:`, JSON.stringify(newChartConfig));
      }
    }
  } catch (error) {
    console.error('加载模板图表配置失败:', error.message);
  }
}

async function startServer() {
  try {
    await initDatabase();
    loadChartConfigFromTemplate();
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
