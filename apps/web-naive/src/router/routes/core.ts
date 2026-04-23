import type { RouteRecordRaw } from 'vue-router';
import { $t } from '#/locales';

const BasicLayout = () => import('#/layouts/fullscreen.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');

const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: { hideInBreadcrumb: true, hideInMenu: true, hideInTab: true, title: '404' },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

const coreRoutes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: { hideInBreadcrumb: true, title: 'Root' },
    name: 'Root',
    path: '/',
    redirect: '/home',
    children: [
      {
        name: 'Home',
        path: 'home',
        component: () => import('#/views/home/index.vue'),
        meta: { title: '首页' },
      },
      {
        name: 'Compare',
        path: 'compare/:category',
        component: () => import('#/views/compare/index.vue'),
        meta: { title: '参数对比' },
      },
      {
        name: 'PowerCompare',
        path: 'power/:category',
        component: () => import('#/views/power-compare/index.vue'),
        meta: { title: '功耗对比' },
      },
      {
        name: 'Config',
        path: 'config',
        component: () => import('#/views/config/index.vue'),
        meta: { title: '数据管理', roles: ['admin'] },
      },
    ],
  },
  {
    component: AuthPageLayout,
    meta: { hideInTab: true, title: 'Authentication' },
    name: 'Authentication',
    path: '/auth',
    redirect: '/auth/login',
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: { title: $t('page.auth.login') },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
