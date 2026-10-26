import fs from 'node:fs';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { installAuth } from '../server/auth.js';
import {
  createSqlPlanStore,
  installAnalysisPlanRoutes,
} from '../server/analysis-plans.js';
const require = createRequire(
  new URL('../server/package.json', import.meta.url),
);
const express = require('express');
const mysql = require('mysql2/promise');
export const testAccounts = [
  {
    username: 'plan-analyst-a',
    password: 'test-a-password',
    role: 'user',
    displayName: '分析人员',
  },
  {
    username: 'plan-analyst-b',
    password: 'test-b-password',
    role: 'user',
    displayName: '分析人员',
  },
  {
    username: 'plan-admin-a',
    password: 'test-admin-a-password',
    role: 'admin',
    displayName: '管理员 A',
  },
  {
    username: 'plan-admin-b',
    password: 'test-admin-b-password',
    role: 'admin',
    displayName: '管理员 B',
  },
];
export async function createPlanFixture() {
  const localEnv = new URL('../server/.env.local', import.meta.url);
  if (fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
  process.env.NODE_ENV = 'test';
  const database = process.env.TC_DB_NAME || 'techcompare_internal_copy';
  if (database === 'phone_compare' || !/^[a-zA-Z0-9_]+$/.test(database))
    throw new Error('Tests must use the isolated copy database.');
  const pool = mysql.createPool({
    host: process.env.TC_DB_HOST || 'localhost',
    port: Number(process.env.TC_DB_PORT || 3306),
    user: process.env.TC_DB_USER || 'root',
    password: process.env.TC_DB_PASSWORD || '',
    database,
  });
  const table = `analysis_plans_test_${process.pid}_${randomBytes(4).toString('hex')}`;
  const store = createSqlPlanStore(pool, table);
  await store.init();
  let version = 'test_dataset_v1';
  const records = [
    {
      id: 1,
      brand: '实验品牌',
      model: '同型号样机',
      usage: 0,
      idle: null,
      duration: 10,
    },
    {
      id: 2,
      brand: '实验品牌',
      model: '同型号样机',
      usage: 25,
      idle: 5,
      duration: 12,
    },
  ];
  const config = {
    key: 'phones',
    name: '旗舰手机',
    info: { fields: ['brand', 'model'], cnFields: ['品牌', '型号'] },
    power: {
      chartConfig: [
        {
          order: 1,
          scenario: '使用功耗',
          chartType: 'bar',
          fields: ['usage', 'idle'],
          labels: ['使用', '待机'],
          unit: 'mW',
        },
        {
          order: 2,
          scenario: '持续时间',
          chartType: 'line',
          fields: ['duration'],
          labels: ['持续时间'],
          unit: 'h',
        },
      ],
    },
  };
  const app = express();
  app.use(express.json());
  const auth = installAuth(app, { accounts: testAccounts });
  installAnalysisPlanRoutes(app, {
    store,
    getDataset: async (category, ids) =>
      category === 'phones'
        ? { version, records: records.filter((p) => ids.includes(p.id)) }
        : null,
  });
  app.get('/api/categories', (_req, res) =>
    res.json({ success: true, data: [config] }),
  );
  app.get('/api/phones/power', (_req, res) =>
    res.json({
      success: true,
      data: records,
      datasetVersion: version,
      headerRows: [],
    }),
  );
  app.get('/api/overview', (_req, res) =>
    res.json({
      success: true,
      data: {
        categories: [
          { key: 'phones', name: '旗舰手机', infoCount: 2, powerCount: 2 },
        ],
        infoCount: 2,
        powerCount: 2,
      },
    }),
  );
  app.post('/api/import-all', (_req, res) => res.json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  async function request(path, token, method = 'GET', body) {
    const response = await fetch(url + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, ...(await response.json()) };
  }
  async function login(index) {
    const account = testAccounts[index];
    return (
      await request('/api/auth/login', null, 'POST', {
        username: account.username,
        password: account.password,
      })
    ).data;
  }
  return {
    url,
    request,
    login,
    store,
    pool,
    table,
    setVersion: (value) => {
      version = value;
    },
    async close() {
      auth.dispose();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await pool.query(`DROP TABLE \`${table}\``);
      await pool.end();
    },
  };
}
