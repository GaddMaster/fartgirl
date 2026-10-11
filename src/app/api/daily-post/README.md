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
- `POST /api/daily-post?type=gm|gd|gn`: QStash target. Claims `{date}-{type}`, gets a live market snapshot, has Grok research (`web_search` + `x_search`) and write the post plus an image scene, validates the text for account safety, generates the image from the two reference sheets, uploads it to Blob, posts it to X, and marks it published.
  - `?preview=1` researches and writes the post without claiming or posting. Add `&image=1` to also generate the image (saved under `daily-posts/previews/`).
  - Delayed QStash deliveries are skipped if they land more than 60 minutes after the window closes.

## How a post is built

1. The `DAILY_POST_BRIEFS` object in `route.js` defines the mission, research focus, required parts, tone, image mood, and a set of rotating formats for each type. The last 3 formats used for that type are not picked again.
2. `COIN_FOCUS` decides how much the post leans on the coin: `light`, `stat`, or `lore`.
3. `lib/daily-posts/market.js` fetches live numbers from DexScreener ($FARTGIRL, $FARTBOY), CoinGecko (BTC/ETH/SOL, total market cap, dominance), and alternative.me (Fear & Greed). Grok may only use these numbers or ones from sources it opened.
4. `lib/daily-posts/content.js` holds the shared canon, research rules, account-safety rules, and voice. The last 12 posts are passed in so stories, hooks, and scenes don't repeat.
5. Validation checks: length (X weighting), the greeting, no links, no @mentions, no contract address, at most 2 hashtags and 2 cashtags, and banned wording. A failed check gets one Grok rewrite, then a deterministic cleanup. If the post still fails, nothing is published.
6. The image uses `02_fartgirl_hero_sheet.jpg` (suit lock) and `03_lena_face_lock.jpg` (face lock) plus a character lock with the chest emblem.

## Dependencies

- QStash (same account as ufocoin): `QSTASH_TOKEN`, `QSTASH_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- `PUBLIC_BASE_URL` (optional, default `https://www.fartgirlsolana.com`): the URL QStash calls
- `DAILY_POST_ENABLED=1`: publishing gate (applies to the scheduler and to the endpoint)
- `XAI_API_KEY`. Optional: `DAILY_POST_TEXT_MODEL` (default `grok-4.3`), `DAILY_POST_IMAGE_MODEL`, `DAILY_POST_IMAGE_ASPECT` (default `1:1`), `DAILY_POST_MAX_TURNS` (default 8)
- `DAILY_POST_MAX_CHARS` (default 280; raise it if the account has X Premium long posts)
- MongoDB collection `daily_posts`, Vercel Blob `daily-posts/`, X OAuth vars and `X_EXPECTED_USERNAME` (shared with the comic)
- Auth: QStash signature, or `Bearer CRON_SECRET` / `Bearer SECRET` for manual calls
