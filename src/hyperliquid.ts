/**
 * Hyperliquid public info API client (keyless).
 *
 * Uses the public /info endpoint, which needs no API key and answers
 * CORS requests from browsers (Access-Control-Allow-Origin: *,
 * verified live 23 Nov 2026). Two request shapes:
 *
 * - {"type":"allMids"} returns every mid price as a flat object
 *   { "BTC": "61114.5", ... } (string values, 1430+ keys).
 * - {"type":"candleSnapshot","req":{coin, interval:"1h", startTime,
 *   endTime}} returns hourly candles [{t, T, s, i, o, c, h, l, v, n}]
 *   with string prices. allMids carries no 24h change, so the change
 *   is computed from candles: the candle covering the moment 24h ago
 *   gives the reference open, change = (mid - open) / open * 100.
 *   That is a genuine rolling 24h change, not a day-open change.
 *
 * HYPE is a spot asset: its candles live under the HYPE/USDC spot
 * pair "@107" (pair index verified via spotMeta, 23 Nov 2026).
 * BTC/ETH/SOL are perps and use their plain symbols. If Hyperliquid
 * ever reindexes the spot pairs, the HYPE change degrades to null
 * (shown as "--") rather than a wrong number.
 *
 * Track rule (Even Realities Hackathon, Crypto & DeFi track): only
 * the listed apps qualify. Hyperliquid is one of them (Gram Wallet,
 * Polymarket, Hyperliquid, Trust Wallet); this module talks to
 * api.hyperliquid.xyz and nothing else. It replaced the CoinGecko
 * client on 23 Nov 2026 because CoinGecko is not on that list.
 */

export interface WatchCoin {
  /** Stable key, e.g. "BTC". Also the perp coin id on Hyperliquid. */
  id: string
  /** Short symbol shown on the glasses, e.g. "BTC". */
  symbol: string
  /** Display name. */
  name: string
  /** Coin id for candleSnapshot: plain symbol for perps, "@107" for HYPE spot. */
  candleCoin: string
}

export interface CoinPrice {
  id: string
  symbol: string
  priceUsd: number
  /** Rolling 24h change in percent, or null when it cannot be computed. */
  change24h: number | null
}

export const WATCHLIST: WatchCoin[] = [
  { id: 'BTC', symbol: 'BTC', name: 'Bitcoin', candleCoin: 'BTC' },
  { id: 'ETH', symbol: 'ETH', name: 'Ethereum', candleCoin: 'ETH' },
  { id: 'SOL', symbol: 'SOL', name: 'Solana', candleCoin: 'SOL' },
  { id: 'HYPE', symbol: 'HYPE', name: 'Hyperliquid', candleCoin: '@107' },
]

export const HYPERLIQUID_BASE = 'https://api.hyperliquid.xyz'
export const POLL_INTERVAL_MS = 60_000
export const MAX_BACKOFF_MS = 300_000
/** Candle window covers 25h so the candle for "24h ago" is always inside. */
export const CANDLE_WINDOW_MS = 25 * 3600_000
export const DAY_MS = 24 * 3600_000

export class RateLimitedError extends Error {
  constructor() {
    super('Hyperliquid rate limit (HTTP 429)')
    this.name = 'RateLimitedError'
  }
}

export interface Candle {
  /** Open time (ms epoch). */
  t: number
  /** Close time (ms epoch). */
  T: number
  /** Open price. */
  open: number
}

/**
 * Defensive parse of the allMids payload: a flat object mapping coin
 * symbols to string mids. Returns only finite numeric mids.
 */
export function parseMidsResponse(json: unknown): Map<string, number> {
  const out = new Map<string, number>()
  if (typeof json !== 'object' || json === null) return out
  for (const [coin, raw] of Object.entries(json as Record<string, unknown>)) {
    const price = typeof raw === 'string' ? Number(raw) : NaN
    if (Number.isFinite(price)) out.set(coin, price)
  }
  return out
}

/**
 * Defensive parse of a candleSnapshot payload: an array of candle
 * objects. Only candles with numeric t/T and a finite numeric open
 * are kept; the rest are skipped, never thrown.
 */
export function parseCandlesResponse(json: unknown): Candle[] {
  if (!Array.isArray(json)) return []
  const out: Candle[] = []
  for (const entry of json) {
    if (typeof entry !== 'object' || entry === null) continue
    const rec = entry as Record<string, unknown>
    const t = rec['t']
    const T = rec['T']
    const o = rec['o']
    if (typeof t !== 'number' || typeof T !== 'number') continue
    const open = typeof o === 'string' ? Number(o) : NaN
    if (!Number.isFinite(open) || open <= 0) continue
    out.push({ t, T, open })
  }
  return out
}

/**
 * Rolling 24h change in percent from hourly candles and the current
 * mid: the candle covering (nowMs - 24h) gives the reference open.
 * Returns null when no candle covers that moment (e.g. a coin with
 * less than 24h of history) — a missing change beats a fake one.
 */
export function change24hFromCandles(
  candles: Candle[],
  mid: number,
  nowMs: number,
): number | null {
  const target = nowMs - DAY_MS
  const ref = candles.find((c) => c.t <= target && target <= c.T)
  if (!ref) return null
  return ((mid - ref.open) / ref.open) * 100
}

/** Exponential backoff after a 429, capped at MAX_BACKOFF_MS. */
export function nextBackoffMs(currentMs: number): number {
  return Math.min(currentMs * 2, MAX_BACKOFF_MS)
}

async function postInfo(
  fetchImpl: typeof fetch,
  body: unknown,
): Promise<unknown> {
  const res = await fetchImpl(`${HYPERLIQUID_BASE}/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 429) throw new RateLimitedError()
  if (!res.ok) throw new Error(`Hyperliquid HTTP ${res.status}`)
  return res.json()
}

/**
 * Fetch prices + rolling 24h change for every watched coin: one
 * allMids request plus one 1h-candle request per coin, in parallel.
 *
 * A failed mids request is fatal (no prices at all — the caller keeps
 * last-good data and marks STALE). A failed candle request only costs
 * that coin's 24h change (null), so a candle hiccup never loses a
 * good price update.
 */
export async function fetchPrices(
  fetchImpl: typeof fetch,
  coins: WatchCoin[],
  nowMs: number = Date.now(),
): Promise<CoinPrice[]> {
  const mids = parseMidsResponse(await postInfo(fetchImpl, { type: 'allMids' }))
  const startTime = nowMs - CANDLE_WINDOW_MS
  const candleResults = await Promise.allSettled(
    coins.map((coin) =>
      postInfo(fetchImpl, {
        type: 'candleSnapshot',
        req: { coin: coin.candleCoin, interval: '1h', startTime, endTime: nowMs },
      }),
    ),
  )
  const out: CoinPrice[] = []
  coins.forEach((coin, index) => {
    const price = mids.get(coin.id)
    if (price === undefined) return
    const settled = candleResults[index]
    const candles =
      settled?.status === 'fulfilled' ? parseCandlesResponse(settled.value) : []
    out.push({
      id: coin.id,
      symbol: coin.symbol,
      priceUsd: price,
      change24h: change24hFromCandles(candles, price, nowMs),
    })
  })
  return out
}
