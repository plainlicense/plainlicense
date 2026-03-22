import { getCollection } from "astro:content";
import type { BlogPostEntryT } from "src/_types/content";
import type { LicenseEntryT, LicenseFamilyT } from "../_types/licenses";

/**
 * Derive the canonical URL slug for a license entry.
 *
 * Astro's built-in slug/id generation strips dots from filenames (e.g. mpl-2.0
 * becomes mpl-20). Using the frontmatter SPDX ID and license_family instead
 * preserves dotted version numbers in URLs.
 */
export function getLicenseSlug(license: LicenseEntryT): string {
  const licenseFamily: LicenseFamilyT =
    license.data?.license_family ?? "permissive";
  if (license.data?.spdx_id) {
    return `${licenseFamily}/${license.data.spdx_id}`;
  }
  if (license.data?.original?.spdx_id) {
    return `${licenseFamily}/${license.data.original.spdx_id}`;
  }
  return `${licenseFamily}/${license.slug}`;
}

/**
 * Fetch all published licenses.
 */
export async function getPublishedLicenses(): Promise<LicenseEntryT[]> {
  const isDev = import.meta.env.DEV;
  return await getCollection("licenses", ({ data }) => {
    // Show all in development, only published in production
    return isDev ? true : data.status === "published";
  });
}

/**
 * Fetch all published blog posts.
 */
export async function getPublishedBlogPosts(): Promise<BlogPostEntryT[]> {
  return await getCollection(
    "blog-posts",
    ({ data }) => data.status === "published",
  );
}
