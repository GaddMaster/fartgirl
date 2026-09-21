
import { randomUUID } from "node:crypto";

import { pages } from "@/app/assets/project_chloris";
import {
	claimNextComicPage,
	markComicPageFailed,
	markComicPagePublished,
	peekNextComicPage,
	seedComicPages,
} from "@/lib/comic/pages";
import {
	buildComicImagePrompt,
	buildComicXText,
	generateComicImage,
	persistComicImage,
	resolveComicReferences,
} from "@/lib/comic/content";
import { assertExpectedXAccount, postComicToX } from "@/lib/comic/twitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request) {
	const authorization = request.headers.get("authorization");
	const validCron = process.env.CRON_SECRET
		&& authorization === `Bearer ${process.env.CRON_SECRET}`;
	const validSecret = process.env.SECRET
		&& authorization === `Bearer ${process.env.SECRET}`;

	return Boolean(validCron || validSecret);
}

async function handle(request) {
	if (!isAuthorized(request)) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(request.url);
	const shouldSeed = url.searchParams.get("seed") === "1";
	const preview = url.searchParams.get("preview") === "1";

	try {
		if (shouldSeed) {
			const result = await seedComicPages(pages);
			return Response.json({ ok: true, ...result });
		}

		if (!preview && process.env.COMIC_PUBLISH_ENABLED !== "1") {
			return Response.json({
				ok: true,
				disabled: true,
				message: "Comic publishing is disabled. Set COMIC_PUBLISH_ENABLED=1 to enable it.",
			});
		}

		if (!preview) {
			await assertExpectedXAccount();
		}

		const page = preview
			? await peekNextComicPage()
			: await claimNextComicPage(randomUUID());

		if (!page) {
			return Response.json({
				ok: true,
				complete: true,
				message: "No unpublished comic pages remain.",
			});
		}

		const prompt = buildComicImagePrompt(page);
		const references = resolveComicReferences(page);
		const text = buildComicXText(page);

		if (preview) {
			return Response.json({
				ok: true,
				preview: true,
				page: {
					pageId: page.pageId,
					order: page.order,
					text,
					prompt,
					references,
				},
			});
		}

		let posted = false;
		try {
			const image = await generateComicImage(prompt, references);
			const storedImage = await persistComicImage(page.pageId, image);
			const tweet = await postComicToX(text, image.buffer, image.contentType);
			posted = true;

			await markComicPagePublished(page, {
				tweetId: tweet?.data?.id || null,
				generatedImageUrl: storedImage.url,
			});

			return Response.json({
				ok: true,
				pageId: page.pageId,
				order: page.order,
				tweetId: tweet?.data?.id || null,
			});
		} catch (error) {
			if (!posted) {
				await markComicPageFailed(page, error).catch(() => null);
			}
			throw error;
		}
	} catch (error) {
		console.error("[comic] publish failed", error);
		return Response.json({
			ok: false,
			error: error?.message || "Comic publishing failed",
		}, { status: 500 });
	}
}

export async function GET(request) {
	return handle(request);
}

export async function POST(request) {
	return handle(request);
}

