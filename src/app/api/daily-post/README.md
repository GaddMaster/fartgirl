# Daily posts API (GM / GD / GN)

Three researched posts a day on X, each with a Grok Imagine image of Fart Girl. These posts are set in the future timeline: the comic is over, she's the world's most famous superhero, and she wears **FART GIRL** across her chest.

| Type | Irish time window | Purpose |
|------|-------------------|---------|
| `gm` | 08:00–09:00 | Good morning: overnight market intel, today's calendar, a fun wake-up story |
| `gd` | 16:00–18:00 | Good day: midday check-in, what's moving now, one useful explainer |
| `gn` | 20:00–22:00 | Good night: today's review, the weirdest story, tomorrow's watchlist |

Trigger times are random within each window and stay at least 10 minutes away from comic page hours (`COMIC_PUBLISH_HOURS`) and the recap hour (`COMIC_RECAP_HOUR`).

## Routes

- `GET /api/daily-post/schedule`: Vercel cron at 05:00 UTC (05:00/06:00 Dublin). Creates one QStash message per type for today using `notBefore`. Deduplicated in Mongo (`daily_posts.postKey`) and with the QStash `deduplicationId`. `?dryRun=1` shows the picked times without scheduling. `?types=gm,gn` limits the run to those types.
- `POST /api/daily-post?type=gm|gd|gn`: QStash target. Claims `{date}-{type}`, gets a live market snapshot, has Grok research (`web_search` + `x_search`) and write the post plus an image scene, validates the text for account safety, generates the image using the daily-only character references, uploads it to Blob, posts it to X, and marks it published.
  - `?preview=1` researches and writes the post without claiming or posting. Add `&image=1` to also generate the image (saved under `daily-posts/drafts/`).
  - Drafts: a preview saves its text and image on the day's record (`daily_posts.draft`). Every later call for the same `{date}-{type}` reuses that draft instead of calling Grok again, including the live run and the scheduled QStash run. That gives you preview → check → publish exactly what you saw. A text-only draft gets its image generated on first use.
  - Creative migration: unpublished drafts lacking `visualDirection.characterId = fartgirl-celebrity-v1`, or whose scene is not permitted on the actual current Dublin weekday, are regenerated in full before reuse. This deliberately replaces old comic-reference drafts. Published/unconfirmed records remain untouched. A current-version eligible draft still reuses its saved image on ordinary retries.
  - `&regenerate=1` ignores the saved draft and generates fresh content. Works with or without `preview=1`.
  - `&regenerateImage=1` keeps the saved text and makes only a new image, choosing a fresh activity, framing, expression, and lighting for the current type. It updates the saved scene and alt text. Use `&regenerate=1` when you want fresh text that describes the new activity too.
  - A live run also stores what it generated, so a QStash retry reuses it instead of paying Grok again.
  - Previews of an already-published slot return `skipped` with its `tweetId`.
  - Delayed QStash deliveries are skipped if they land more than 60 minutes after the window closes.

## How a post is built

The shared Grok system prompt for all three daily posts (`gm`, `gd`, and `gn`) forbids em dashes (U+2014) and requests standard punctuation instead.

