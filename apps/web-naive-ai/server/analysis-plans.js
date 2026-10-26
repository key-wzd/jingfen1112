import { randomUUID } from 'node:crypto';

const ID_PATTERN = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const forbiddenFields = [
  'owner',
  'ownerId',
  'ownerAccount',
  'visibility',
  'scope',
  'role',
  'createdBy',
];
function badRequest(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export function validatePlanInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw badRequest('方案格式不正确。');
  if (forbiddenFields.some((key) => Object.hasOwn(body, key)))
    throw badRequest('方案归属与共享范围由登录身份决定。', 403);
  const {
    name,
    category,
    selectedIds,
    baselineId = null,
    hiddenByRow = {},
    datasetVersion,
  } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    throw badRequest('方案名称需要为 1–80 个字符。');
  if (
    typeof category !== 'string' ||
    !category ||
    category.length > 100 ||
    !/^[\p{L}\p{N}_-]+$/u.test(category)
  )
    throw badRequest('测试品类不正确。');
  if (
    typeof datasetVersion !== 'string' ||
    !datasetVersion ||
    datasetVersion.length > 200
  )
    throw badRequest('缺少有效的数据版本，请刷新测试数据。');
  if (
    !Array.isArray(selectedIds) ||
    !selectedIds.length ||
    selectedIds.length > 200 ||
    selectedIds.some((id) => !Number.isSafeInteger(id) || id < 1)
  )
    throw badRequest('请选择 1–200 条有效测试记录。');
  const ids = [...new Set(selectedIds)];
  if (
    baselineId !== null &&
    (!Number.isSafeInteger(baselineId) || !ids.includes(baselineId))
  )
    throw badRequest('基准对象必须在选中的记录中。');
  if (
    !hiddenByRow ||
    typeof hiddenByRow !== 'object' ||
    Array.isArray(hiddenByRow) ||
    Object.keys(hiddenByRow).length > 500
  )
    throw badRequest('图例状态格式不正确。');
  const hidden = Object.create(null);
  for (const [row, values] of Object.entries(hiddenByRow)) {
    if (
      !/^row-\d{1,6}-\d{1,6}$/.test(row) ||
      !Array.isArray(values) ||
      values.length > 200 ||
      values.some((id) => !ids.includes(id))
    )
      throw badRequest('图例状态包含无效记录。');
    hidden[row] = [...new Set(values)];
  }
  return {
    name: name.trim(),
    category,
    datasetVersion,
    selectedIds: ids,
    baselineId,
    hiddenByRow: hidden,
  };
}

