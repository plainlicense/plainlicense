/**
 * Type-level inference utilities for Sveltia CMS collections.
 *
 * These types mirror the runtime behavior of `fieldToZod()` in
 * astro-loader-sveltia-cms, allowing TypeScript to infer the output
 * shape of a collection's Zod schema from its field definitions.
 *
 * Requires collection definitions to preserve literal types — use
 * `defineCollection()` from ./utils or `as const satisfies`.
 */

import type { Field, VariableFieldType } from "@sveltia/cms";

// ─── Utility Types ───────────────────────────────────────────

/** Flatten intersection types for readability in hover tooltips */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Determine if a field is required.
 * Sveltia CMS defaults to optional unless explicitly `required: true`
 * or a non-empty locale array.
 */
type IsRequired<F extends Field> =
	F extends { required: true }
		? true
		: F extends { required: readonly [string, ...string[]] }
			? true
			: false;

// ─── Field Output Inference ──────────────────────────────────

/**
 * Infer the TypeScript output type for a single Sveltia CMS field.
 * Each branch mirrors a case in the runtime `fieldToZod()` switch.
 */
export type InferFieldOutput<F extends Field> =
	// ── String-like widgets ─────────────────────────────────
	F extends {
		widget:
			| "string"
			| "text"
			| "color"
			| "map"
			| "uuid"
			| "compute"
			| "markdown"
			| "richtext";
	}
		? string
		: // ── Number ─────────────────────────────────────────────
			F extends { widget: "number"; value_type: "int/string" | "float/string" }
			? number | string
			: F extends { widget: "number" }
				? number
				: // ── Boolean ────────────────────────────────────────────
					F extends { widget: "boolean" }
					? boolean
					: // ── DateTime (z.coerce.date()) ─────────────────────────
						F extends { widget: "datetime" }
						? Date
						: // ── Image ──────────────────────────────────────────────
							F extends { widget: "image"; multiple: true }
							? string[]
							: F extends { widget: "image" }
								? string
								: // ── File ───────────────────────────────────────────────
									F extends { widget: "file"; multiple: true }
									? string[]
									: F extends { widget: "file" }
										? string
										: // ── Select (extracts literal option values when available) ─
											F extends {
													widget: "select";
													multiple: true;
													options: readonly (infer O)[];
												}
											? (O extends { value: infer V } ? V : O)[]
											: F extends {
														widget: "select";
														options: readonly (infer O)[];
													}
												? O extends { value: infer V }
													? V
													: O
												: // Select fallback (non-const options)
													F extends { widget: "select"; multiple: true }
													? (string | number | null)[]
													: F extends { widget: "select" }
														? string | number | null
														: // ── Relation ────────────────────────────────────────────
															F extends { widget: "relation"; multiple: true }
															? string[]
															: F extends { widget: "relation" }
																? string
																: // ── KeyValue ────────────────────────────────────────────
																	F extends { widget: "keyvalue" }
																	? Record<string, string>
																	: // ── Code ────────────────────────────────────────────────
																		F extends {
																				widget: "code";
																				output_code_only: true;
																			}
																		? string
																		: F extends { widget: "code" }
																			? { code: string; lang: string }
																			: // ── Hidden (infer from default value type) ──────────────
																				F extends { widget: "hidden"; default: string }
																				? string
																				: F extends { widget: "hidden"; default: number }
																					? number
																					: F extends { widget: "hidden"; default: boolean }
																						? boolean
																						: F extends { widget: "hidden" }
																							? unknown
																							: // ── Object with fields (recursive) ─────────────────────
																								F extends {
																										widget: "object";
																										fields: infer Sub extends readonly Field[];
																									}
																								? InferFieldsOutput<Sub>
																								: // ── Object with types (discriminated union) ─────────────
																									F extends {
																											widget: "object";
																											types: infer Types extends readonly VariableFieldType[];
																										}
																									? InferVariants<
																											Types,
																											F extends {
																												typeKey: infer K extends string;
																											}
																												? K
																												: "type"
																										>
																									: // ── List with types (array of discriminated union) ──────
																										F extends {
																												widget: "list";
																												types: infer Types extends readonly VariableFieldType[];
																											}
																										? InferVariants<
																												Types,
																												F extends {
																													typeKey: infer K extends string;
																												}
																													? K
																													: "type"
																											>[]
																										: // ── List with fields (array of objects) ─────────────────
																											F extends {
																													widget: "list";
																													fields: infer Sub extends readonly Field[];
																												}
																											? InferFieldsOutput<Sub>[]
																											: // ── List with single field ──────────────────────────────
																												F extends {
																														widget: "list";
																														field: infer Sub extends Field;
																													}
																												? InferFieldOutput<Sub>[]
																												: // ── Simple list (no subfields -> string[]) ──────────────
																													F extends { widget: "list" }
																													? string[]
																													: // ── Default: string (StringField widget is optional) ─────
																														string;

// ─── Compound Type Inference ─────────────────────────────────

/**
 * Infer the output type for a discriminated union of variable field types.
 * Each variant gets a discriminator key (default: "type") set to its name.
 */
type InferVariants<
	Types extends readonly VariableFieldType[],
	TypeKey extends string,
> = Types[number] extends infer V
	? V extends VariableFieldType
		? Prettify<
				{ [K in TypeKey]: V["name"] } & (V extends {
					fields: infer Sub extends readonly Field[];
				}
					? InferFieldsOutput<Sub>
					: Record<string, never>)
			>
		: never
	: never;

/**
 * Infer the full output type for a collection's fields array.
 * Separates required fields (must be present) from optional fields
 * (may be undefined), matching Sveltia CMS runtime semantics.
 */
export type InferFieldsOutput<Fields extends readonly Field[]> = Prettify<
	{
		[F in Fields[number] as IsRequired<F> extends true
			? F["name"]
			: never]: InferFieldOutput<F>;
	} & {
		[F in Fields[number] as IsRequired<F> extends false
			? F["name"]
			: never]?: InferFieldOutput<F>;
	}
>;

// ─── Collection-Level Inference ──────────────────────────────

/**
 * Infer the full output type for an EntryCollection's fields.
 *
 * @example
 * ```ts
 * const col = defineCollection({ name: "authors", folder: "...", fields: [...] });
 * type AuthorData = InferCollectionOutput<typeof col>;
 * ```
 */
export type InferCollectionOutput<
	C extends { fields: readonly Field[] },
> = InferFieldsOutput<C["fields"]>;
