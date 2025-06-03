export interface NavItem {
  url: string;
  title: string;
  depth: number;
}

export function getDocsNav(): NavItem[] {
  const pages = import.meta.glob('../content/docs/**/*.{md,mdx}', { eager: true }) as Record<string, any>;
  return Object.entries(pages)
    .map(([path, mod]) => {
      const slug = path
        .replace('../content/docs/', '')
        .replace(/\.(md|mdx)$/, '');
      const depth = slug.split('/').length - 1;
      const title = mod.frontmatter?.title ?? slug.split('/').pop();
      return { url: '/docs/' + slug, title, depth };
    })
    .sort((a, b) => a.url.localeCompare(b.url));
}
