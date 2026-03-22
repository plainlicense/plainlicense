import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";
import { defineCollection } from "astro:content";

// License collection schema
const licensesCollection = defineCollection({
  loader: sveltiaLoader("licenses"),
});

const authorsCollection = defineCollection({
  loader: sveltiaLoader("authors"),
});

// Template Block collection schema
const templateBlocksCollection = defineCollection({
  loader: sveltiaLoader("template-blocks"),
});

const blogPosts = defineCollection({
  loader: sveltiaLoader("blog-posts"),
});

// Export collections
export const collections = {
  licenses: licensesCollection,
  authors: authorsCollection,
  "template-blocks": templateBlocksCollection,
  "blog-posts": blogPosts,
};
