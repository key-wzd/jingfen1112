import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='手机参数表'
  `);

  conn.release();
  console.log('数据库初始化完成');
}

app.get('/api/phones', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM phones ORDER BY brand, model');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('查询手机数据失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/phones/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM phones WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '手机不存在' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('查询手机详情失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/phones', async (req, res) => {
  try {
    const phone = req.body;
    const [result] = await pool.query(
      `INSERT INTO phones (brand, model, screen, processor, ram, storage, camera, battery, price, battery_capacity, video_power, game_power, standby_power, browser_power)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       screen = VALUES(screen),
       processor = VALUES(processor),
       ram = VALUES(ram),
       storage = VALUES(storage),
       camera = VALUES(camera),
       battery = VALUES(battery),
       price = VALUES(price),
       battery_capacity = VALUES(battery_capacity),
       video_power = VALUES(video_power),
       game_power = VALUES(game_power),
       standby_power = VALUES(standby_power),
       browser_power = VALUES(browser_power)`,
      [phone.brand, phone.model, phone.screen, phone.processor, phone.ram, phone.storage, phone.camera, phone.battery, phone.price, phone.battery_capacity, phone.video_power || 0, phone.game_power || 0, phone.standby_power || 0, phone.browser_power || 0]
    );
    res.json({ success: true, message: '添加成功', insertId: result.insertId });
  } catch (error) {
    console.error('添加手机失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/phones/:id', async (req, res) => {
  try {
    const phone = req.body;
    await pool.query(
      `UPDATE phones SET 
       brand = ?, model = ?, screen = ?, processor = ?, ram = ?, storage = ?, 
       camera = ?, battery = ?, price = ?, battery_capacity = ?,
       video_power = ?, game_power = ?, standby_power = ?, browser_power = ?
       WHERE id = ?`,
      [phone.brand, phone.model, phone.screen, phone.processor, phone.ram, phone.storage, phone.camera, phone.battery, phone.price, phone.battery_capacity, phone.video_power || 0, phone.game_power || 0, phone.standby_power || 0, phone.browser_power || 0, req.params.id]
    );
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新手机失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/phones/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM phones WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除手机失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const upload = multer({ dest: 'uploads/' });

app.post('/api/phones/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传文件' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    let successCount = 0;
    let failCount = 0;

    for (const row of data) {
      try {
        await pool.query(
          `INSERT INTO phones (brand, model, screen, processor, ram, storage, camera, battery, price, battery_capacity, video_power, game_power, standby_power, browser_power)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           screen = VALUES(screen),
           processor = VALUES(processor),
           ram = VALUES(ram),
           storage = VALUES(storage),
           camera = VALUES(camera),
           battery = VALUES(battery),
           price = VALUES(price),
           battery_capacity = VALUES(battery_capacity),
           video_power = VALUES(video_power),
           game_power = VALUES(game_power),
           standby_power = VALUES(standby_power),
           browser_power = VALUES(browser_power)`,
          [
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
          ]
        );
        successCount++;
      } catch (err) {
        console.error('导入行失败:', err);
        failCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `导入完成，成功 ${successCount} 条，失败 ${failCount} 条`,
      successCount,
      failCount
    });
  } catch (error) {
    console.error('导入文件失败:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/template/download', (req, res) => {
  const templateData = [
    {
      '品牌': 'Apple',
      '型号': 'iPhone 15',
      '屏幕': '6.1英寸 OLED',
      '处理器': 'A16 仿生芯片',
      '内存': '6GB',
      '存储': '128GB',
      '摄像头': '4800万像素主摄',
      '电池': '4000mAh',
      '价格': '¥5999起',
      '电池容量': '4000',
      '视频播放功耗': 2500,
      '游戏功耗': 4500,
      '待机功耗': 50,
      '浏览网页功耗': 1800
    },
    {
      '品牌': 'Samsung',
      '型号': 'Galaxy S24',
      '屏幕': '6.2英寸 Dynamic AMOLED 2X',
      '处理器': 'Snapdragon 8 Gen 3',
      '内存': '8GB',
      '存储': '256GB',
      '摄像头': '5000万像素主摄 + 1200万像素超广角 + 1000万像素长焦',
      '电池': '4000mAh',
      '价格': '¥5999起',
      '电池容量': '4000',
      '视频播放功耗': 2800,
      '游戏功耗': 4800,
      '待机功耗': 60,
      '浏览网页功耗': 2000
    }
  ];

  const worksheet = xlsx.utils.json_to_sheet(templateData);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, '手机数据');

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Disposition', 'attachment; filename=phone_template.xlsx');
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

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`数据库服务已启动: http://localhost:${PORT}`);
      console.log('数据库配置:', dbConfig);
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    process.exit(1);
  }
}

startServer();
