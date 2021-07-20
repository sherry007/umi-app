import { defineConfig } from 'umi';

const { InjectManifest } = require('workbox-webpack-plugin');
const manifestName = 'station-operator.webmanifest';

export default defineConfig({
  base: '/console/',
  publicPath: '/console/',
  hash: true,
  antd: {},
  dva: {
    hmr: true,
    immer: true,
    disableModelsReExport: true,
  },
  mfsu: {},
  webpack5: {},
  dynamicImport: {},
  nodeModulesTransform: {
    type: 'none',
  },
  routes: [
    { path: '/', component: '@/pages/index' },
  ],
  copy: [`/pwa/${manifestName}`],
  links: [{ rel: 'manifest', href: `/console/${manifestName}` }],
  chainWebpack(memo) {
    // service worker config
    memo.plugin('workbox').use(InjectManifest, [
      {
        swSrc: './pwa/service-worker.js',
        swDest: 'sw.js',
        exclude: [/\.map$/, /favicon\.ico$/, /^manifest.*\.js?$/],
      },
    ]);
  },
});
