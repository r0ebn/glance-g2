import { describe, expect, it, vi } from 'vitest'
import {
  HYPERLIQUID_BASE,
  MAX_BACKOFF_MS,
  POLL_INTERVAL_MS,
  RateLimitedError,
  WATCHLIST,
  change24hFromCandles,
  fetchPrices,
  nextBackoffMs,
  parseCandlesResponse,
  parseMidsResponse,
} from '../hyperliquid.ts'

// Real response shapes captured live from api.hyperliquid.xyz, 23 Nov 2026.
const MIDS_FIXTURE = {
  BTC: '61114.5',
  ETH: '1725.15',
  SOL: '71.2295',
  HYPE: '62.6125',
  NOTACOIN: 'not-a-number',
}

// nowMs from the live verification run; target (now - 24h) falls inside
// the second candle below (t=1795320000000, T=1795323599999).
const NOW_MS = 1795408862295
const CANDLES_FIXTURE = [
  {
    t: 1795316400000, T: 1795319999999, s: 'BTC', i: '1h',
    o: '59467.0', c: '59326.0', h: '59578.0', l: '59094.0',
    v: '1715.12272', n: 15140,
  },
  {
    t: 1795320000000, T: 1795323599999, s: 'BTC', i: '1h',
    o: '59331.0', c: '59400.0', h: '59600.0', l: '59200.0',
    v: '1500.0', n: 14000,
  },
  {
    t: 1795406400000, T: 1795409999999, s: 'BTC', i: '1h',
    o: '61267.0', c: '61110.0', h: '61472.0', l: '61042.0',
    v: '868.22392', n: 8357,
  },
]

describe('WATCHLIST', () => {
  it('watches BTC, ETH, SOL, HYPE with HYPE on the @107 spot pair', () => {
    expect(WATCHLIST.map((c) => c.symbol)).toEqual(['BTC', 'ETH', 'SOL', 'HYPE'])
    expect(WATCHLIST.find((c) => c.symbol === 'HYPE')?.candleCoin).toBe('@107')
    expect(WATCHLIST.filter((c) => c.symbol !== 'HYPE').every((c) => c.candleCoin === c.symbol)).toBe(true)
  })
})

describe('parseMidsResponse', () => {
  it('parses string mids into numbers', () => {
    const mids = parseMidsResponse(MIDS_FIXTURE)
    expect(mids.get('BTC')).toBe(61114.5)
    expect(mids.get('HYPE')).toBe(62.6125)
    expect(mids.size).toBe(4)
  })

  it('skips non-numeric mids, keeps the rest', () => {
    const mids = parseMidsResponse({ BTC: '1', ETH: 42, SOL: 'NaN' })
    expect(mids.get('BTC')).toBe(1)
    expect(mids.has('ETH')).toBe(false)
    expect(mids.has('SOL')).toBe(false)
  })

  it('returns empty for non-object payloads', () => {
    expect(parseMidsResponse(null).size).toBe(0)
    expect(parseMidsResponse('nope').size).toBe(0)
    expect(parseMidsResponse([1, 2]).size).toBe(0)
  })
})

describe('parseCandlesResponse', () => {
  it('parses real candle shapes', () => {
    const candles = parseCandlesResponse(CANDLES_FIXTURE)
    expect(candles).toHaveLength(3)
    expect(candles[1]).toEqual({ t: 1795320000000, T: 1795323599999, open: 59331 })
  })

  it('skips malformed candles, keeps the rest', () => {
    const candles = parseCandlesResponse([
      { t: 1, T: 2, o: '10' },
      { t: 3, T: 4, o: 'not-a-number' },
      { t: '5', T: 6, o: '20' },
      { t: 7, T: 8, o: '0' },
      null,
    ])
    expect(candles).toEqual([{ t: 1, T: 2, open: 10 }])
  })

  it('returns empty for non-array payloads', () => {
    expect(parseCandlesResponse(null)).toEqual([])
    expect(parseCandlesResponse({})).toEqual([])
  })
})

