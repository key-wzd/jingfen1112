import type { Router } from 'vue-router';

import { preferences } from '@vben/preferences';
import { startProgress, stopProgress } from '@vben/utils';

const LOGIN_PATH = '/auth/login';

function setupCommonGuard(router: Router) {
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    loadedPaths.add(to.path);
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    if (to.path.startsWith('/auth') || to.name === 'Authentication') {
      const token = localStorage.getItem('tc_token');
      if (to.path === LOGIN_PATH && token) {
        return '/home';
      }
      return true;
    }

    const token = localStorage.getItem('tc_token');
    if (!token) {
      return {
        path: LOGIN_PATH,
        query: to.fullPath !== '/home' ? { redirect: encodeURIComponent(to.fullPath) } : {},
        replace: true,
      };
    }

    const userRole = localStorage.getItem('tc_role') || 'user';
    const requiredRoles = to.meta.roles as string[] | undefined;
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return '/home';
    }

    return true;
  });
}

function createRouterGuard(router: Router) {
  setupCommonGuard(router);
  setupAccessGuard(router);
}

export { createRouterGuard };
