export interface DocsNavNode {
  title: string;
  slug: string;
  url?: string;
  children: DocsNavNode[];
}

interface DocEntry {
  slug: string;
  navSlug: string;
  segments: string[];
  title: string;
  isIndex: boolean;
}

interface NavOptions {
  baseHref?: string;
  filter?: (entry: DocEntry) => boolean;
}

interface TreeNode {
  name: string;
  slug: string;
  title?: string;
  url?: string;
  children: Map<string, TreeNode>;
}

const formatSegment = (segment: string) =>
  segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildEntry = (path: string, mod: any): DocEntry => {
  const slug = path.replace("../content/docs/", "").replace(/\.(md|mdx)$/, "");
  const segments = slug.split("/");
  const isIndex = segments[segments.length - 1] === "index";
  const navSegments = isIndex ? segments.slice(0, -1) : segments;
  const navSlug = navSegments.join("/");
  const title =
    mod.frontmatter?.title ??
    formatSegment(navSegments[navSegments.length - 1] ?? slug);
  return { slug, navSlug, segments: navSegments, title, isIndex };
};

const ensureNode = (root: TreeNode, segments: string[]): TreeNode => {
  let current = root;
  const slugParts: string[] = [];
  for (const segment of segments) {
    slugParts.push(segment);
    if (!current.children.has(segment)) {
      current.children.set(segment, {
        name: segment,
        slug: slugParts.join("/"),
        children: new Map(),
      });
    }
    current = current.children.get(segment)!;
  }
  return current;
};

const treeToNav = (node: TreeNode): DocsNavNode[] => {
  const children = Array.from(node.children.values()).sort((a, b) => {
    const titleA = a.title ?? formatSegment(a.name);
    const titleB = b.title ?? formatSegment(b.name);
    return titleA.localeCompare(titleB, undefined, { numeric: true });
  });
  return children.map((child) => ({
    title: child.title ?? formatSegment(child.name),
    slug: child.slug,
    url: child.url,
    children: treeToNav(child),
  }));
};

export function getDocsNav(options: NavOptions = {}): DocsNavNode[] {
  const pages = import.meta.glob("../content/docs/**/*.{md,mdx}", {
    eager: true,
  }) as Record<string, any>;

  const baseHref =
    options.baseHref ??
    (import.meta.env.STARLIGHT_ENABLED ? "/docs/" : "/mycopedia/");

  const root: TreeNode = { name: "", slug: "", children: new Map() };
  let rootPageTitle: string | undefined;
  let rootPageUrl: string | undefined = baseHref;

  const entries = Object.entries(pages).map(([path, mod]) =>
    buildEntry(path, mod),
  );

  for (const entry of entries) {
    if (options.filter && !options.filter(entry)) {
      continue;
    }

    if (entry.navSlug === "") {
      rootPageTitle = entry.title;
      continue;
    }

    const node = ensureNode(root, entry.segments);
    node.title = entry.title;
    if (entry.isIndex) {
      node.url = baseHref + (entry.navSlug ? `${entry.navSlug}/` : "");
    } else {
      node.url = baseHref + entry.slug;
    }
  }

  const navNodes = treeToNav(root);
  if (rootPageTitle) {
    navNodes.unshift({
      title: rootPageTitle,
      slug: "",
      url: rootPageUrl,
      children: [],
    });
  }

  return navNodes;
}
