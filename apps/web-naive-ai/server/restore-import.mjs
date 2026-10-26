import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const root = path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(root, '.env.local')))
  process.loadEnvFile(path.join(root, '.env.local'));
const name = process.argv[2];
if (!name || !/^import-[a-f0-9]+\.json$/.test(name))
  throw new Error('用法：node restore-import.mjs import-批次.json [--apply]');
const snapshot = JSON.parse(
  fs.readFileSync(path.join(root, 'backups', name), 'utf8'),
);
const database = process.env.TC_DB_NAME || 'techcompare_internal_copy';
if (database === 'phone_compare' || database !== snapshot.database)
  throw new Error('数据库不匹配，停止恢复。');
console.log('将恢复的品类：', snapshot.categories.join('、'));
console.log('恢复记录时间：', snapshot.createdAt);
if (!process.argv.includes('--apply')) {
  console.log('当前仅预览。确认恢复目标后，加 --apply 执行。');
  process.exit(0);
}
const connection = await mysql.createConnection({
  host: process.env.TC_DB_HOST || 'localhost',
  port: Number(process.env.TC_DB_PORT || 3306),
  user: process.env.TC_DB_USER || 'root',
  password: process.env.TC_DB_PASSWORD || '',
  database,
});
try {
  for (const row of snapshot.metadata.sheet_meta || []) {
    await connection.query(
      `SELECT 1 FROM ${mysql.escapeId(row.table_name)} LIMIT 1`,
    );
  }
  await connection.beginTransaction();
  for (const table of [
    'sheet_meta',
    'field_meta',
    'chart_config',
    'header_rows',
    'image_mapping',
  ]) {
    await connection.query(
      `DELETE FROM ${mysql.escapeId(table)} WHERE category_key IN (?)`,
      [snapshot.categories],
    );
    for (const original of snapshot.metadata[table] || []) {
      const row = { ...original };
      delete row.id;
      await connection.query(`INSERT INTO ${mysql.escapeId(table)} SET ?`, row);
    }
  }
  await connection.commit();
  console.log('已恢复元数据指向。新旧数据表均保留。');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
