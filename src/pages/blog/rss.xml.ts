import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL, SITE_TITLE } from "../../utils/constants";

export const prerender = true;

export async function GET(context: APIContext) {
  const allPosts = await getCollection("blogPosts");
  const posts = allPosts
    .filter((p) => p.data.status === "published")
    .sort((a, b) => {
      const da = a.data.publication_date || a.data.creation_date || "";
      const db = b.data.publication_date || b.data.creation_date || "";
      return new Date(db).getTime() - new Date(da).getTime();
    });

  return rss({
    title: `${SITE_TITLE} Blog`,
    description:
      "News, guides, and updates from the Plain License project.",
    site: context.site ?? SITE_URL,
    items: posts.map((post) => {
      const slug = post.id.replace(/^posts\//, "").replace(/\.mdx?$/, "");
      return {
        title: post.data.title,
        description: post.data.description ?? "",
        pubDate: new Date(
          post.data.publication_date || post.data.creation_date || Date.now(),
        ),
        link: `/blog/${slug}/`,
      };
    }),
  });
}
