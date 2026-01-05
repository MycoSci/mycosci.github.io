import { GraphQLClient, gql } from 'graphql-request';

// WordPress GraphQL endpoint
const endpoint = import.meta.env.WP_GRAPHQL_URL || 'http://localhost:8888/index.php?graphql';

const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ WOOCOMMERCE TYPES ============

export interface WPProduct {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: string;
  regularPrice: string;
  salePrice: string | null;
  onSale: boolean;
  image: {
    sourceUrl: string;
    altText: string;
  } | null;
  productCategories: {
    nodes: { name: string; slug: string }[];
  };
}

export interface WPProductCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
  description: string;
}

// ============ GENE SAMPLE TYPES ============

export interface GeneSample {
  id: string;
  title: string;
  sampleId: string;
  speciesName: string;
  storagePosition: string;
  viabilityStatus: string;
  collectionDate: string;
  sampleStatuses: {
    nodes: { name: string }[];
  };
  storageTypes: {
    nodes: { name: string }[];
  };
}

// Types
export interface WPPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  content: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText: string;
    };
  };
  author?: {
    node: {
      name: string;
      avatar?: {
        url: string;
      };
    };
  };
}

export interface WPPage {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface SiteSettings {
  title: string;
  description: string;
  url: string;
}

// Queries
export async function getSiteSettings(): Promise<SiteSettings> {
  const query = gql`
    query GetSiteSettings {
      generalSettings {
        title
        description
        url
      }
    }
  `;

  const data = await client.request<{ generalSettings: SiteSettings }>(query);
  return data.generalSettings;
}

export async function getPosts(first: number = 10): Promise<WPPost[]> {
  const query = gql`
    query GetPosts($first: Int!) {
      posts(first: $first, where: { status: PUBLISH }) {
        nodes {
          id
          title
          slug
          date
          excerpt
          content
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          author {
            node {
              name
              avatar {
                url
              }
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ posts: { nodes: WPPost[] } }>(query, { first });
  return data.posts.nodes;
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  const query = gql`
    query GetPostBySlug($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        id
        title
        slug
        date
        excerpt
        content
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        author {
          node {
            name
            avatar {
              url
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ post: WPPost | null }>(query, { slug });
  return data.post;
}

export async function getPages(): Promise<WPPage[]> {
  const query = gql`
    query GetPages {
      pages(where: { status: PUBLISH }) {
        nodes {
          id
          title
          slug
          content
        }
      }
    }
  `;

  const data = await client.request<{ pages: { nodes: WPPage[] } }>(query);
  return data.pages.nodes;
}

export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const query = gql`
    query GetPageBySlug($slug: ID!) {
      page(id: $slug, idType: URI) {
        id
        title
        slug
        content
      }
    }
  `;

  const data = await client.request<{ page: WPPage | null }>(query, { slug });
  return data.page;
}

// Health check
export async function checkConnection(): Promise<boolean> {
  try {
    await getSiteSettings();
    return true;
  } catch (error) {
    console.error('WordPress connection failed:', error);
    return false;
  }
}

// ============ WOOCOMMERCE QUERIES ============

export async function getProducts(first: number = 20): Promise<WPProduct[]> {
  const query = gql`
    query GetProducts($first: Int!) {
      products(first: $first, where: { status: "publish" }) {
        nodes {
          ... on SimpleProduct {
            id
            databaseId
            name
            slug
            description
            shortDescription
            price
            regularPrice
            salePrice
            onSale
            image {
              sourceUrl
              altText
            }
            productCategories {
              nodes {
                name
                slug
              }
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ products: { nodes: WPProduct[] } }>(query, { first });
  return data.products.nodes.filter(p => p !== null);
}

export async function getProductBySlug(slug: string): Promise<WPProduct | null> {
  const query = gql`
    query GetProduct($slug: ID!) {
      product(id: $slug, idType: SLUG) {
        ... on SimpleProduct {
          id
          databaseId
          name
          slug
          description
          shortDescription
          price
          regularPrice
          salePrice
          onSale
          image {
            sourceUrl
            altText
          }
          productCategories {
            nodes {
              name
              slug
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ product: WPProduct | null }>(query, { slug });
  return data.product;
}

export async function getProductsByCategory(categorySlug: string): Promise<WPProduct[]> {
  const query = gql`
    query GetProductsByCategory($category: String!) {
      products(where: { category: $category, status: "publish" }) {
        nodes {
          ... on SimpleProduct {
            id
            databaseId
            name
            slug
            description
            shortDescription
            price
            regularPrice
            salePrice
            onSale
            image {
              sourceUrl
              altText
            }
            productCategories {
              nodes {
                name
                slug
              }
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ products: { nodes: WPProduct[] } }>(query, { category: categorySlug });
  return data.products.nodes.filter(p => p !== null);
}

export async function getProductCategories(): Promise<WPProductCategory[]> {
  const query = gql`
    query GetProductCategories {
      productCategories(where: { hideEmpty: true }) {
        nodes {
          id
          name
          slug
          count
          description
        }
      }
    }
  `;

  const data = await client.request<{ productCategories: { nodes: WPProductCategory[] } }>(query);
  return data.productCategories.nodes;
}

// ============ GENE SAMPLE QUERIES ============

export async function getGeneSamples(first: number = 20): Promise<GeneSample[]> {
  const query = gql`
    query GetGeneSamples($first: Int!) {
      geneSamples(first: $first) {
        nodes {
          id
          title
          sampleId
          speciesName
          storagePosition
          viabilityStatus
          collectionDate
          sampleStatuses {
            nodes {
              name
            }
          }
          storageTypes {
            nodes {
              name
            }
          }
        }
      }
    }
  `;

  const data = await client.request<{ geneSamples: { nodes: GeneSample[] } }>(query, { first });
  return data.geneSamples.nodes;
}

export { client, gql };
