import { type CollectionEntry, getCollection } from "astro:content";

/**
 * Derive the canonical URL slug for a license entry.
 *
 * Astro's built-in slug/id generation strips dots from filenames (e.g. mpl-2.0
 * becomes mpl-20). Using the frontmatter SPDX ID and license_family instead
 * preserves dotted version numbers in URLs.
 */
export function getLicenseSlug(license: CollectionEntry<"licenses">): string {
  return `${license.data.license_family}/${license.data.spdx_id.toLowerCase()}`;
}

/**
 * Fetch all published licenses.
 */
export async function getPublishedLicenses(): Promise<
  CollectionEntry<"licenses">[]
> {
  const isDev = import.meta.env.DEV;
  return await getCollection("licenses", ({ data }) => {
    // Show all in development, only published in production
    return isDev ? true : data.status === "published";
  });
}

/**
 * Fetch all published blog posts.
 */
export async function getPublishedBlogPosts(): Promise<
  CollectionEntry<"blog">[]
> {
  return await getCollection("blog");
}
