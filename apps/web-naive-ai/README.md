# TechCompare AI Lab

TechCompare AI Lab 是 `web-naive-polished` 的独立二次开发副本，定位为“证据链驱动的 AI 智能分析平台”。它保留原有参数对比、功耗分析、Excel 导入和方案权限能力，并增加 AI 智能分析、数据质量摘要、异常检测、导入批次登记和只读分析助手。

## 启动

```powershell
cd D:\myproject\jingfen1112\apps\web-naive-ai
pnpm start
```

- 前端：`http://localhost:5892`
- API：`http://localhost:3004`
- 数据库：`techcompare_internal_ai`

副本使用独立数据库，不会读取或修改 `web-naive`、`web-naive-polished` 的业务数据库。首次启动会从 `public/gh.xlsx` 初始化测试数据。

默认开发账号：

- 管理员：`admin / admin123`
- 分析人员：`user / user123`

生产环境请在 `server/.env.local` 或部署环境中设置真实账号密码，不要使用默认密码。

## 新增功能

- `/lab` AI智能分析：展示整体数据质量、缺测数量、异常记录和最近导入批次。
- 数据质量评分：按当前功耗数据的缺测率和重复记录给出可解释评分。
- 异常复核队列：使用 IQR 规则标出明显离群测量；样本不足时不强行判定。
- 数据批次登记：导入成功后记录文件名、文件哈希、品类、记录数和导入时间。
- 只读分析助手：使用服务端确定性功耗计算，并可由 `glm-5.3-flash` 组织自然语言回答；模型不拥有写入权限。GLM 配置只放在被忽略的 `server/.env.local` 中。
- 当前 GLM Key 使用 Coding Plan 接口：`https://open.bigmodel.cn/api/coding/paas/v4`。
- 原有功耗分析方案继续按账号隔离，管理员方案可共享。

## 验证

```powershell
pnpm typecheck
pnpm build
node --test tests/measurements.test.mjs
```

完整接口和浏览器测试需要启动副本 API 与前端，并且只允许使用 `techcompare_internal_ai` 数据库。

## 后续路线

下一阶段可以继续加入测试批次的固件、环境、仪器和操作者信息；随后增加可复核评审报告、性能/功耗归一化、评论与审批流，以及连接受控数据工具的真实模型服务。模型只负责解释，数值计算和权限判断仍由服务端完成。
