import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import path from 'path';

export default defineConfig({
  // The live deploy is the GitHub Pages domain. Switch this to https://mycosci.com
  // (and add public/CNAME) once the custom domain DNS is wired.
  site: 'https://mycosci.github.io',
  integrations: [
    mdx(),
    sitemap(),
    tailwind(),
  ],
  vite: {
    resolve: {
      alias: {
        // Redirect Starlight component imports to our replacements
        '@astrojs/starlight/components': path.resolve('./src/components/docs/index.ts'),
      },
    },
  },
});
