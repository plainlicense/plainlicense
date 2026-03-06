import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: any) {
  const blog = await getCollection('blog');
  return rss({
    title: 'Plain License Blog',
    description: 'Latest news and updates from the Plain License team.',
    site: context.site,
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.description,
      link: `/blog/${post.slug || post.id}/`,
    })),
  });
}
