import type {
  InferCollectionOutput,
  authorsCollection,
  blogPostsCollection,
  seriesCollection,
} from "~cfg";

// ─── Inferred from CMS field definitions (single source of truth) ───

export type AuthorT = InferCollectionOutput<typeof authorsCollection>;
export type BlogPostT = InferCollectionOutput<typeof blogPostsCollection>;
export type BlogSeriesT = InferCollectionOutput<typeof seriesCollection>;
export type SocialMediaT = NonNullable<AuthorT["social_links"]>;
export type BlogCategoryT = BlogPostT["category"];

// ─── Entry wrappers (match Astro's getCollection return shape) ───

export type BlogPostEntryT = {
  id: string;
  slug: string;
  body: string;
  data: BlogPostT;
};

export type AuthorEntryT = {
  id: string;
  slug: string;
  body: string;
  data: AuthorT;
};
