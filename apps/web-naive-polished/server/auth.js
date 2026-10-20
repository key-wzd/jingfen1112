import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function installAuth(app) {
  const production = process.env.NODE_ENV === 'production';
  if (
    production &&
    (!process.env.TC_ADMIN_PASSWORD || !process.env.TC_ANALYST_PASSWORD)
  ) {
    throw new Error(
      '生产环境需要配置 TC_ADMIN_PASSWORD 和 TC_ANALYST_PASSWORD。',
    );
  }
  const salt = randomBytes(16);
  const accounts = [
    {
      username: process.env.TC_ADMIN_USER || 'admin',
      password: process.env.TC_ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      displayName: '管理员',
    },
    {
      username: process.env.TC_ANALYST_USER || 'user',
      password: process.env.TC_ANALYST_PASSWORD || 'user123',
      role: 'user',
      displayName: '分析人员',
    },
  ].map(({ password, ...account }) => ({
    ...account,
    hash: scryptSync(password, salt, 32),
  }));
  const dummyHash = scryptSync(randomBytes(32), salt, 32);
  const sessions = new Map();
  const attempts = new Map();
  const sweep = setInterval(() => {
    for (const [token, value] of sessions)
      if (value.expires <= Date.now()) sessions.delete(token);
    for (const [ip, value] of attempts)
      if (value.until <= Date.now()) attempts.delete(ip);
  }, 60_000);
  sweep.unref();

  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip;
    const bucket = attempts.get(ip);
    if (bucket && bucket.until > Date.now() && bucket.count >= 20)
      return res
        .status(429)
        .json({ success: false, message: '尝试次数过多，请稍后再试。' });
    const { username, password } = req.body || {};
    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      username.length > 100 ||
      password.length > 256
    ) {
      return res
        .status(400)
        .json({ success: false, message: '请输入有效的账号与密码。' });
    }
    const account = accounts.find((item) => item.username === username);
    const valid = timingSafeEqual(
      scryptSync(password, salt, 32),
      account?.hash || dummyHash,
    );
    if (!valid || !account) {
      attempts.set(ip, {
        count: (bucket && bucket.until > Date.now() ? bucket.count : 0) + 1,
        until: Date.now() + 300_000,
      });
      return res
        .status(401)
        .json({ success: false, message: '用户名或密码错误。' });
    }
    attempts.delete(ip);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, {
      role: account.role,
      username: account.displayName,
      expires: Date.now() + 8 * 60 * 60 * 1000,
    });
    res.json({
      success: true,
      data: { token, role: account.role, username: account.displayName },
    });
  });
  app.use('/api', (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const session = token && sessions.get(token);
    if (!session || session.expires <= Date.now()) {
      return res
        .status(401)
        .json({ success: false, message: '登录已过期，请重新登录。' });
    }
    req.session = session;
    req.sessionToken = token;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.path !== '/auth/logout' &&
      session.role !== 'admin'
    ) {
      return res
        .status(403)
        .json({ success: false, message: '此操作需要管理员权限。' });
    }
    next();
  });
  app.post('/api/auth/logout', (req, res) => {
    sessions.delete(req.sessionToken);
    res.json({ success: true });
  });
}
