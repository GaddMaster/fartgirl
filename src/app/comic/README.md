# Comic reader

`/comic` is the public reader for PROJECT CHLORIS. It loads completed comic records from MongoDB in ascending `order` and presents them as a keyboard-, touch-, and range-controlled portrait slider.

Only records with `complete: true` and a durable `generatedImageUrl` are visible. The publishing route stores generated art under `comic/project-chloris/{pageId}` in Vercel Blob before posting it to X.

Dependencies: `MONGODB_URI`, optional `MONGODB_DB`, and `BLOB_READ_WRITE_TOKEN` for future published images.