/** biome-ignore-all lint/suspicious/noExplicitAny: <The types here are truly 'any'> */
import type {
	CommonCollectionProps,
	EntryCollection,
	EntryCollectionProps,
	Field,
} from "@sveltia/cms";
import type { ZodObject } from "astro/zod";
import { buildCollectionSchema } from "astro-loader-sveltia-cms/type-gen";
import type { InferCollectionOutput } from "./field-inference";

export type CollectionEntry = EntryCollectionProps & CommonCollectionProps;

export interface BuildCollectionSchemaResult<
	C extends { fields: readonly Field[] } = { fields: Field[] },
> {
	schema: ZodObject<any> & { _output: InferCollectionOutput<C> };
	types: string;
}

/**
 * Define a collection with preserved literal types for inference.
 *
 * The `const` type parameter narrows field names, widget types, and
 * option values to their literal types — enabling `InferCollectionOutput`
 * to derive the exact shape of the collection's entries.
 *
 * @example
 * ```ts
 * export const authorsCollection = defineCollection({
 *   name: "authors",
 *   folder: "content/authors",
 *   fields: [
 *     { name: "email", widget: "string", required: true },
 *     { name: "bio", widget: "text", required: false },
 *   ],
 * });
 * // typeof authorsCollection preserves literal "email", "string", etc.
 * // InferCollectionOutput<typeof authorsCollection> = { email: string; bio?: string }
 * ```
 */
export function defineCollection<const C extends EntryCollection>(
	config: C,
): C {
	return config;
}

export { buildCollectionSchema };
export type { InferCollectionOutput };
