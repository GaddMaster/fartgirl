
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
	buildComicAltText,
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
	const startedAt = Date.now();
	const traceId = randomUUID();
	const logs = [];
	const record = (step, status, details = {}) => {
		const entry = {
			step,
			status,
			at: new Date().toISOString(),
			elapsedMs: Date.now() - startedAt,
			...details,
		};
		logs.push(entry);
		console.log("[comic]", JSON.stringify({ traceId, ...entry }));
	};

	if (!isAuthorized(request)) {
		record("authorize", "failed");
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
	record("authorize", "ok");

	const url = new URL(request.url);
	const shouldSeed = url.searchParams.get("seed") === "1";
	const preview = url.searchParams.get("preview") === "1";

	try {
		if (shouldSeed) {
			record("seed", "started");
			const result = await seedComicPages(pages);
			record("seed", "ok", result);
			return Response.json({ ok: true, traceId, logs, ...result });
		}

		if (!preview && process.env.COMIC_PUBLISH_ENABLED !== "1") {
			record("publishing-gate", "disabled");
			return Response.json({
				ok: true,
				traceId,
				logs,
				disabled: true,
				message: "Comic publishing is disabled. Set COMIC_PUBLISH_ENABLED=1 to enable it.",
			});
		}

		if (!preview) {
			record("x-account", "started");
			await assertExpectedXAccount();
			record("x-account", "ok");
		}

		record("claim", preview ? "peek_started" : "started");
		const page = preview
			? await peekNextComicPage()
			: await claimNextComicPage(randomUUID());

		if (!page) {
			record("claim", "empty");
			return Response.json({
				ok: true,
				traceId,
				logs,
				complete: true,
				message: "No unpublished comic pages remain.",
			});
		}

		const prompt = buildComicImagePrompt(page);
		const references = resolveComicReferences(page);
		const text = buildComicXText(page);
		const altText = buildComicAltText(page);
		record("page-ready", "ok", {
			pageId: page.pageId,
			order: page.order,
			referenceCount: references.length,
			postTextLength: text.length,
			altTextLength: altText.length,
		});

		if (preview) {
			record("preview", "ok");
			return Response.json({
				ok: true,
				traceId,
				logs,
				preview: true,
				page: {
					pageId: page.pageId,
					order: page.order,
					text,
					altText,
					prompt,
					references,
				},
			});
		}

		let posted = false;
		try {
			record("image-generation", "started");
			const image = await generateComicImage(prompt, references);
			record("image-generation", "ok", {
			contentType: image.contentType,
			bytes: image.buffer.length,
		});

			record("blob-upload", "started");
			const storedImage = await persistComicImage(page.pageId, image);
			record("blob-upload", "ok", { url: storedImage.url });

			record("x-publish", "started");
			const tweet = await postComicToX(text, image.buffer, image.contentType, altText);
			posted = true;
			record("x-publish", "ok", { tweetId: tweet?.data?.id || null });

			record("database-mark-published", "started");
			await markComicPagePublished(page, {
				tweetId: tweet?.data?.id || null,
				generatedImageUrl: storedImage.url,
				altText,
			});
			record("database-mark-published", "ok");

			return Response.json({
				ok: true,
				traceId,
				logs,
				pageId: page.pageId,
				order: page.order,
				tweetId: tweet?.data?.id || null,
			});
		} catch (error) {
			record("pipeline", "failed", {
				pageId: page.pageId,
				postedToX: posted,
				error: error?.message || String(error),
			});
			if (!posted) {
				await markComicPageFailed(page, error).catch(() => null);
				record("database-mark-failed", "ok");
			} else {
				record("database-mark-failed", "skipped", {
					reason: "X post succeeded; page state requires manual verification if final database marking failed.",
				});
			}
			throw error;
		}
	} catch (error) {
		console.error("[comic] publish failed", JSON.stringify({
			traceId,
			error: error?.message || String(error),
			elapsedMs: Date.now() - startedAt,
		}));
		return Response.json({
			ok: false,
			traceId,
			logs,
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

