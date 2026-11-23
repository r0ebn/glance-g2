/**
 * Glasses rendering (pure functions, no SDK calls).
 *
 * The G2 canvas is 576x288 monochrome green. Rows must stay short:
 * keep every list item at or under 32 characters so it fits one line.
 */
import type { CoinPrice } from './hyperliquid.ts'
import { alertMarker, type AlertState } from './alerts.ts'

export const MAX_ROW_CHARS = 32

/** $57,908 for big prices, $68.09 for mid, $0.1234 for sub-dollar. */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${Math.round(price).toLocaleString('en-US')}`
  }
  if (price >= 1) return `$${price.toFixed(2)}`
  return `$${price.toFixed(4)}`
}

/** '+1.2%' / '-6.3%' / '--' when unknown. */
export function formatChange(change: number | null): string {
  if (change === null) return '--'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

/**
 * One list row: "BTC $57,908 -6.3% !" — symbol, price, 24h change,
 * alert marker. Falls back to "--" when no price has loaded yet.
 */
export function renderCoinRow(
  symbol: string,
  price: CoinPrice | undefined,
  alert: AlertState,
): string {
  const priceText = price ? formatPrice(price.priceUsd) : '--'
  const changeText = price ? formatChange(price.change24h) : '--'
  const marker = alertMarker(alert)
  const row = `${symbol} ${priceText} ${changeText}${marker ? ` ${marker}` : ''}`
  return row.length > MAX_ROW_CHARS ? row.slice(0, MAX_ROW_CHARS) : row
}

/**
 * Header line. Normal: "GLANCE 19:42" (local time of last update).
 * Stale data: "GLANCE STALE". Triggered alert: "ALERT BTC +5.2%".
 */
export function renderHeader(
  updatedAt: Date | null,
  stale: boolean,
  triggered: { symbol: string; movePct: number } | null,
): string {
  if (triggered) {
    const sign = triggered.movePct >= 0 ? '+' : ''
    return `ALERT ${triggered.symbol} ${sign}${triggered.movePct.toFixed(1)}%`
  }
  const time = updatedAt
    ? updatedAt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })
    : '--:--'
  return stale ? `GLANCE STALE ${time}` : `GLANCE ${time}`
}

/** Footer hint shown on the phone companion UI, not on the glasses. */
export function renderHint(): string {
  return 'Tap a coin to arm/disarm its +/-5% alert. Long-press to refresh. Double-tap to exit.'
}
