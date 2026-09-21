# Comic credential test API

`GET /api/comic/test-credentials` verifies the configured MongoDB, Vercel Blob, xAI, and X OAuth credentials without generating an image, uploading media, or publishing a post. Its response includes the authenticated X account ID, display name, username, expected username, and match result, plus safe xAI account/key IDs and key name when the xAI API exposes them. It never returns credential values.

It requires `Authorization: Bearer ${CRON_SECRET}` or `Authorization: Bearer ${SECRET}`. The X check reads the authenticated account identity and verifies it matches `X_EXPECTED_USERNAME`; it intentionally does not test X write permission because that would require an external side effect.