import fs from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import matter from "gray-matter";
import satori from "satori";

/** Brand colors from colors.css */
const COLORS = {
	bg: "rgb(0, 0, 34)", // oxford-blue
	accent: "rgb(21, 219, 149)", // emerald
	title: "rgb(255, 255, 255)", // white
	description: "rgb(244, 228, 193)", // dutch-white
	url: "rgb(9, 93, 64)", // castleton-green
};

/** Strip HTML tags, markdown formatting, and collapse whitespace. */
function stripTags(text: string): string {
	return (
		text
			// HTML tags
			.replace(/<[^>]+>/g, "")
			// markdown images
			.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
			// markdown links – keep text
			.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
			// bold/italic
			.replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
			// strikethrough
			.replace(/~~(.*?)~~/g, "$1")
			// inline code
			.replace(/`([^`]*)`/g, "$1")
			// headings
			.replace(/^#{1,6}\s+/gm, "")
			// blockquotes
			.replace(/^>\s?/gm, "")
			// horizontal rules
			.replace(/^[-*_]{3,}\s*$/gm, "")
			// list markers
			.replace(/^[\s]*[-*+]\s+/gm, "")
			.replace(/^[\s]*\d+\.\s+/gm, "")
			// collapse whitespace
			.replace(/\s+/g, " ")
			.trim()
	);
}

/** Truncate to the first sentence if possible, max 150 chars. */
function truncateDescription(raw: string): string {
	const clean = stripTags(raw);
	// Match first sentence (ends with . ! or ? followed by space or end)
	const sentenceMatch = clean.match(/^.+?[.!?](?:\s|$)/);
	const firstSentence = sentenceMatch ? sentenceMatch[0].trim() : clean;
	if (firstSentence.length <= 150) return firstSentence;
	return `${clean.slice(0, 147)}...`;
}

/**
 * Generates OpenGraph PNG images for all licenses.
 */
async function generateOGImages() {
	const baseDir = path.resolve("content/licenses");
	const outputBaseDir = path.resolve("public/og");
	await fs.mkdir(outputBaseDir, { recursive: true });

	// Load logo as base64 data URI for embedding in satori
	const logoPath = path.resolve(
		"src/.reserve/images/logos/logo_only_color_transp.png",
	);
	const logoBuffer = await fs.readFile(logoPath);
	const logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;

	// Fetch Raleway TTF from Google Fonts (satori needs TTF/OTF, not WOFF2)
	const fontCssUrl =
		"https://fonts.googleapis.com/css2?family=Raleway:wght@500;700&display=swap";
	const cssRes = await fetch(fontCssUrl, {
		// Request TTF by using an older user-agent that doesn't support woff2
		headers: { "User-Agent": "Safari 10" },
	});
	const css = await cssRes.text();
	const ttfUrls = [...css.matchAll(/url\(([^)]+\.ttf)\)/g)].map((m) => m[1]);
	if (ttfUrls.length === 0) {
		throw new Error("Could not extract TTF font URL from Google Fonts CSS");
	}
	const ralewayFont = await fetch(ttfUrls[0]).then((r) => r.arrayBuffer());

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
			const description = truncateDescription(data.description ?? "");

			console.log(`Generating OG image for ${slug}...`);

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
							backgroundColor: COLORS.bg,
							padding: "60px 80px",
							fontFamily: "Raleway, sans-serif",
							color: COLORS.title,
						},
						children: [
							// Logo + "Plain License" header row
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										alignItems: "center",
										marginBottom: "24px",
									},
									children: [
										{
											type: "img",
											props: {
												src: logoDataUri,
												width: 48,
												height: 48,
												style: { marginRight: "16px" },
											},
										},
										{
											type: "div",
											props: {
												style: {
													fontSize: "24px",
													fontWeight: "bold",
													color: COLORS.accent,
													textTransform: "uppercase",
													letterSpacing: "0.05em",
												},
												children: "Plain License",
											},
										},
									],
								},
							},
							// Title
							{
								type: "div",
								props: {
									style: {
										fontSize: "64px",
										fontWeight: "bold",
										marginBottom: "20px",
										lineHeight: "1.1",
									},
									children: title,
								},
							},
							// Description
							{
								type: "div",
								props: {
									style: {
										fontSize: "28px",
										color: COLORS.description,
										lineHeight: "1.4",
									},
									children: description,
								},
							},
							// URL at bottom
							{
								type: "div",
								props: {
									style: {
										display: "flex",
										marginTop: "auto",
										fontSize: "20px",
										color: COLORS.url,
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
							data: ralewayFont,
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