describe('change24hFromCandles', () => {
  it('computes rolling 24h change from the covering candle', () => {
    const candles = parseCandlesResponse(CANDLES_FIXTURE)
    // Live-verified numbers: mid 61088.5 vs open 59331.0 -> +2.96%.
    expect(change24hFromCandles(candles, 61088.5, NOW_MS)).toBeCloseTo(2.96, 2)
  })

  it('returns null when no candle covers 24h ago', () => {
    const candles = parseCandlesResponse(CANDLES_FIXTURE)
    expect(change24hFromCandles(candles, 61088.5, NOW_MS + 48 * 3600_000)).toBeNull()
    expect(change24hFromCandles([], 61088.5, NOW_MS)).toBeNull()
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
  type Handler = (body: Record<string, unknown>) => { status: number; json: unknown }

  function mockFetch(handler: Handler) {
    return vi.fn().mockImplementation(async (url: string, init: { body?: string }) => {
      expect(url).toBe(`${HYPERLIQUID_BASE}/info`)
      const { status, json } = handler(JSON.parse(init.body ?? '{}') as Record<string, unknown>)
      return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => json,
      }
    }) as unknown as typeof fetch
  }

  function okHandler(body: Record<string, unknown>) {
    if (body['type'] === 'allMids') return { status: 200, json: MIDS_FIXTURE }
    if (body['type'] === 'candleSnapshot') {
      const req = body['req'] as Record<string, unknown>
      // Per-coin opens so each change differs and is checkable.
      const opens: Record<string, string> = {
        BTC: '59331.0', ETH: '1660.7', SOL: '69.45', '@107': '60.156',
      }
      const open = opens[String(req['coin'])] ?? '1'
      return {
        status: 200,
        json: [
          { t: 1795320000000, T: 1795323599999, s: String(req['coin']), i: '1h', o: open, c: open, h: open, l: open, v: '1', n: 1 },
        ],
      }
    }
    return { status: 400, json: {} }
  }

  it('returns parsed prices with 24h change on 200', async () => {
    const fetchImpl = mockFetch(okHandler)
    const out = await fetchPrices(fetchImpl, WATCHLIST, NOW_MS)
    expect(out).toHaveLength(4)
    expect(fetchImpl).toHaveBeenCalledTimes(5) // 1 mids + 4 candle requests
    const btc = out.find((p) => p.symbol === 'BTC')
    expect(btc?.priceUsd).toBe(61114.5)
    expect(btc?.change24h).toBeCloseTo(((61114.5 - 59331) / 59331) * 100, 2)
    const hype = out.find((p) => p.symbol === 'HYPE')
    expect(hype?.priceUsd).toBe(62.6125)
    expect(hype?.change24h).toBeCloseTo(((62.6125 - 60.156) / 60.156) * 100, 2)
  })

  it('skips coins missing from mids', async () => {
    const fetchImpl = mockFetch((body) =>
      body['type'] === 'allMids'
        ? { status: 200, json: { BTC: '1' } }
        : { status: 200, json: [] },
    )
    const out = await fetchPrices(fetchImpl, WATCHLIST, NOW_MS)
    expect(out).toEqual([
      { id: 'BTC', symbol: 'BTC', priceUsd: 1, change24h: null },
    ])
  })

  it('throws RateLimitedError on 429 from mids', async () => {
    const fetchImpl = mockFetch((body) =>
      body['type'] === 'allMids' ? { status: 429, json: {} } : { status: 200, json: [] },
    )
    await expect(fetchPrices(fetchImpl, WATCHLIST, NOW_MS)).rejects.toBeInstanceOf(
      RateLimitedError,
    )
  })

  it('throws on other HTTP errors from mids', async () => {
    const fetchImpl = mockFetch((body) =>
      body['type'] === 'allMids' ? { status: 500, json: {} } : { status: 200, json: [] },
    )
    await expect(fetchPrices(fetchImpl, WATCHLIST, NOW_MS)).rejects.toThrow('HTTP 500')
  })

  it('degrades a failed candle request to null change, keeps the price', async () => {
    const fetchImpl = mockFetch((body) =>
      body['type'] === 'allMids'
        ? { status: 200, json: MIDS_FIXTURE }
        : { status: 500, json: {} },
    )
    const out = await fetchPrices(fetchImpl, WATCHLIST, NOW_MS)
    expect(out).toHaveLength(4)
    expect(out.every((p) => p.change24h === null)).toBe(true)
    expect(out.find((p) => p.symbol === 'BTC')?.priceUsd).toBe(61114.5)
  })
})