1. `src/lib/daily-posts/scenes.js` contains 84 distinct city-superhero scenarios, with shared morning/daytime choices and a separate evening pool. Each has a stable ID, category, allowed slots, explicit permitted weekday array, activity, practical logistics and hero/off-duty wardrobe. Covers celebrity encounters, luxury hotel/penthouse life, animal rescues, construction accidents, bank robberies, controlled car chases, community events, training and nights out. Ordinary scenes allow all seven days; nightclub dancing is Friday/Saturday only. Other events have explicit workday/weekend/custom eligibility. Sunset is an earlier-evening reflection, not an assertion about the actual GN posting time or local sunset hour.
2. Selection uses the **actual current Europe/Dublin weekday**, also sent to Grok for weekday-aware humor/social context. From the last 120 published/unconfirmed records across **all slots**, it first chooses unused eligible scene IDs (falling back to activity text for older records). When all eligible scenes are represented, it chooses the least recently used; within that fresh pool it prefers categories absent from the last two assignments. Shared GM/GD scenes therefore do not immediately recur across slots. It also rotates costumes, references and compositions (avoiding the last 11). Expressions avoid the last 9 ordinary choices or 5 focused choices; crime/rescue scenes use only calm, alert, focused expressions, never sleepy yawns or amused laughter. Scene-specific lighting overrides location-adaptable slot defaults, without inventing weather, windows or fires. Existing drafts are included as exclusions on regeneration. The complete assignment is stored as `visualDirection`.
3. `DAILY_POST_BRIEFS` defines the mission, research focus, required parts, tone, and rotating editorial formats. The last 3 formats used for that type are not picked again. The assigned visual direction overrides habitual scenes and format examples; the selected activity is sent to both the writing request and the final image prompt.
4. `COIN_FOCUS` decides whether the post emphasizes community, sibling lore, or green-glow humor.
5. `lib/daily-posts/market.js` fetches live numbers from DexScreener ($FARTGIRL, $FARTBOY), CoinGecko (BTC/ETH/SOL, total market cap, dominance), and alternative.me (Fear & Greed). Grok may only use these numbers or ones from sources it opened.
6. `lib/daily-posts/content.js` holds the shared canon, research rules, account-safety rules, and voice. Recent posts and their saved visual directions are passed in so stories, hooks, and scenes don't repeat. The image prompt separately includes the last 12 scenes to avoid recreating their staging.
7. Validation checks: length (X weighting), the greeting, no links, no @mentions, no contract address, at most 2 hashtags and 2 cashtags, banned wording, and no em dashes. Em dashes are replaced with regular hyphens in deterministic text cleanup, including after AI rewrites and when reusing saved drafts. If the post still fails validation, nothing is published.
8. `src/lib/daily-posts/references.js` holds the separate future-celebrity design and all **12 unique reference images** under `character-v1/`. Three costume families: green/gold short skirt with long cape and over-knee boots; green/gold mini skirt with green/gold/black over-knee boots; continuous long-sleeved full-length suit with integrated boots. Each includes primary, purple-accent, green-gas and green/purple-gas metadata. Costume one's corrected purple-only asset is `grok-image-b9f4a098-ee9a-4c1e-b324-0ee4a81fc7d5.jpg`; its green/purple-gas asset remains `grok-image-63b32449-aa79-4ef4-bba2-1bf7cf3611cf.jpg`.
9. Image generation receives only the selected costume's primary reference and at most one variant, never all three competing designs. Off-duty scenes receive one primary **for face/hair identity only** and explicit scene-appropriate fitted clothing; no forced cape, boots or chest logo in casual wear. Hero costumes retain the integrated **FART GIRL** chest emblem. Green/purple reference gas is optional task-driven energy, not a mandatory pose/background. The old comic face, low-bun, low-boot and no-cape rules no longer constrain daily art. Comic generation and its manifest are unchanged.

An ordinary retry still reuses its saved image instead of generating new content.
The variety rules prevent recent assignment repeats, not a mathematical guarantee
of indefinitely unique rendered images. AI output can still converge visually;
there is no image-similarity scoring or automatic visual rejection in this route.

## Offline Verification

Run `node scripts/verify-daily-post-variety.mjs` for all 21 weekday/slot combinations,
over 2,000 sequential choices, cross-slot cooldowns, costume isolation, the 12 unique
corrected reference URLs, wardrobe/logistics/lighting propagation and regeneration. It does
not call Grok, access MongoDB, generate images, or post to X.

## Dependencies

- QStash (same account as ufocoin): `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- `PUBLIC_BASE_URL` (optional, default `https://www.fartgirlsolana.com`): the URL QStash calls
- `DAILY_POST_ENABLED=1`: publishing gate (applies to the scheduler and to the endpoint)
- `XAI_API_KEY`. Optional: `DAILY_POST_TEXT_MODEL` (default `grok-4.3`), `DAILY_POST_IMAGE_MODEL`, `DAILY_POST_IMAGE_ASPECT` (default `1:1`), `DAILY_POST_MAX_TURNS` (default 8)
- `DAILY_POST_MAX_CHARS` (default 280; raise it if the account has X Premium long posts)
- MongoDB collection `daily_posts`, Vercel Blob `daily-posts/`, X OAuth vars and `X_EXPECTED_USERNAME` (shared with the comic)
- Auth: QStash signature, or `Bearer CRON_SECRET` / `Bearer SECRET` for manual calls
