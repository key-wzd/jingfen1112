import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createPlanFixture } from './plan-fixture.mjs';
import { createSqlPlanStore } from '../server/analysis-plans.js';
const f = await createPlanFixture(),
  checks = [];
const input = {
  name: '同名方案',
  category: 'phones',
  datasetVersion: 'test_dataset_v1',
  selectedIds: [1, 2],
  baselineId: 1,
  hiddenByRow: { 'row-0-0': [2] },
};
try {
  const a = await f.login(0),
    b = await f.login(1),
    admin = await f.login(2),
    admin2 = await f.login(3);
  assert.notEqual(a.accountId, b.accountId);
  assert.equal(a.username, b.username);
  checks.push('identity uses unique login account, not shared display name');
  assert.equal(
    (await f.request('/api/analysis-plans?category=phones')).status,
    401,
  );
  checks.push('unauthenticated plan access denied');
  const pa = await f.request('/api/analysis-plans', a.token, 'POST', input);
  const pb = await f.request('/api/analysis-plans', b.token, 'POST', input);
  const ps = await f.request('/api/analysis-plans', admin.token, 'POST', input);
  assert.equal(pa.status, 200);
  assert.equal(pb.status, 200);
  assert.equal(ps.status, 200);
  assert.equal(pa.data.visibility, 'private');
  assert.equal(ps.data.visibility, 'shared');
  assert.equal(new Set([pa.data.id, pb.data.id, ps.data.id]).size, 3);
  checks.push(
    'same-name plans are separate per account and admins publish shared scope',
  );
  for (const [viewer, own] of [
    [a, pa],
    [b, pb],
    [admin, null],
    [admin2, null],
  ]) {
    const result = await f.request(
      '/api/analysis-plans?category=phones',
      viewer.token,
    );
    const ids = result.data.plans.map((p) => p.id).sort();
    assert.deepEqual(ids, [ps.data.id, ...(own ? [own.data.id] : [])].sort());
  }
  checks.push(
    'each analyst sees own private plans and shared plans; admins cannot list others private plans',
  );
  for (const viewer of [b, admin, admin2]) {
    assert.equal(
      (await f.request('/api/analysis-plans/' + pa.data.id, viewer.token))
        .status,
      404,
    );
    assert.equal(
      (
        await f.request(
          '/api/analysis-plans/' + pa.data.id,
          viewer.token,
          'DELETE',
        )
      ).status,
      404,
    );
  }
  checks.push(
    'direct private-plan URL and delete attempts denied to other users including admins',
  );
  for (const viewer of [a, b]) {
    assert.equal(
      (await f.request('/api/analysis-plans/' + ps.data.id, viewer.token))
        .status,
      200,
    );
    assert.equal(
      (
        await f.request(
          '/api/analysis-plans/' + ps.data.id,
          viewer.token,
          'DELETE',
        )
      ).status,
      403,
    );
  }
  checks.push(
    'shared plans are readable by everyone and cannot be deleted by analysts',
  );
  for (const reserved of [
    { visibility: 'shared' },
    { ownerAccount: admin.accountId },
    { role: 'admin' },
    { scope: 'shared' },
  ]) {
    assert.equal(
      (
        await f.request('/api/analysis-plans', a.token, 'POST', {
          ...input,
          ...reserved,
        })
      ).status,
      403,
    );
  }
  checks.push(
    'client-supplied owner, role and sharing scope cannot elevate privileges',
  );
  assert.equal(
    (await f.request('/api/import-all', a.token, 'POST', {})).status,
    403,
  );
  checks.push('plan permission exception does not open import endpoints');
  const changed = await f.request('/api/analysis-plans', a.token, 'POST', {
    ...input,
    baselineId: 2,
  });
  assert.equal(changed.data.id, pa.data.id);
  assert.equal(changed.data.definition.baselineId, 2);
  assert.equal(
    (await f.request('/api/analysis-plans/' + pb.data.id, b.token)).data
      .definition.baselineId,
    1,
  );
  assert.equal(
    (await f.request('/api/analysis-plans/' + ps.data.id, admin.token)).data
      .definition.baselineId,
    1,
  );
  checks.push(
    'updating own named plan cannot overwrite same-name private/shared plans of other accounts',
  );
  assert.equal(
    (
      await f.request('/api/analysis-plans', a.token, 'POST', {
        ...input,
        baselineId: 999,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request('/api/analysis-plans', a.token, 'POST', {
        ...input,
        selectedIds: [999],
        baselineId: null,
        hiddenByRow: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await f.request('/api/analysis-plans', a.token, 'POST', {
        ...input,
        hiddenByRow: { 'row-0-0': [999] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request('/api/analysis-plans', a.token, 'POST', {
        ...input,
        datasetVersion: 'old',
      })
    ).status,
    409,
  );
  checks.push(
    'invalid records, baseline, hidden IDs and stale dataset versions are rejected',
  );
  const store2 = createSqlPlanStore(f.pool, f.table);
  await store2.init();
  const persisted = await store2.get(pa.data.id, {
    accountId: a.accountId,
    role: 'user',
  });
  assert.equal(persisted.definition.baselineId, 2);
  assert.deepEqual(
    persisted.definition.selectedRecords.map((p) => p.id),
    [1, 2],
  );
  checks.push(
    'SQL persistence survives repository reinitialization with complete view configuration',
  );
  assert.equal(
    (
      await f.request(
        '/api/analysis-plans/' + ps.data.id,
        admin2.token,
        'DELETE',
      )
    ).status,
    200,
  );
  assert.equal(
    (await f.request('/api/analysis-plans/' + ps.data.id, a.token)).status,
    404,
  );
  assert.equal(
    (await f.request('/api/analysis-plans/' + pa.data.id, a.token, 'DELETE'))
      .status,
    200,
  );
  checks.push(
    'administrator can remove shared plans and owners can remove own private plans',
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
  await fs.writeFile(
    'review/plans-20261021/api-results.json',
    JSON.stringify({ passed: checks.length, checks }, null, 2),
  );
} finally {
  await f.close();
}
