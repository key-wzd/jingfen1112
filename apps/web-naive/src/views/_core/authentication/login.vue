<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

defineOptions({ name: 'Login' });

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const PRESET_USERS = [
  { username: 'user', password: 'user123', role: 'user', displayName: '普通用户' },
];

const handleQuickLogin = (user: typeof PRESET_USERS[0]) => {
  username.value = user.username;
  password.value = user.password;
};

const handleLogin = async () => {
  errorMsg.value = '';

  if (!username.value || !password.value) {
    errorMsg.value = '请输入用户名和密码';
    return;
  }

  loading.value = true;

  try {
    const presetUser = PRESET_USERS.find(
      (u) => u.username === username.value && u.password === password.value,
    );

    if (presetUser) {
      localStorage.setItem('tc_token', `token_${Date.now()}`);
      localStorage.setItem('tc_username', presetUser.displayName);
      localStorage.setItem('tc_role', presetUser.role);

      const redirect = (route.query.redirect as string) || '/home';
      router.push(decodeURIComponent(redirect));
      return;
    }

    if (username.value === 'admin' && password.value === 'admin123') {
      localStorage.setItem('tc_token', `token_${Date.now()}`);
      localStorage.setItem('tc_username', '管理员');
      localStorage.setItem('tc_role', 'admin');

      const redirect = (route.query.redirect as string) || '/home';
      router.push(decodeURIComponent(redirect));
      return;
    }

    errorMsg.value = '用户名或密码错误';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1 class="login-title">TechCompare</h1>
        <p class="login-subtitle">电子产品功耗对比平台</p>
      </div>

      <div class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入用户名"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </div>

        <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

        <button class="login-btn" :disabled="loading" @click="handleLogin">
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <div class="quick-login">
          <p class="quick-title">快速登录</p>
          <button
            v-for="user in PRESET_USERS"
            :key="user.username"
            class="quick-btn"
            @click="handleQuickLogin(user)"
          >
            {{ user.displayName }} ({{ user.username }} / {{ user.password }})
          </button>
        </div>

        <div class="admin-hint">
          <p>管理员账号: admin / admin123</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 12px;
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin: 0 0 8px;
}

.login-subtitle {
  color: #999;
  font-size: 0.95rem;
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: border-color 0.3s;
  box-sizing: border-box;
  color: #333;
  background-color: #f5f5f5;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-msg {
  color: #dc3545;
  font-size: 0.85rem;
  margin-bottom: 16px;
  padding: 8px 12px;
  background-color: #f8d7da;
  border-radius: 4px;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.login-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-login {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.quick-title {
  font-size: 0.85rem;
  color: #999;
  margin: 0 0 12px;
  text-align: center;
}

.quick-btn {
  width: 100%;
  padding: 10px;
  background-color: #f0f2ff;
  color: #667eea;
  border: 1px solid #d5d9ff;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 8px;
}

.quick-btn:hover {
  background-color: #e0e4ff;
}

.admin-hint {
  margin-top: 16px;
  text-align: center;
}

.admin-hint p {
  font-size: 0.8rem;
  color: #bbb;
  margin: 0;
}
</style>
