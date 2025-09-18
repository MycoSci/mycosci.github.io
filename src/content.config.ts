import { defineCollection, z } from "astro:content";
import { docsSchema } from "@astrojs/starlight/schema";

const docs = defineCollection({
  type: "content",
  schema: docsSchema({
    extend: z.object({
      author: z.string().optional(),
      pubDate: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
    }),
  }),
});

export const collections = { docs };
