/**
 * CoinGecko public API client (keyless).
 *
 * Uses the free /simple/price endpoint, which needs no API key and
 * answers CORS requests from browsers (Access-Control-Allow-Origin: *).
 * One request fetches every watched coin, so a 60s poll stays far
 * below the free-tier rate limit (~10-30 calls/minute).
 *
 * Track rule (Even Realities Hackathon, Crypto & DeFi track): only the
 * listed apps qualify. CoinGecko is one of them; this module talks to
 * api.coingecko.com and nothing else.
 */

export interface WatchCoin {
  /** CoinGecko id, e.g. "bitcoin". */
  id: string
  /** Short symbol shown on the glasses, e.g. "BTC". */
  symbol: string
  /** Display name. */
  name: string
}

export interface CoinPrice {
  id: string
  symbol: string
  priceUsd: number
  /** 24h change in percent, or null when the API omits it. */
  change24h: number | null
}

export const WATCHLIST: WatchCoin[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'hyperliquid', symbol: 'HYPE', name: 'Hyperliquid' },
]

export const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
export const POLL_INTERVAL_MS = 60_000
export const MAX_BACKOFF_MS = 300_000

export class RateLimitedError extends Error {
  constructor() {
    super('CoinGecko rate limit (HTTP 429)')
    this.name = 'RateLimitedError'
  }
}

export function buildPriceUrl(ids: string[]): string {
  const params = new URLSearchParams({
    ids: ids.join(','),
    vs_currencies: 'usd',
    include_24hr_change: 'true',
  })
  return `${COINGECKO_BASE}/simple/price?${params.toString()}`
}

/**
 * Defensive parse: returns only coins present in the payload with a
 * numeric usd price. Unknown/malformed entries are skipped, never
 * thrown — a partial update beats a crash on the glasses.
 */
export function parsePriceResponse(
  json: unknown,
  coins: WatchCoin[],
): CoinPrice[] {
  if (typeof json !== 'object' || json === null) return []
  const root = json as Record<string, unknown>
  const out: CoinPrice[] = []
  for (const coin of coins) {
    const entry = root[coin.id]
    if (typeof entry !== 'object' || entry === null) continue
    const rec = entry as Record<string, unknown>
    const price = rec['usd']
    if (typeof price !== 'number' || !Number.isFinite(price)) continue
    const change = rec['usd_24h_change']
    out.push({
      id: coin.id,
      symbol: coin.symbol,
      priceUsd: price,
      change24h: typeof change === 'number' && Number.isFinite(change)
        ? change
        : null,
    })
  }
  return out
}

/** Exponential backoff after a 429, capped at MAX_BACKOFF_MS. */
export function nextBackoffMs(currentMs: number): number {
  return Math.min(currentMs * 2, MAX_BACKOFF_MS)
}

export async function fetchPrices(
  fetchImpl: typeof fetch,
  coins: WatchCoin[],
): Promise<CoinPrice[]> {
  const res = await fetchImpl(buildPriceUrl(coins.map((c) => c.id)), {
    headers: { accept: 'application/json' },
  })
  if (res.status === 429) throw new RateLimitedError()
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`)
  return parsePriceResponse(await res.json(), coins)
}
