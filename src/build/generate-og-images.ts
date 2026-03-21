import { fontData } from "astro:assets";
import fs from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import matter from "gray-matter";
import satori from "satori";

/**
 * Generates OpenGraph PNG images for all licenses.
 */
async function generateOGImages() {
  const baseDir = path.resolve("content/licenses");
  const outputBaseDir = path.resolve("public/og");
  await fs.mkdir(outputBaseDir, { recursive: true });

  // In a real env, we'd load a real font file.
  // For this prototype, we'll try to find a system font or skip if none.

  const categories = await fs.readdir(baseDir);

  for (const category of categories) {
    const categoryPath = path.join(baseDir, category);
    if (!(await fs.stat(categoryPath)).isDirectory()) continue;

    const files = (await fs.readdir(categoryPath)).filter((f) =>
      f.endsWith(".md"),
    );
    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const { data } = matter(await fs.readFile(filePath, "utf8"));

      const slug = data.spdx_id.trim().toLowerCase();
      const title = data.title || data.spdx_id;
      const description = `${data.description?.slice(0, 150)}...`;

      console.log(`Generating OG image for ${slug}...`);

      const font = fontData["--font-raleway"];

      const svg = await satori(
        {
          type: "div",
          props: {
            style: {
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              backgroundColor: "#0f172a", // slate-900
              padding: "80px",
              fontFamily: "Inter, sans-serif",
              color: "white",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#38bdf8", // sky-400
                    marginBottom: "20px",
                    textTransform: "uppercase",
                  },
                  children: "Plain License",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "72px",
                    fontWeight: "bold",
                    marginBottom: "20px",
                  },
                  children: title,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "32px",
                    color: "#94a3b8", // slate-400
                    lineHeight: "1.4",
                  },
                  children: description,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    marginTop: "auto",
                    fontSize: "20px",
                    color: "#475569", // slate-600
                  },
                  children: `plainlicense.org/licenses/${slug}`,
                },
              },
            ],
          },
        },
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: "Raleway",
              data: await fetch(
                new URL(font[0].src[0].url, import.meta.url),
              ).then((res) => res.arrayBuffer()),
              weight: 500,
              style: "normal",
            },
          ],
        },
      );

      const resvg = new Resvg(svg);
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      await fs.writeFile(path.join(outputBaseDir, `${slug}.png`), pngBuffer);
    }
  }
}

generateOGImages().catch(console.error);