export function canReadPlan(plan, account) {
  return (
    plan.visibility === 'shared' || plan.ownerAccount === account.accountId
  );
}
export function canManagePlan(plan, account) {
  return (
    plan.ownerAccount === account.accountId ||
    (plan.visibility === 'shared' && account.role === 'admin')
  );
}
function serializePlan(row, account) {
  const definition =
    typeof row.definition === 'string'
      ? JSON.parse(row.definition)
      : row.definition;
  return {
    id: row.id,
    name: row.plan_name,
    category: row.category_key,
    ownerAccount: row.owner_account,
    ownerName: row.owner_name,
    visibility: row.visibility,
    definition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canManage: canManagePlan(
      { ownerAccount: row.owner_account, visibility: row.visibility },
      account,
    ),
  };
}
export function createSqlPlanStore(pool, tableName = 'analysis_plans') {
  if (!/^analysis_plans(?:_test_[a-z0-9_]+)?$/.test(tableName))
    throw new Error('Invalid plan table.');
  const table = '`' + tableName + '`';
  return {
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS ${table} (
        id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
        owner_account VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        visibility ENUM('private','shared') NOT NULL,
        category_key VARCHAR(100) COLLATE utf8mb4_bin NOT NULL,
        plan_name VARCHAR(80) COLLATE utf8mb4_bin NOT NULL,
        definition JSON NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY owner_category_name (owner_account,category_key,plan_name),
        KEY visibility_category (visibility,category_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    },
    async list(category, account) {
      const [rows] = await pool.query(
        `SELECT * FROM ${table} WHERE category_key = ? AND (visibility = 'shared' OR owner_account = ?) ORDER BY updated_at DESC, id DESC`,
        [category, account.accountId],
      );
      return rows.map((row) => serializePlan(row, account));
    },
    async get(id, account) {
      const [rows] = await pool.query(
        `SELECT * FROM ${table} WHERE id = ? AND (visibility = 'shared' OR owner_account = ?)`,
        [id, account.accountId],
      );
      return rows[0] ? serializePlan(rows[0], account) : null;
    },
    async save(plan, account) {
      const id = randomUUID();
      const visibility = account.role === 'admin' ? 'shared' : 'private';
      await pool.query(
        `INSERT INTO ${table} (id,owner_account,owner_name,visibility,category_key,plan_name,definition)
        VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE owner_name=VALUES(owner_name),visibility=VALUES(visibility),definition=VALUES(definition),updated_at=CURRENT_TIMESTAMP(3)`,
        [
          id,
          account.accountId,
          account.username,
          visibility,
          plan.category,
          plan.name,
          JSON.stringify(plan.definition),
        ],
      );
      const [rows] = await pool.query(
        `SELECT * FROM ${table} WHERE owner_account=? AND category_key=? AND plan_name=?`,
        [account.accountId, plan.category, plan.name],
      );
      return serializePlan(rows[0], account);
    },
    async remove(id, account) {
      const [result] = await pool.query(
        `DELETE FROM ${table} WHERE id=? AND (owner_account=? OR (visibility='shared' AND ?='admin'))`,
        [id, account.accountId, account.role],
      );
      return result.affectedRows > 0;
    },
  };
}
export function installAnalysisPlanRoutes(app, { store, getDataset }) {
  const route = (handler) => async (req, res) => {
    if (!req.session?.accountId)
      return res
        .status(401)
        .json({ success: false, message: '登录信息已更新，请重新登录。' });
    try {
      await handler(req, res);
    } catch (error) {
      if (!error.status)
        console.error(
          'Analysis plan request failed:',
          error.code || error.name,
        );
      res
        .status(error.status || 500)
        .json({
          success: false,
          message: error.status
            ? error.message
            : '方案服务暂时不可用，请稍后重试。',
        });
    }
  };
  app.get(
    '/api/analysis-plans',
    route(async (req, res) => {
      const category = req.query.category;
      if (typeof category !== 'string' || !category || category.length > 100)
        throw badRequest('请选择测试品类。');
      const plans = await store.list(category, req.session);
      res.json({
        success: true,
        data: {
          plans,
          viewer: {
            accountId: req.session.accountId,
            displayName: req.session.username,
            role: req.session.role,
          },
        },
      });
    }),
  );
  app.get(
    '/api/analysis-plans/:id',
    route(async (req, res) => {
      if (!ID_PATTERN.test(req.params.id))
        throw badRequest('方案不存在或无权访问。', 404);
      const plan = await store.get(req.params.id, req.session);
      if (!plan) throw badRequest('方案不存在或无权访问。', 404);
      res.json({ success: true, data: plan });
    }),
  );
  app.post(
    '/api/analysis-plans',
    route(async (req, res) => {
      const input = validatePlanInput(req.body);
      const dataset = await getDataset(input.category, input.selectedIds);
      if (!dataset) throw badRequest('该品类暂无功耗数据。', 404);
      if (dataset.version !== input.datasetVersion)
        throw badRequest('测试数据版本已变化，请刷新数据后重新保存方案。', 409);
      const records = input.selectedIds.map((id) =>
        dataset.records.find((record) => record.id === id),
      );
      if (records.some((record) => !record))
        throw badRequest('部分测试记录已不存在，请刷新后重新选择。', 409);
      const plan = await store.save(
        {
          category: input.category,
          name: input.name,
          definition: {
            schemaVersion: 1,
            datasetVersion: dataset.version,
            selectedRecords: records.map(({ id, brand, model }) => ({
              id,
              brand,
              model,
            })),
            baselineId: input.baselineId,
            hiddenByRow: input.hiddenByRow,
          },
        },
        req.session,
      );
      res.json({
        success: true,
        data: plan,
        message:
          plan.visibility === 'shared'
            ? '共享方案已保存，全员可见。'
            : '个人方案已保存，仅当前账号可见。',
      });
    }),
  );
  app.delete(
    '/api/analysis-plans/:id',
    route(async (req, res) => {
      if (!ID_PATTERN.test(req.params.id))
        throw badRequest('方案不存在或无权访问。', 404);
      const plan = await store.get(req.params.id, req.session);
      if (!plan) throw badRequest('方案不存在或无权访问。', 404);
      if (!canManagePlan(plan, req.session))
        throw badRequest('共享方案仅管理员可删除。', 403);
      if (!(await store.remove(req.params.id, req.session)))
        throw badRequest('方案不存在或权限已变化。', 404);
      res.json({ success: true, message: '方案已删除。' });
    }),
  );
}
