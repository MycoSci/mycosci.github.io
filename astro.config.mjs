// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://mycosci.com',
  integrations: [mdx()],
  vite: {
    resolve: {
      alias: {
        '@astrojs/starlight/components': './src/components/starlight/index.ts',
      },
    },
  },
});
