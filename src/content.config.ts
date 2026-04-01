import type { SveltiaLoader } from "astro-loader-sveltia-cms/schema";
import type { ZodObject } from "astro/zod";
import { defineCollection } from "astro:content";
import {
  authorsCollection,
  blogPostsCollection,
  type CollectionDefinition,
  type CollectionName,
  featuredPostsCollection,
  getAllCollectionSchemas,
  licensesCollection,
  seriesCollection,
  tagsCollection,
  templateBlocksCollection,
} from "~cfg";

const sveltiaCollections = await getAllCollectionSchemas([
  authorsCollection,
  licensesCollection,
  seriesCollection,
  tagsCollection,
  featuredPostsCollection,
  blogPostsCollection,
  templateBlocksCollection,
]);

export const definedCollections: {
  [key in CollectionName]: {
    CollectionConfig: { loader: SveltiaLoader<T>; schema: ZodObject<T> };
  };
} = Object.fromEntries(
  Object.entries(sveltiaCollections).map(([key, value]) => [
    key,
    defineCollection({
      loader: value.load(),
      schema: value.schema,
    }),
  ]),
);

export const collections = { ...definedCollections } as {
  [key in CollectionName]: CollectionDefinition;
};
