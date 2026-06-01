import { defineCollection, z } from "astro:content";
import { glob } from 'astro/loaders';

// Schema for mushroom species documentation (existing MDX content)
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
    // Taxonomy fields
    kingdom: z.string().optional(),
    phylum: z.string().optional(),
    class: z.string().optional(),
    order: z.string().optional(),
    family: z.string().optional(),
    genus: z.string().optional(),
    species: z.string().optional(),
    // Common fields
    commonName: z.string().optional(),
    edibility: z.enum(['edible', 'inedible', 'toxic', 'psychoactive', 'unknown']).optional(),
    habitat: z.string().optional(),
    distribution: z.string().optional(),
  }),
});

export const collections = { docs };
