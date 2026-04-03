/** biome-ignore-all lint/suspicious/noExplicitAny: <The types are truly 'any'> */
import type { Field } from "@sveltia/cms";
import type { SveltiaOptions } from "astro-loader-sveltia-cms";
import {
  sveltiaLoader,
  type SveltiaEntryCollection,
} from "astro-loader-sveltia-cms/loader";
import { z } from "astro/zod";
import { authorsCollection } from "./authors";
import {
  blogPostsCollection,
  featuredPostsCollection,
  seriesCollection,
  tagsCollection,
} from "./blogPosts";
import type { InferCollectionOutput } from "./field-inference";
import { licensesCollection } from "./licenses";
import { pagesCollection } from "./pages";
import { templateBlocksCollection } from "./template_blocks";
import type { CollectionEntry } from "./utils";
import {
  type BuildCollectionSchemaResult,
  buildCollectionSchema,
} from "./utils";

export const cmsConfig: SveltiaOptions = {
  title: "Plain License CMS",
  route: "/",
  config: {
    publish_mode: "editorial_workflow",
    backend: {
      name: "github",
      repo: "plainlicense/plainlicense",
      branch: "main",
      base_url: "https://auth.plainlicense.org",
    },
    collections: [
      authorsCollection,
      licensesCollection,
      seriesCollection,
      tagsCollection,
      featuredPostsCollection,
      blogPostsCollection,
      templateBlocksCollection,
      pagesCollection,
    ],
    app_title: "Plain License CMS",
    site_url: "https://plainlicense.org",
    logout_redirect_url: "https://plainlicense.org",
    logo: {
      src: "/src/assets/images/logo_named.svg",
      show_in_header: true,
    },
    media_folder: "images/",
    media_libraries: {
      cloudflare_r2: {
        access_key_id: "2af46c19f417f0b062f540805412da84",
        bucket: "plainlicense-cms",
        account_id: "1bb2d128ac96f8ee9dc75e99a54e9260",
        prefix: "uploads/",
        public_url: "https://media.plainlicense.org/",
      },
    },
    editor: {
      preview: true,
    },
    issue_reports: {
      url: "https://github.com/plainlicense/plainlicense/issues",
    },
  },
};

/**
 * Build a Zod schema for a Sveltia CMS collection with inferred output types.
 *
 * @param collection The sveltia collection to build a Zod schema for.
 * @returns The Zod schema and TypeScript type string for the collection.
 */
async function getCollectionSchema<
  const C extends { fields: readonly Field[] },
>(collection: C): Promise<BuildCollectionSchemaResult<C>> {
  return (await buildCollectionSchema(
    collection as unknown as CollectionEntry,
  )) as BuildCollectionSchemaResult<C>;
}

interface CollectionDefinition<
  C extends { fields: readonly Field[] } = { fields: Field[] },
> {
  types: string;
  schema: BuildCollectionSchemaResult<C>["schema"];
  jsonSchema: string;
  collection: C;
  load: () => ReturnType<typeof sveltiaLoader>;
}

async function getCollectionDefinitions<const C extends CollectionEntry>(
  collection: C,
): Promise<CollectionDefinition<C>> {
  const { schema, types } = await getCollectionSchema(collection);
  return {
    types,
    schema,
    jsonSchema: JSON.stringify(z.toJSONSchema(schema)),
    collection,
    // Pass the collection object directly so sveltiaLoader uses it inline
    // instead of looking it up from config.json (which requires the sveltia
    // integration to be present in astro.config — not the case for the main site).
    load: () => sveltiaLoader(collection as unknown as SveltiaEntryCollection),
  };
}

/** Collection name union — camelCased from each collection's `name` field. */
type SveltiaCollectionName =
  | "authors"
  | "blogPosts"
  | "blogTags"
  | "featured"
  | "licenses"
  | "pages"
  | "series"
  | "templateBlocks";

type CollectionSchemas = {
  [key in SveltiaCollectionName]: CollectionDefinition;
};

function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", ""),
  );
}

async function getAllCollectionSchemas(
  collections: CollectionEntry[],
): Promise<CollectionSchemas> {
  const schemas: CollectionSchemas = {} as CollectionSchemas;
  for (const collection of collections) {
    schemas[toCamelCase(collection.name) as SveltiaCollectionName] =
      await getCollectionDefinitions(collection);
  }
  return schemas;
}

/**========================================================================
 **                            Exports
 *========================================================================**/

// Export types
export type {
  CollectionDefinition,
  CollectionEntry,
  CollectionSchemas,
  InferCollectionOutput,
  SveltiaCollectionName,
  SveltiaOptions,
  SveltiaEntryCollection
};

// Export functions
  export {
    getAllCollectionSchemas,
    getCollectionDefinitions,
    getCollectionSchema
  };

// Re-export defineCollection for use in collection definition files
  export { defineCollection } from "./utils";

// export collections for use in other parts of the app
export {
  authorsCollection,
  blogPostsCollection,
  featuredPostsCollection,
  licensesCollection,
  seriesCollection,
  tagsCollection,
  templateBlocksCollection
};

