import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

const SHEET_TO_CATEGORY = {
  '旗舰手机数据': 'phones',
  '中低端手机数据': 'mid_low_phones',
  '鼠标数据': 'mice',
  '键盘数据': 'keyboards',
  '遥控器数据': 'remote_controls',
};

const CONFIG_SHEET_TO_CATEGORY = {
  '旗舰手机': 'phones',
  '中低端手机': 'mid_low_phones',
  '鼠标': 'mice',
  '键盘': 'keyboards',
  '遥控器': 'remote_controls',
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
    table: 'phones',
    name: '旗舰手机',
    fields: ['brand', 'model', 'screen', 'processor', 'ram', 'storage', 'camera', 'battery', 'price', 'battery_capacity', 'video_power', 'game_power', 'standby_power', 'browser_power'],
    cnFields: ['品牌', '型号', '屏幕', '处理器', '内存', '存储', '摄像头', '电池', '价格', '电池容量', '视频播放功耗', '游戏功耗', '待机功耗', '浏览网页功耗'],
    chartConfig: [
      { scenario: '使用', chartType: 'bar', fields: ['video_power', 'game_power', 'browser_power'], labels: ['视频播放功耗', '游戏功耗', '浏览网页功耗'] },
      { scenario: '未使用', chartType: 'line', fields: ['standby_power'], labels: ['待机功耗'] },
    ],
    displayColumns: [
      { key: 'brand', label: '品牌' },
      { key: 'model', label: '型号' },
      { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      { key: 'processor', label: '处理器' },
    ],
  },
  mid_low_phones: {
    table: 'mid_low_phones',
    name: '中低端手机',
    fields: ['brand', 'model', 'screen', 'processor', 'ram', 'storage', 'camera', 'battery', 'price', 'battery_capacity', 'video_power', 'game_power', 'standby_power', 'browser_power'],
    cnFields: ['品牌', '型号', '屏幕', '处理器', '内存', '存储', '摄像头', '电池', '价格', '电池容量', '视频播放功耗', '游戏功耗', '待机功耗', '浏览网页功耗'],
    chartConfig: [
      { scenario: '使用', chartType: 'bar', fields: ['video_power', 'game_power', 'browser_power'], labels: ['视频播放功耗', '游戏功耗', '浏览网页功耗'] },
      { scenario: '未使用', chartType: 'line', fields: ['standby_power'], labels: ['待机功耗'] },
    ],
    displayColumns: [
      { key: 'brand', label: '品牌' },
      { key: 'model', label: '型号' },
      { key: 'battery_capacity', label: '电池容量', suffix: 'mAh' },
      { key: 'processor', label: '处理器' },
    ],
  },
  mice: {
    table: 'mice',
    name: '鼠标',
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
  keyboards: {
    table: 'keyboards',
    name: '键盘',
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
  remote_controls: {
    table: 'remote_controls',
    name: '遥控器',
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
};

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
    CREATE TABLE IF NOT EXISTS phones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      screen VARCHAR(200) COMMENT '屏幕',
      processor VARCHAR(200) COMMENT '处理器',
      ram VARCHAR(100) COMMENT '内存',
      storage VARCHAR(100) COMMENT '存储',
      camera VARCHAR(500) COMMENT '摄像头',
      battery VARCHAR(100) COMMENT '电池',
      price VARCHAR(100) COMMENT '价格',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      video_power INT DEFAULT 0 COMMENT '视频播放功耗(mW)',
      game_power INT DEFAULT 0 COMMENT '游戏功耗(mW)',
      standby_power INT DEFAULT 0 COMMENT '待机功耗(mW)',
      browser_power INT DEFAULT 0 COMMENT '浏览网页功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='旗舰手机参数表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mid_low_phones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      screen VARCHAR(200) COMMENT '屏幕',
      processor VARCHAR(200) COMMENT '处理器',
      ram VARCHAR(100) COMMENT '内存',
      storage VARCHAR(100) COMMENT '存储',
      camera VARCHAR(500) COMMENT '摄像头',
      battery VARCHAR(100) COMMENT '电池',
      price VARCHAR(100) COMMENT '价格',
      battery_capacity VARCHAR(50) COMMENT '电池容量(mAh)',
      video_power INT DEFAULT 0 COMMENT '视频播放功耗(mW)',
      game_power INT DEFAULT 0 COMMENT '游戏功耗(mW)',
      standby_power INT DEFAULT 0 COMMENT '待机功耗(mW)',
      browser_power INT DEFAULT 0 COMMENT '浏览网页功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='中低端手机参数表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS mice (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鼠标参数表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS keyboards (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='键盘参数表'
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS remote_controls (
      id INT AUTO_INCREMENT PRIMARY KEY,
      brand VARCHAR(100) NOT NULL COMMENT '品牌',
      model VARCHAR(100) NOT NULL COMMENT '型号',
      sleep_power INT DEFAULT 0 COMMENT '睡眠功耗(mW)',
      dormancy_power INT DEFAULT 0 COMMENT '休眠功耗(mW)',
      usage_power INT DEFAULT 0 COMMENT '使用功耗(mW)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_brand_model (brand, model)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='遥控器参数表'
  `);

  conn.release();
  console.log('数据库初始化完成');
}

app.get('/api/categories', (req, res) => {
  const categories = Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
    key,
    name: config.name,
    table: config.table,
    chartConfig: config.chartConfig,
    displayColumns: config.displayColumns,
    fields: config.fields,
    cnFields: config.cnFields,
  }));
  res.json({ success: true, data: categories });
});

app.get('/api/categories/:category/chart-config', (req, res) => {
  const config = CATEGORY_CONFIG[req.params.category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  res.json({ success: true, data: config.chartConfig });
});

function getPhoneFields() {
  return {
    insert: 'brand, model, screen, processor, ram, storage, camera, battery, price, battery_capacity, video_power, game_power, standby_power, browser_power',
    update: 'screen = VALUES(screen), processor = VALUES(processor), ram = VALUES(ram), storage = VALUES(storage), camera = VALUES(camera), battery = VALUES(battery), price = VALUES(price), battery_capacity = VALUES(battery_capacity), video_power = VALUES(video_power), game_power = VALUES(game_power), standby_power = VALUES(standby_power), browser_power = VALUES(browser_power)',
    placeholders: '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
  };
}

function getPeripheralFields() {
  return {
    insert: 'brand, model, sleep_power, dormancy_power, usage_power',
    update: 'sleep_power = VALUES(sleep_power), dormancy_power = VALUES(dormancy_power), usage_power = VALUES(usage_power)',
    placeholders: '?, ?, ?, ?, ?',
  };
}

function getImportValuesPhone(row) {
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    row['屏幕'] || row['screen'] || '',
    row['处理器'] || row['processor'] || '',
    row['内存'] || row['ram'] || '',
    row['存储'] || row['storage'] || '',
    row['摄像头'] || row['camera'] || '',
    row['电池'] || row['battery'] || '',
    row['价格'] || row['price'] || '',
    row['电池容量'] || row['battery_capacity'] || '',
    parseInt(row['视频播放功耗'] || row['video_power']) || 0,
    parseInt(row['游戏功耗'] || row['game_power']) || 0,
    parseInt(row['待机功耗'] || row['standby_power']) || 0,
    parseInt(row['浏览网页功耗'] || row['browser_power']) || 0,
  ];
}

function getImportValuesPeripheral(row) {
  return [
    row['品牌'] || row['brand'] || '',
    row['型号'] || row['model'] || '',
    parseInt(row['睡眠功耗'] || row['sleep_power']) || 0,
    parseInt(row['休眠功耗'] || row['dormancy_power']) || 0,
    parseInt(row['使用功耗'] || row['usage_power']) || 0,
  ];
}

app.get('/api/all-data', async (req, res) => {
  try {
    const result = {};
    for (const [key, config] of Object.entries(CATEGORY_CONFIG)) {
      const [rows] = await pool.query(`SELECT * FROM ${config.table} ORDER BY brand, model`);
      result[key] = {
        name: config.name,
        table: config.table,
        displayColumns: config.displayColumns,
        chartConfig: config.chartConfig,
        data: rows,
      };
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('查询所有数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/import-all', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

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

      const newChartConfig = parseChartConfigFromRows(rows, catConfig);
      if (newChartConfig.length > 0) {
        catConfig.chartConfig = newChartConfig;
      }
    }

    const results = {};
    let totalSuccess = 0;
    let totalFail = 0;
    let processedSheets = 0;

    for (const sheetName of sheetNames) {
      const category = SHEET_TO_CATEGORY[sheetName];
      if (!category) {
        continue;
      }

      const config = CATEGORY_CONFIG[category];
      if (!config) continue;

      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) continue;

      const isPhoneCategory = category === 'phones' || category === 'mid_low_phones';
      const fields = isPhoneCategory ? getPhoneFields() : getPeripheralFields();
      const getValues = isPhoneCategory ? getImportValuesPhone : getImportValuesPeripheral;

      let successCount = 0;
      let failCount = 0;

      for (const row of data) {
        try {
          const brand = row['品牌'] || row['brand'] || '';
          const model = row['型号'] || row['model'] || '';
          
          if (!brand && !model) {
            continue;
          }

          const values = getValues(row);
          await pool.query(
            `INSERT INTO ${config.table} (${fields.insert}) VALUES (${fields.placeholders}) ON DUPLICATE KEY UPDATE ${fields.update}`,
            values
          );
          successCount++;
        } catch (err) {
          failCount++;
        }
      }

      results[category] = {
        sheetName,
        categoryName: config.name,
        successCount,
        failCount,
      };

      totalSuccess += successCount;
      totalFail += failCount;
      processedSheets++;
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

app.get('/api/template/download-all', (req, res) => {
  const templatePath = path.join(__dirname, '..', 'public', 'gh.xlsx');
  if (fs.existsSync(templatePath)) {
    const buffer = fs.readFileSync(templatePath);
    res.setHeader('Content-Disposition', 'attachment; filename=gh.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    return;
  }

  const workbook = xlsx.utils.book_new();

  const phoneData = [
    {
      '品牌': 'Apple', '型号': 'iPhone 15', '屏幕': '6.1英寸 OLED',
      '处理器': 'A16 仿生芯片', '内存': '6GB', '存储': '128GB',
      '摄像头': '4800万像素主摄', '电池': '4000mAh', '价格': '¥5999起',
      '电池容量': '4000', '视频播放功耗': 2500, '游戏功耗': 4500,
      '待机功耗': 50, '浏览网页功耗': 1800,
    },
  ];

  const mouseData = [
    { '品牌': 'Logitech', '型号': 'G502', '睡眠功耗': 70, '休眠功耗': 50, '使用功耗': 500 },
  ];

  const keyboardData = [
    { '品牌': 'Logitech', '型号': 'K380', '睡眠功耗': 30, '休眠功耗': 20, '使用功耗': 200 },
  ];

  const remoteControlData = [
    { '品牌': '小米', '型号': '红外遥控器', '睡眠功耗': 10, '休眠功耗': 5, '使用功耗': 100 },
  ];

  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(phoneData), '旗舰手机数据');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(phoneData), '中低端手机数据');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(mouseData), '鼠标数据');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(keyboardData), '键盘数据');
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(remoteControlData), '遥控器数据');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename=power_comparison_template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/api/brands', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT brand FROM phones ORDER BY brand');
    res.json({ success: true, data: rows.map(r => r.brand) });
  } catch (error) {
    console.error('查询品牌失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/models/:brand', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT model FROM phones WHERE brand = ? ORDER BY model', [req.params.brand]);
    res.json({ success: true, data: rows.map(r => r.model) });
  } catch (error) {
    console.error('查询型号失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/:category', async (req, res) => {
  const category = req.params.category;
  const config = CATEGORY_CONFIG[category];
  if (!config) {
    return res.status(404).json({ success: false, message: '类别不存在' });
  }
  try {
    const [rows] = await pool.query(`SELECT * FROM ${config.table} ORDER BY brand, model`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(`查询${config.name}数据失败:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
});

function parseChartConfigFromRows(rows, catConfig) {
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
      const fieldEntry = catConfig.cnFields.findIndex((f) => f === val);
      if (fieldEntry >= 0) {
        dataFields.push(catConfig.fields[fieldEntry]);
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

      const newChartConfig = parseChartConfigFromRows(rows, catConfig);
      if (newChartConfig.length > 0) {
        catConfig.chartConfig = newChartConfig;
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
