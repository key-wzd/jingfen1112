<template>
  <div class="fullscreen-layout">
    <header class="top-navbar">
      <div class="navbar-inner">
        <button
          class="brand"
          aria-label="返回首页"
          @click="router.push('/home')"
        >
          <span class="brand-mark">TC</span>
          <span class="brand-copy">
            <strong>TechCompare</strong>
            <small>Internal power lab</small>
          </span>
        </button>

        <button
          class="menu-toggle"
          aria-label="展开或收起导航"
          :aria-expanded="mobileOpen"
          aria-controls="lab-navigation"
          @click="mobileOpen = !mobileOpen"
        >
          <span></span><span></span><span></span>
        </button>

        <nav
          id="lab-navigation"
          aria-label="主导航"
          class="navbar-center"
          :class="{ 'is-open': mobileOpen }"
        >
          <router-link
            to="/home"
            class="nav-item"
            :class="{ active: route.path === '/home' }"
            @click="mobileOpen = false"
          >
            <span class="nav-index">01</span>首页
          </router-link>
          <router-link
            to="/compare/phones"
            class="nav-item"
            :class="{ active: route.path.startsWith('/compare') }"
            @click="mobileOpen = false"
          >
            <span class="nav-index">02</span>参数对比
          </router-link>
          <router-link
            v-if="isAdmin"
            to="/config"
            class="nav-item"
            :class="{ active: route.path === '/config' }"
            @click="mobileOpen = false"
          >
            <span class="nav-index">03</span>数据管理
          </router-link>
          <router-link
            to="/power/phones"
            class="nav-item"
            :class="{ active: route.path.startsWith('/power') }"
            @click="mobileOpen = false"
            >功耗分析</router-link
          >
          <button class="mobile-logout" @click="handleLogout">退出登录</button>
        </nav>

        <div class="navbar-right">
          <div class="user-pill">
            <span class="user-avatar">{{ username.slice(0, 1) || 'T' }}</span>
            <span class="user-meta">
              <strong>{{ username || '访客' }}</strong>
              <small>{{ isAdmin ? '管理员' : '分析人员' }}</small>
            </span>
          </div>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { dbApi } from '#/api/db';

const router = useRouter();
const route = useRoute();

const username = computed(() => localStorage.getItem('tc_username') || '');
const userRole = computed(() => localStorage.getItem('tc_role') || '');
const isAdmin = computed(() => userRole.value === 'admin');
const mobileOpen = ref(false);

const handleLogout = async () => {
  await dbApi.logout();
  localStorage.removeItem('tc_token');
  localStorage.removeItem('tc_account_id');
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
  background: #f4f7fb;
  color: #152238;
}

.top-navbar {
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #e8edf5;
  box-shadow: 0 8px 30px rgba(31, 52, 84, 0.06);
  backdrop-filter: blur(18px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-inner {
  max-width: 1480px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  min-height: 76px;
  gap: 36px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #152238;
  cursor: pointer;
  text-align: left;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 9px 20px rgba(79, 70, 229, 0.25);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-copy strong {
  font-size: 15px;
  letter-spacing: -0.02em;
}

.brand-copy small {
  color: #91a0b5;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.navbar-center {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #6d7b91;
  font-size: 0.86rem;
  font-weight: 500;
  padding: 10px 14px;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  color: #3428b9;
  background: #f0efff;
}

.nav-index {
  color: #b4bfd0;
  font-size: 10px;
  font-weight: 700;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 9px;
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #e9e7ff;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 800;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-meta strong {
  color: #26344b;
  font-size: 12px;
}

.user-meta small {
  color: #9aa8b9;
  font-size: 10px;
}

.logout-btn {
  border: 1px solid #e1e7f0;
  padding: 9px 13px;
  border-radius: 10px;
  background: #fff;
  color: #718096;
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  border-color: #f0b5c1;
  color: #c23b55;
  background: #fff7f8;
}

.main-content {
  flex: 1;
}

.menu-toggle {
  display: none;
  margin-left: auto;
  padding: 8px;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.menu-toggle span {
  display: block;
  width: 22px;
  height: 2px;
  margin: 4px 0;
  border-radius: 10px;
  background: #4f46e5;
}

@media (max-width: 820px) {
  .navbar-inner {
    padding: 0 18px;
    gap: 12px;
  }
  .menu-toggle {
    display: block;
  }
  .navbar-center {
    display: none;
    position: absolute;
    top: 76px;
    left: 14px;
    right: 14px;
    padding: 10px;
    flex-direction: column;
    align-items: stretch;
    border: 1px solid #e8edf5;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 18px 45px rgba(31, 52, 84, 0.14);
  }
  .navbar-center.is-open {
    display: flex;
  }
  .nav-item {
    width: 100%;
  }
  .user-meta,
  .logout-btn {
    display: none;
  }
}

.mobile-logout {
  display: none;
}
@media (max-width: 820px) {
  .mobile-logout {
    display: block;
    padding: 12px;
    border: 0;
    background: #f5f6ff;
    color: #4038b5;
    border-radius: 9px;
    text-align: left;
  }
}
</style>
