import { describe, expect, it, vi } from 'vitest'
import {
  COINGECKO_BASE,
  MAX_BACKOFF_MS,
  POLL_INTERVAL_MS,
  RateLimitedError,
  WATCHLIST,
  buildPriceUrl,
  fetchPrices,
  nextBackoffMs,
  parsePriceResponse,
} from '../coingecko.ts'

describe('buildPriceUrl', () => {
  it('requests all ids with usd and 24h change', () => {
    const url = new URL(buildPriceUrl(['bitcoin', 'solana']))
    expect(url.origin + url.pathname).toBe(`${COINGECKO_BASE}/simple/price`)
    expect(url.searchParams.get('ids')).toBe('bitcoin,solana')
    expect(url.searchParams.get('vs_currencies')).toBe('usd')
    expect(url.searchParams.get('include_24hr_change')).toBe('true')
  })
})

describe('parsePriceResponse', () => {
  it('parses a full payload', () => {
    const out = parsePriceResponse(
      {
        bitcoin: { usd: 57908, usd_24h_change: -6.34 },
        ethereum: { usd: 1640.32, usd_24h_change: -6.42 },
      },
      WATCHLIST,
    )
    expect(out).toHaveLength(2)
    expect(out[0]).toEqual({
      id: 'bitcoin',
      symbol: 'BTC',
      priceUsd: 57908,
      change24h: -6.34,
    })
  })

  it('skips missing or malformed entries, keeps the rest', () => {
    const out = parsePriceResponse(
      {
        bitcoin: { usd: 'not-a-number' },
        solana: { usd: 68.09 },
        hyperliquid: null,
      },
      WATCHLIST,
    )
    expect(out).toEqual([
      { id: 'solana', symbol: 'SOL', priceUsd: 68.09, change24h: null },
    ])
  })

  it('returns empty for non-object payloads', () => {
    expect(parsePriceResponse(null, WATCHLIST)).toEqual([])
    expect(parsePriceResponse('nope', WATCHLIST)).toEqual([])
  })
})

describe('nextBackoffMs', () => {
  it('doubles until the cap', () => {
    expect(nextBackoffMs(POLL_INTERVAL_MS)).toBe(120_000)
    expect(nextBackoffMs(MAX_BACKOFF_MS)).toBe(MAX_BACKOFF_MS)
    expect(nextBackoffMs(200_000)).toBe(MAX_BACKOFF_MS)
  })
})

describe('fetchPrices', () => {
  function mockFetch(status: number, body: unknown) {
    return vi.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    }) as unknown as typeof fetch
  }

  it('returns parsed prices on 200', async () => {
    const fetchImpl = mockFetch(200, { bitcoin: { usd: 1, usd_24h_change: 0 } })
    const out = await fetchPrices(fetchImpl, WATCHLIST)
    expect(out).toHaveLength(1)
    expect(fetchImpl).toHaveBeenCalledOnce()
  })

  it('throws RateLimitedError on 429', async () => {
    const fetchImpl = mockFetch(429, {})
    await expect(fetchPrices(fetchImpl, WATCHLIST)).rejects.toBeInstanceOf(
      RateLimitedError,
    )
  })

  it('throws on other HTTP errors', async () => {
    const fetchImpl = mockFetch(500, {})
    await expect(fetchPrices(fetchImpl, WATCHLIST)).rejects.toThrow('HTTP 500')
  })
})
