import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import path from 'path';

export default defineConfig({
  site: 'https://mycosci.com',
  integrations: [
    mdx(),
    tailwind(),
  ],
  vite: {
    ssr: {
      noExternal: ['graphql-request'],
    },
    resolve: {
      alias: {
        // Redirect Starlight component imports to our replacements
        '@astrojs/starlight/components': path.resolve('./src/components/docs/index.ts'),
      },
    },
  },
});
