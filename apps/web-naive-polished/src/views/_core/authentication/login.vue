<template>
  <div class="login-page">
    <div class="login-art">
      <div class="art-grid"></div>
      <div class="art-orb art-orb-one"></div>
      <div class="art-orb art-orb-two"></div>
      <div class="art-content">
        <div class="brand-line">
          <span class="brand-mark">TC</span><strong>TechCompare</strong>
        </div>
        <div class="art-copy">
          <span class="eyebrow">POWER INTELLIGENCE</span>
          <h1>测试数据，<br /><span>清晰呈现。</span></h1>
          <p>面向内部测试与研发人员的功耗数据可视化与场景对比工作台。</p>
        </div>
        <div class="art-footer">
          <span>01</span>
          <p>参数 · 场景 · 功耗</p>
          <span>2026</span>
        </div>
      </div>
    </div>
    <div class="login-panel">
      <div class="login-form-wrap">
        <div class="mobile-brand">
          <span class="brand-mark">TC</span><strong>TechCompare</strong>
        </div>
        <div class="form-heading">
          <span class="eyebrow">WELCOME BACK</span>
          <h2>登录你的工作台</h2>
          <p>登录后查看测试记录与功耗场景对比。</p>
        </div>
        <form @submit.prevent="handleLogin">
          <label class="form-group"
            ><span>用户名</span
            ><input
              v-model="username"
              type="text"
              placeholder="输入用户名"
              autocomplete="username"
          /></label>
          <label class="form-group"
            ><span>密码</span
            ><input
              v-model="password"
              type="password"
              placeholder="输入密码"
              autocomplete="current-password"
          /></label>
          <div v-if="errorMsg" class="error-msg">
            <span>!</span>{{ errorMsg }}
          </div>
          <button class="login-btn" :disabled="loading" type="submit">
            {{ loading ? '正在登录…' : '进入 TechCompare' }} <span>↗</span>
          </button>
        </form>
        <div v-if="isDevelopment" class="quick-login">
          <div class="quick-title"><span>本地调试账号</span><i></i></div>
          <button
            v-for="user in PRESET_USERS"
            :key="user.username"
            class="quick-btn"
            @click="handleQuickLogin(user)"
          >
            <span class="quick-avatar">{{ user.displayName.slice(0, 1) }}</span
            ><span
              ><strong>{{ user.displayName }}</strong
              ><small>{{ user.username }} / {{ user.password }}</small></span
            ><b>↗</b>
          </button>
        </div>
        <div v-if="isDevelopment" class="admin-hint">
          <span>管理员</span>
          <p>admin / admin123</p>
        </div>
      </div>
      <div class="login-legal">
        © {{ new Date().getFullYear() }} TechCompare
        <span>·</span> 内部功耗数据可视化平台
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { dbApi } from '#/api/db';

