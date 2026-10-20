import { defineConfig } from '@vben/vite-config';
import { fileURLToPath } from 'node:url';

export default defineConfig(async () => ({
  application: {},
  vite: {
    resolve: {
      // Use workspace source; postinstall creates Node-only jiti stubs in shared/dist.
      alias: Object.fromEntries(
        ['constants', 'utils', 'color', 'cache', 'store', 'global-state'].map(
          (name) => [
            `@vben-core/shared/${name}`,
            fileURLToPath(
              new URL(
                `../../packages/@core/base/shared/src/${['store', 'global-state'].includes(name) ? name + '.ts' : name + '/index.ts'}`,
                import.meta.url,
              ),
            ),
          ],
        ),
      ),
    },
    server: {
      watch: {
        ignored: ['**/review/**', '**/server/**', '**/graphify-out/**'],
      },
      host: '127.0.0.1',
      port: 5890,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:3002', changeOrigin: true },
        '/uploads': { target: 'http://127.0.0.1:3002', changeOrigin: true },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 5891,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:3002', changeOrigin: true },
        '/uploads': { target: 'http://127.0.0.1:3002', changeOrigin: true },
      },
    },
  },
}));
