import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import markdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const parser = new markdownIt();

export async function GET(context: any) {
  const blog = await getCollection('blog');
  return rss({
    title: 'Plain License Blog',
    description: 'Latest news and updates from the Plain License team.',
    site: context.site,
    content: sanitizeHtml(
      blog
        .map((post) => parser.render(post.body || '')),
        {allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img'])}
      ),
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.description,
      link: `/blog/${post.slug || post.id}/`,
    })),
  });
}
