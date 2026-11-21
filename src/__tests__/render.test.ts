import { describe, expect, it } from 'vitest'
import {
  MAX_ROW_CHARS,
  formatChange,
  formatPrice,
  renderCoinRow,
  renderHeader,
} from '../render.ts'
import { armAlert, checkAlert, createAlertState } from '../alerts.ts'

describe('formatPrice', () => {
  it('rounds big prices without decimals', () => {
    expect(formatPrice(57908.4)).toBe('$57,908')
  })
  it('keeps two decimals for mid prices', () => {
    expect(formatPrice(68.09)).toBe('$68.09')
  })
  it('keeps four decimals below one dollar', () => {
    expect(formatPrice(0.123456)).toBe('$0.1235')
  })
})

describe('formatChange', () => {
  it('signs positive and negative moves', () => {
    expect(formatChange(1.24)).toBe('+1.2%')
    expect(formatChange(-6.34)).toBe('-6.3%')
    expect(formatChange(null)).toBe('--')
  })
})

describe('renderCoinRow', () => {
  it('renders symbol, price, change, and marker', () => {
    const row = renderCoinRow(
      'BTC',
      { id: 'bitcoin', symbol: 'BTC', priceUsd: 57908, change24h: -6.34 },
      armAlert(createAlertState(), 50000),
    )
    expect(row).toBe('BTC $57,908 -6.3% !')
  })

  it('shows dashes with no price yet', () => {
    expect(renderCoinRow('SOL', undefined, createAlertState())).toBe('SOL -- --')
  })

  it('marks a triggered alert with !!', () => {
    const { state } = checkAlert(armAlert(createAlertState(), 100), 106, 1)
    const row = renderCoinRow(
      'ETH',
      { id: 'ethereum', symbol: 'ETH', priceUsd: 106, change24h: 6 },
      state,
    )
    expect(row).toContain('!!')
  })

  it('never exceeds the max row length', () => {
    const row = renderCoinRow(
      'HYPE',
      { id: 'hyperliquid', symbol: 'HYPE', priceUsd: 1234567.89, change24h: -99.9 },
      armAlert(createAlertState(), 1),
    )
    expect(row.length).toBeLessThanOrEqual(MAX_ROW_CHARS)
  })
})

describe('renderHeader', () => {
  it('shows the time when fresh', () => {
    const header = renderHeader(new Date('2026-11-21T19:42:00'), false, null)
    expect(header).toMatch(/^GLANCE \d{2}:\d{2}$/)
  })

  it('flags stale data', () => {
    const header = renderHeader(new Date('2026-11-21T19:42:00'), true, null)
    expect(header).toContain('STALE')
  })

  it('shows the triggered alert first', () => {
    const header = renderHeader(null, false, { symbol: 'BTC', movePct: 5.2 })
    expect(header).toBe('ALERT BTC +5.2%')
  })
})
