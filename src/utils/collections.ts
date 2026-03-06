import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Fetch all published licenses.
 */
export async function getPublishedLicenses(): Promise<CollectionEntry<'licenses'>[]> {
  const isDev = import.meta.env.DEV;
  return await getCollection('licenses', ({ data }) => {
    // Show all in development, only published in production
    return isDev ? true : data.status === 'published';
  });
}

/**
 * Fetch all published blog posts.
 */
export async function getPublishedBlogPosts(): Promise<CollectionEntry<'blog'>[]> {
  const isDev = import.meta.env.DEV;
  return await getCollection('blog', ({ data }) => {
    // Filter by status if we add it, otherwise show all
    return true; // BlogPost schema in contract doesn't have status yet, but data-model.md does
  });
}
