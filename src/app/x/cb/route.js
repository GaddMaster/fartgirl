import { cookies } from "next/headers";
import { TwitterApi } from "twitter-api-v2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "fartgirl_x_oauth_state";
const SETUP_COOKIE = "fartgirl_x_oauth_setup";
const COOKIE_MAX_AGE = 10 * 60;

function requiredCredentials() {
  const names = ["X_API_KEY", "X_API_KEY_SECRET"];
  return names.filter((name) => !process.env[name]);
}

function setupSecretMatches(value) {
  const expected = process.env.X_OAUTH_SETUP_SECRET || process.env.SECRET;
  return Boolean(expected && value && value === expected);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function html(title, body) {
  return new Response(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #080a08; color: #e8eadf; }
      main { width: min(680px, calc(100% - 32px)); padding: 28px; border: 1px solid #355d3c; background: #101610; }
      h1 { margin-top: 0; color: #45f06f; }
      p { color: #b4beb5; line-height: 1.6; }
      code, pre { display: block; overflow-wrap: anywhere; padding: 14px; background: #050605; color: #b8ffca; }
      .warning { color: #ffd166; }
      a { color: #45f06f; }
    </style>
  </head>
  <body><main>${body}</main></body>
</html>`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function startAuthorization(request) {
  const url = new URL(request.url);
  const setup = url.searchParams.get("setup");
  if (!setupSecretMatches(setup)) {
    return html("Fart Girl X setup", "<h1>Setup authorization required</h1><p>Open this page with the configured setup secret.</p>");
  }

  const missing = requiredCredentials();
  if (missing.length) {
    return html(
      "Fart Girl X setup",
      `<h1>Missing app credentials</h1><p>Configure these first: <code>${escapeHtml(missing.join(", "))}</code></p>`,
    );
  }

  const callbackUrl = process.env.X_OAUTH_CALLBACK_URL || `${url.origin}/x/cb`;
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
  });
  const auth = await client.generateAuthLink(callbackUrl, { forceLogin: true });
  const cookieStore = await cookies();

  cookieStore.set(STATE_COOKIE, JSON.stringify({
    oauthToken: auth.oauth_token,
    oauthTokenSecret: auth.oauth_token_secret,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/x/cb",
  });
  cookieStore.set(SETUP_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/x/cb",
  });

  return Response.redirect(auth.url);
}

async function completeAuthorization(request) {
  const url = new URL(request.url);
  const oauthToken = url.searchParams.get("oauth_token");
  const verifier = url.searchParams.get("oauth_verifier");
  const cookieStore = await cookies();
  const rawState = cookieStore.get(STATE_COOKIE)?.value;
  const setupAuthorized = cookieStore.get(SETUP_COOKIE)?.value === "1";

  if (!setupAuthorized || !oauthToken || !verifier || !rawState) {
    return html("Fart Girl X setup", "<h1>Incomplete OAuth callback</h1><p>Restart the setup link and authorize the Fart Girl account.</p>");
  }

  let state;
  try {
    state = JSON.parse(rawState);
  } catch {
    state = null;
  }

  if (!state?.oauthToken || state.oauthToken !== oauthToken || !state.oauthTokenSecret) {
    return html("Fart Girl X setup", "<h1>OAuth state mismatch</h1><p>Restart the setup link.</p>");
  }

  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: oauthToken,
    accessSecret: state.oauthTokenSecret,
  });
  const result = await client.login(verifier);

  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(SETUP_COOKIE);

  const username = result.screenName || "";
  const env = [
    `X_API_KEY=${process.env.X_API_KEY}`,
    `X_API_KEY_SECRET=${process.env.X_API_KEY_SECRET}`,
    `X_ACCESS_TOKEN=${result.accessToken}`,
    `X_ACCESS_TOKEN_SECRET=${result.accessSecret}`,
    `X_EXPECTED_USERNAME=${username}`,
  ].join("\n");

  return html(
    "Fart Girl X credentials",
    `<h1>OAuth complete</h1>
      <p>Authorized X account: <strong>@${escapeHtml(username)}</strong></p>
      <p class="warning">Copy these values into Vercel Environment Variables. Do not share this page or its contents.</p>
      <pre>${escapeHtml(env)}</pre>
      <p>Keep <code>COMIC_PUBLISH_ENABLED=0</code> until the diagnostics endpoint confirms the account.</p>`,
  );
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    return url.searchParams.has("oauth_token")
      ? await completeAuthorization(request)
      : await startAuthorization(request);
  } catch (error) {
    console.error("[x/cb] OAuth setup failed", error);
    return html("Fart Girl X setup error", `<h1>OAuth setup failed</h1><p>${escapeHtml(error?.message || error)}</p>`);
  }
}