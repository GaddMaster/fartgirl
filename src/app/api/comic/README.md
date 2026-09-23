# Comic publisher API

`GET /api/comic` is the page-publishing endpoint for PROJECT CHLORIS. It atomically claims the next unpublished `project-chloris` page by ascending `order`, generates one square comic page with xAI Imagine and the page's reference images, posts the caption and image to X, then marks the MongoDB document as published.

Every X post starts with `Fart Girl Comic - Page {order} 📗`, where `order` is the sequential comic page number from 1 through 1,095.

## Authentication

Vercel Cron uses `Authorization: Bearer ${CRON_SECRET}`. Manual calls may use either `CRON_SECRET` or `SECRET`.

## Operations

- `GET /api/comic?preview=1` returns the next page's text, composed image prompt, and resolved references without claiming, generating, or publishing it.
- `POST /api/comic?seed=1` idempotently inserts all 1,460 source pages (four per story day) and refreshes source fields on unpublished records. Published records and publication state are preserved.
- `GET /api/comic/test-credentials` checks MongoDB, Blob, xAI, and X OAuth configuration without generating art or posting.
- `GET /api/comic/daily-recap` creates one X recap only after all four pages of the next eligible story day are published. It summarizes the four captions with Grok and uploads all four images with their individual alt text.
- `npm run seed:comics` performs the same idempotent seed directly from a trusted terminal using `.env`.

## Dependencies

- MongoDB: `MONGODB_URI`, optional `MONGODB_DB` (defaults to `fartgirl`)
- xAI Imagine: `XAI_API_KEY`, optional `COMIC_IMAGE_MODEL`
- Vercel Blob: `BLOB_READ_WRITE_TOKEN` for permanent reader images
- X OAuth 1.0a: `X_API_KEY`, `X_API_KEY_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
- X safety guard: `X_EXPECTED_USERNAME` must match the authenticated account
- Publishing gate: `COMIC_PUBLISH_ENABLED=1` must be set explicitly
- Route auth: `CRON_SECRET`, optional `SECRET`

Vercel calls `/api/comic/cron` hourly. The dispatcher uses `Europe/Dublin` so posts run at 08:00, 13:00, 17:00, and 20:00 Ireland time, while the four-page closing recap runs at 22:00 Ireland time year-round.