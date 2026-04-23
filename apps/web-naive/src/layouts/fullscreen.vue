<template>
  <div class="fullscreen-layout">
    <header class="top-navbar">
      <div class="navbar-inner">
        <div class="navbar-left">
          <h1 class="logo" @click="router.push('/home')">TechCompare</h1>
        </div>
        <nav class="navbar-center">
          <router-link to="/home" class="nav-item" :class="{ active: route.path === '/home' }">首页</router-link>
          <router-link to="/compare/phones" class="nav-item" :class="{ active: route.path.startsWith('/compare') }">参数对比</router-link>
          <router-link v-if="isAdmin" to="/config" class="nav-item" :class="{ active: route.path === '/config' }">数据管理</router-link>
        </nav>
        <div class="navbar-right">
          <span class="user-info">{{ username }}</span>
          <span class="user-role" :class="isAdmin ? 'role-admin' : 'role-user'">{{ isAdmin ? '管理员' : '用户' }}</span>
          <button class="logout-btn" @click="handleLogout">退出</button>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const username = computed(() => localStorage.getItem('tc_username') || '');
const userRole = computed(() => localStorage.getItem('tc_role') || '');
const isAdmin = computed(() => userRole.value === 'admin');

const handleLogout = () => {
  localStorage.removeItem('tc_token');
  localStorage.removeItem('tc_username');
  localStorage.removeItem('tc_role');
  router.push('/auth/login');
};
</script>

<style scoped>
.fullscreen-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.top-navbar {
  background-color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
}

.navbar-left .logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin: 0;
  cursor: pointer;
  user-select: none;
}

.navbar-center {
  display: flex;
  gap: 32px;
}

.nav-item {
  text-decoration: none;
  color: #666;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 6px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.nav-item:hover,
.nav-item.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  font-size: 0.9rem;
  color: #333;
  font-weight: 500;
}

.user-role {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.role-admin {
  background-color: #fff3e0;
  color: #e65100;
}

.role-user {
  background-color: #e3f2fd;
  color: #1565c0;
}

.logout-btn {
  background: none;
  border: 1px solid #ddd;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #666;
  transition: all 0.3s;
}

.logout-btn:hover {
  border-color: #dc3545;
  color: #dc3545;
}

.main-content {
  flex: 1;
}
</style>
