import type { z } from "astro/zod";
import type {
  authorSchema,
  blogCategorySchema,
  blogPostSchema,
  blogSeriesSchema,
  socialMediaSchema,
} from "./schemas";

export type AuthorT = z.infer<typeof authorSchema>;
export type SocialMediaT = z.infer<typeof socialMediaSchema>;
export type BlogCategoryT = z.infer<typeof blogCategorySchema>;
export type BlogSeriesT = z.infer<typeof blogSeriesSchema>;
export type BlogPostT = z.infer<typeof blogPostSchema>;

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