defineOptions({ name: 'Login' });
const isDevelopment = import.meta.env.DEV;
const router = useRouter();
const route = useRoute();
const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const PRESET_USERS = [
  {
    username: 'user',
    password: 'user123',
    role: 'user',
    displayName: '分析人员',
  },
];
const handleQuickLogin = (user: (typeof PRESET_USERS)[0]) => {
  username.value = user.username;
  password.value = user.password;
};
const handleLogin = async () => {
  if (loading.value) return;
  errorMsg.value = '';
  if (!username.value.trim() || !password.value) {
    errorMsg.value = '请输入账号和密码';
    return;
  }
  loading.value = true;
  try {
    const result = await dbApi.login(username.value.trim(), password.value);
    if (!result.success || !result.data) {
      errorMsg.value = result.message || '登录失败';
      return;
    }
    localStorage.setItem('tc_token', result.data.token);
    localStorage.setItem('tc_username', result.data.username);
    localStorage.setItem('tc_role', result.data.role);
    let target =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/home';
    try {
      target = decodeURIComponent(target);
    } catch {
      target = '/home';
    }
    if (
      !target.startsWith('/') ||
      target.startsWith('//') ||
      target.startsWith('/auth')
    )
      target = '/home';
    await router.replace(target);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 100vh;
  background: #f8f9fd;
  color: #19263d;
}
.login-art {
  position: relative;
  overflow: hidden;
  background: #111a35;
  color: #fff;
}
.art-grid {
  position: absolute;
  inset: 0;
  opacity: 0.24;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: 58px 58px;
  transform: perspective(420px) rotateX(58deg) scale(1.7) translateY(120px);
  transform-origin: center bottom;
}
.art-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  opacity: 0.7;
}
.art-orb-one {
  top: -150px;
  right: -110px;
  width: 430px;
  height: 430px;
  background: radial-gradient(circle, #514bc0, transparent 65%);
}
.art-orb-two {
  bottom: -210px;
  left: -130px;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, #273b89, transparent 66%);
}
.art-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 46px 56px;
}
.brand-line,
.mobile-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-line strong,
.mobile-brand strong {
  font-size: 15px;
  letter-spacing: -0.02em;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7774ef, #514bc0);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.06em;
  box-shadow: 0 9px 20px rgba(79, 70, 229, 0.3);
}
.art-copy {
  margin: auto 0;
}
.eyebrow {
  color: #929dff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2em;
}
.art-copy h1 {
  margin: 20px 0 17px;
  font-size: clamp(44px, 5.1vw, 72px);
  line-height: 0.98;
  letter-spacing: -0.07em;
}
.art-copy h1 span {
  color: #b2b8ff;
}
.art-copy p {
  max-width: 330px;
  margin: 0;
  color: #adb7d0;
  font-size: 14px;
  line-height: 1.8;
}
.art-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #8490ad;
  font-size: 10px;
}
.art-footer p {
  margin: 0;
  color: #aeb7ca;
  font-size: 11px;
}
.login-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 46px 12%;
  background: #fff;
}
.login-form-wrap {
  width: 100%;
  max-width: 390px;
  margin: auto;
}
.mobile-brand {
  display: none;
}
.form-heading {
  margin-bottom: 30px;
}
.form-heading h2 {
  margin: 12px 0 8px;
  color: #19263d;
  font-size: 30px;
  letter-spacing: -0.05em;
}
.form-heading p {
  margin: 0;
  color: #96a2b3;
  font-size: 12px;
}
.form-group {
  display: block;
  margin-bottom: 17px;
}
.form-group > span {
  display: block;
  margin-bottom: 8px;
  color: #5f6e83;
  font-size: 11px;
  font-weight: 800;
}
.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid #e1e7ef;
  border-radius: 11px;
  outline: 0;
  background: #fbfcfe;
  color: #24344d;
  font-size: 13px;
  transition: all 0.2s ease;
}
.form-group input::placeholder {
  color: #b5bfcb;
}
.form-group input:focus {
  border-color: #837df0;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
}
.error-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 15px;
  color: #bd3e57;
  font-size: 11px;
}
.error-msg span {
  display: grid;
  place-items: center;
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: #ffe1e6;
  font-size: 10px;
  font-weight: 800;
}
.login-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-radius: 11px;
  background: #4f46e5;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 22px rgba(79, 70, 229, 0.22);
  transition: all 0.2s ease;
}
.login-btn:hover:not(:disabled) {
  background: #3d35c4;
  transform: translateY(-2px);
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.login-btn span {
  font-size: 17px;
}
.quick-login {
  margin-top: 39px;
}
.quick-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 13px;
  color: #a6b0bf;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.quick-title i {
  flex: 1;
  height: 1px;
  background: #edf0f4;
}
.quick-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 8px;
  padding: 10px 11px;
  border: 1px solid #e9edf3;
  border-radius: 11px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}
.quick-btn:hover {
  border-color: #c9c6fb;
  background: #faf9ff;
}
.quick-avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: #f0efff;
  color: #4f46e5;
  font-size: 11px;
  font-weight: 800;
}
.quick-btn span:nth-child(2) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.quick-btn strong {
  color: #40516b;
  font-size: 11px;
}
.quick-btn small {
  color: #a2adbb;
  font-size: 9px;
}
.quick-btn b {
  color: #9a96e9;
  font-size: 16px;
}
.admin-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  color: #a3adba;
  font-size: 10px;
}
.admin-hint span {
  padding: 4px 7px;
  border-radius: 5px;
  background: #fff5e5;
  color: #b17a2e;
  font-weight: 800;
}
.admin-hint p {
  margin: 0;
}
.login-legal {
  color: #b1bbc8;
  font-size: 10px;
  text-align: center;
}
.login-legal span {
  margin: 0 5px;
  color: #d1d7e0;
}
@media (max-width: 780px) {
  .login-page {
    display: block;
  }
  .login-art {
    display: none;
  }
  .login-panel {
    min-height: 100vh;
    box-sizing: border-box;
    padding: 32px 24px 22px;
  }
  .login-form-wrap {
    max-width: 420px;
  }
  .mobile-brand {
    display: flex;
    margin-bottom: 65px;
  }
  .form-heading h2 {
    font-size: 28px;
  }
}

.art-copy h1 {
  font-size: clamp(36px, 4vw, 56px);
  line-height: 1.3;
  letter-spacing: -0.025em;
}
.form-heading p,
.form-group > span,
.quick-btn strong {
  font-size: 14px;
  color: #52637c;
}
</style>
