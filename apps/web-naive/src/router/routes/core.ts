import type { RouteRecordRaw } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';

import { $t } from '#/locales';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');
/** 全局404页面 */
const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

/** 基本路由，这些路由是必须存在的 */
const coreRoutes: RouteRecordRaw[] = [
  /**
   * 根路由
   * 使用基础布局，作为所有页面的父级容器，子级就不必配置BasicLayout。
   * 此路由必须存在，且不应修改
   */
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    redirect: '',
    children: [
      {
        name: 'Home',
        path: '',
        component: () => import('#/views/home/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '首页',
        },
      },
      {
        name: 'Compare',
        path: 'compare',
        component: () => import('#/views/compare/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '产品对比',
        },
      },
      {
        name: 'PowerConsumption',
        path: 'power-consumption',
        component: () => import('#/views/power-consumption/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '旗舰手机功耗对比',
        },
      },
      {
        name: 'MidLowPhonePower',
        path: 'mid-low-phone-power',
        component: () => import('#/views/mid-low-phone-power/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '中低端手机功耗对比',
        },
      },
      {
        name: 'MousePower',
        path: 'mouse-power',
        component: () => import('#/views/mouse-power/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '鼠标功耗对比',
        },
      },
      {
        name: 'KeyboardPower',
        path: 'keyboard-power',
        component: () => import('#/views/keyboard-power/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '键盘功耗对比',
        },
      },
      {
        name: 'RemoteControlPower',
        path: 'remote-control-power',
        component: () => import('#/views/remote-control-power/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '遥控器功耗对比',
        },
      },
      {
        name: 'Config',
        path: 'config',
        component: () => import('#/views/config/index.vue'),
        meta: {
          ignoreAccess: true,
          title: '数据管理',
        },
      },
    ],
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: {
          title: $t('page.auth.login'),
        },
      },
      {
        name: 'CodeLogin',
        path: 'code-login',
        component: () => import('#/views/_core/authentication/code-login.vue'),
        meta: {
          title: $t('page.auth.codeLogin'),
        },
      },
      {
        name: 'QrCodeLogin',
        path: 'qrcode-login',
        component: () =>
          import('#/views/_core/authentication/qrcode-login.vue'),
        meta: {
          title: $t('page.auth.qrCodeLogin'),
        },
      },
      {
        name: 'ForgetPassword',
        path: 'forget-password',
        component: () =>
          import('#/views/_core/authentication/forget-password.vue'),
        meta: {
          title: $t('page.auth.forgetPassword'),
        },
      },
      {
        name: 'Register',
        path: 'register',
        component: () => import('#/views/_core/authentication/register.vue'),
        meta: {
          title: $t('page.auth.register'),
        },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
