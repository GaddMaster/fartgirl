export const FARTGIRL_CA = "Cjrrc595e9R47EZ3gkbUmL6ZZpLSxiXg16v2Y3Aapump";
export const FARTBOY_CA = "y1AZt42vceCmStjW4zetK3VoNarC1VxJ5iDjpiupump";

const FARTGIRL_ATH_MARKET_CAP = 20_000_000;
const FARTGIRL_TARGET_MARKET_CAP = 1_000_000_000;

async function getJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} ${response.status}`);
  return response.json();
}

export function compactUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (abs >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toPrecision(3)}`;
}

function percent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

async function getMemeTokens() {
  const pairs = await getJson(`https://api.dexscreener.com/tokens/v1/solana/${FARTGIRL_CA},${FARTBOY_CA}`);
  const best = new Map();
  for (const pair of Array.isArray(pairs) ? pairs : []) {
    const address = pair?.baseToken?.address;
    if (![FARTGIRL_CA, FARTBOY_CA].includes(address)) continue;
    const current = best.get(address);
    if (!current || Number(pair?.liquidity?.usd || 0) > Number(current?.liquidity?.usd || 0)) {
      best.set(address, pair);
    }
  }

  const shape = (pair) => pair && {
    priceUsd: Number(pair.priceUsd),
    marketCap: Number(pair.marketCap || pair.fdv),
    change24h: Number(pair.priceChange?.h24),
    volume24h: Number(pair.volume?.h24),
    liquidityUsd: Number(pair.liquidity?.usd),
  };

  return { fartgirl: shape(best.get(FARTGIRL_CA)), fartboy: shape(best.get(FARTBOY_CA)) };
}

async function getMajors() {
  const data = await getJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true");
  const shape = (id) => data?.[id] && { priceUsd: data[id].usd, change24h: data[id].usd_24h_change };
  return { btc: shape("bitcoin"), eth: shape("ethereum"), sol: shape("solana") };
}

async function getGlobal() {
  const { data } = await getJson("https://api.coingecko.com/api/v3/global");
  return {
    totalMarketCap: data?.total_market_cap?.usd,
    change24h: data?.market_cap_change_percentage_24h_usd,
    btcDominance: data?.market_cap_percentage?.btc,
  };
}

async function getFearGreed() {
  const { data } = await getJson("https://api.alternative.me/fng/?limit=1");
  return data?.[0] && { value: Number(data[0].value), label: data[0].value_classification };
}

export async function getMarketSnapshot() {
  const [memes, majors, global, fearGreed] = await Promise.allSettled([
    getMemeTokens(),
    getMajors(),
    getGlobal(),
    getFearGreed(),
  ]);
  const value = (result) => (result.status === "fulfilled" ? result.value : null);

  return {
    fetchedAt: new Date().toISOString(),
    memes: value(memes),
    majors: value(majors),
    global: value(global),
    fearGreed: value(fearGreed),
    errors: [memes, majors, global, fearGreed]
      .filter((result) => result.status === "rejected")
      .map((result) => String(result.reason?.message || result.reason)),
  };
}

export function formatMarketSnapshot(snapshot) {
  const lines = [`Fetched ${snapshot.fetchedAt} (live APIs: DexScreener, CoinGecko, alternative.me).`];
  const { memes, majors, global, fearGreed } = snapshot;

  if (majors) {
    for (const [symbol, coin] of Object.entries(majors)) {
      if (coin) lines.push(`${symbol.toUpperCase()}: ${compactUsd(coin.priceUsd)} (${percent(coin.change24h)} 24h)`);
    }
  }
  if (global) {
    lines.push(`Total crypto market cap: ${compactUsd(global.totalMarketCap)} (${percent(global.change24h)} 24h), BTC dominance ${Number(global.btcDominance).toFixed(1)}%`);
  }
  if (fearGreed) lines.push(`Crypto Fear & Greed Index: ${fearGreed.value} (${fearGreed.label})`);

  const girl = memes?.fartgirl;
  if (girl) {
    lines.push(`$FARTGIRL: price ${compactUsd(girl.priceUsd)}, market cap ${compactUsd(girl.marketCap)} (${percent(girl.change24h)} 24h), 24h volume ${compactUsd(girl.volume24h)}, liquidity ${compactUsd(girl.liquidityUsd)}`);
    if (girl.marketCap > 0) {
      lines.push(`$FARTGIRL is ${(FARTGIRL_ATH_MARKET_CAP / girl.marketCap).toFixed(1)}x below its ~$20M ATH and ${Math.round(FARTGIRL_TARGET_MARKET_CAP / girl.marketCap)}x from the $1B / $1 dream.`);
    }
  }
  const boy = memes?.fartboy;
  if (boy) {
    lines.push(`$FARTBOY: price ${compactUsd(boy.priceUsd)}, market cap ${compactUsd(boy.marketCap)} (${percent(boy.change24h)} 24h)`);
  }
  if (snapshot.errors.length) lines.push(`Unavailable feeds (do not guess these numbers): ${snapshot.errors.join("; ")}`);

  return lines.join("\n");
}
