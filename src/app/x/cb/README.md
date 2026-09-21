# X OAuth setup callback

`/x/cb` is a one-time setup page for authorizing the Fart Girl X account. It is not used by daily publishing.

Set `X_OAUTH_CALLBACK_URL` to the deployed URL `https://your-domain.example/x/cb` and register that exact callback URL in the X Developer App. Open `/x/cb?setup=<X_OAUTH_SETUP_SECRET>` while signed into the Fart Girl X account. The route redirects to X, exchanges the callback verifier for OAuth 1.0a user credentials, and displays the resulting environment-variable names and values once.

Use `X_OAUTH_SETUP_SECRET` for this setup link when possible; it falls back to `SECRET` if unset. Keep `COMIC_PUBLISH_ENABLED=0` until `/api/comic/test-credentials` confirms the expected account.