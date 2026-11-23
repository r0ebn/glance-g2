/**
 * Glance — a glanceable Hyperliquid price + alert app for Even Realities G2.
 *
 * Glasses (576x288): a header line plus a 4-row watchlist (BTC, ETH, SOL,
 * HYPE). Tap a row to arm/disarm a +/-5% price alert for that coin; when
 * the price crosses the threshold while the app is open, the header
 * switches to an ALERT line. Long-press refreshes prices. Double-tap
 * exits (system confirmation dialog, as required on the root page).
 *
 * Phone (this WebView page): the same state as a companion UI, so the
 * app is usable and demoable in a plain browser even without glasses
 * or the simulator. When the Even bridge is absent (plain browser),
 * the app runs in phone-only mode after a short timeout.
 *
 * Data: Hyperliquid public info API, keyless, polled every 60s. Read-only —
 * no orders, no funds, no financial advice (hackathon money-safety rule).
 */
import './style.css'
import {
  CreateStartUpPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  OsEventTypeList,
  RebuildPageContainer,
  StartUpPageCreateResult,
  TextContainerProperty,
  waitForEvenAppBridge,
} from '@evenrealities/even_hub_sdk'
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  POLL_INTERVAL_MS,
  RateLimitedError,
  WATCHLIST,
  fetchPrices,
  nextBackoffMs,
  type CoinPrice,
} from './hyperliquid.ts'
import {
  checkAlert,
  createAlertState,
  toggleAlert,
  type AlertState,
} from './alerts.ts'
import { renderCoinRow, renderHeader, renderHint } from './render.ts'

const HEADER_ID = 1
const LIST_ID = 2
const BRIDGE_TIMEOUT_MS = 3000

interface AppState {
  prices: Map<string, CoinPrice>
  alerts: Map<string, AlertState>
  updatedAt: Date | null
  stale: boolean
  /** Most recently triggered coin, for the header. Null when none. */
  lastTriggered: { symbol: string; movePct: number } | null
}

const state: AppState = {
  prices: new Map(),
  alerts: new Map(WATCHLIST.map((c) => [c.id, createAlertState()])),
  updatedAt: null,
  stale: false,
  lastTriggered: null,
}

let bridge: EvenAppBridge | null = null
let pageCreated = false
let backoffMs = POLL_INTERVAL_MS
let pollTimer: ReturnType<typeof setTimeout> | null = null

function waitForBridgeOrTimeout(ms: number): Promise<EvenAppBridge | null> {
  return Promise.race([
    waitForEvenAppBridge(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

function headerText(): string {
  return renderHeader(state.updatedAt, state.stale, state.lastTriggered)
}

function listItems(): string[] {
  return WATCHLIST.map((coin) =>
    renderCoinRow(
      coin.symbol,
      state.prices.get(coin.id),
      state.alerts.get(coin.id) ?? createAlertState(),
    ),
  )
}

function buildHeaderContainer(): TextContainerProperty {
  return new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 40,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 4,
    containerID: HEADER_ID,
    containerName: 'header',
    content: headerText(),
    // Display-only: the simulator (and the device) allows only ONE
    // event-capturing container per page. The list owns input.
    isEventCapture: 0,
    textColor: 4,
  })
}

function buildListContainer(): ListContainerProperty {
  const items = listItems()
  return new ListContainerProperty({
    xPosition: 0,
    yPosition: 40,
    width: 576,
    height: 248,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 4,
    containerID: LIST_ID,
    containerName: 'coins',
    itemContainer: new ListItemContainerProperty({
      itemCount: items.length,
      itemWidth: 568,
      isItemSelectBorderEn: 1,
      itemName: items,
    }),
    isEventCapture: 1,
  })
}

async function renderGlasses(): Promise<void> {
  if (!bridge) return
  const header = buildHeaderContainer()
  const list = buildListContainer()
  if (!pageCreated) {
    const result = await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 2,
        textObject: [header],
        listObject: [list],
      }),
    )
    if (result !== StartUpPageCreateResult.success) {
      console.error('createStartUpPageContainer failed:', result)
      return
    }
    pageCreated = true
    return
  }
  // No listContainerUpgrade exists in the SDK: list content changes
  // go through a full page rebuild.
  const ok = await bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [header],
      listObject: [list],
    }),
  )
  if (!ok) console.error('rebuildPageContainer failed')
}

function renderPhone(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  const rows = WATCHLIST.map((coin, index) => {
    const price = state.prices.get(coin.id)
    const alert = state.alerts.get(coin.id) ?? createAlertState()
    const priceText = price
      ? `$${price.priceUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      : '--'
    const changeText = price?.change24h != null
      ? `${price.change24h >= 0 ? '+' : ''}${price.change24h.toFixed(1)}%`
      : '--'
    const alertText = alert.triggered
      ? `TRIGGERED at $${alert.triggerPrice?.toLocaleString('en-US') ?? '--'}`
      : alert.armed
        ? `ARMED +/-${alert.pct}% from $${alert.basePrice?.toLocaleString('en-US') ?? '--'}`
        : 'off'
    const btnLabel = alert.armed ? 'Disarm' : 'Arm +/-5%'
    return `<tr>
      <td><strong>${coin.symbol}</strong><br><small>${coin.name}</small></td>
      <td>${priceText}</td>
      <td>${changeText}</td>
      <td>${alertText}</td>
      <td><button data-toggle="${index}">${btnLabel}</button></td>
    </tr>`
  }).join('')
  const updatedText = state.updatedAt
    ? state.updatedAt.toLocaleTimeString('en-GB')
    : 'never'
  app.innerHTML = `
    <h1>Glance</h1>
    <p class="sub">Hyperliquid prices + alerts for Even G2 &middot; Crypto &amp; DeFi track</p>
    <p class="status">Glasses: ${bridge ? 'connected' : 'phone-only mode (no bridge)'} &middot;
    Updated: ${updatedText}${state.stale ? ' &middot; STALE (last fetch failed)' : ''}</p>
    <table>
      <thead><tr><th>Coin</th><th>Price</th><th>24h</th><th>Alert</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="hint">${renderHint()}</p>
    <p class="hint">Data: Hyperliquid public API (free, no key) &middot; read-only, no orders, no funds.</p>
  `
  app.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.toggle)
      toggleCoinAlert(index)
    })
  })
}

function toggleCoinAlert(index: number): void {
  const coin = WATCHLIST[index]
  if (!coin) return
  const price = state.prices.get(coin.id)
  const current = state.alerts.get(coin.id) ?? createAlertState()
  const next = price
    ? toggleAlert(current, price.priceUsd)
    : current.armed
      ? toggleAlert(current, current.basePrice ?? 0)
      : current
  state.alerts.set(coin.id, next)
  // Acknowledging a triggered alert clears the header banner.
  if (!next.triggered && state.lastTriggered?.symbol === coin.symbol) {
    state.lastTriggered = null
  }
  void renderGlasses()
  renderPhone()
}

async function refresh(): Promise<void> {
  try {
    const prices = await fetchPrices(fetch, WATCHLIST)
    const now = Date.now()
    for (const price of prices) {
      state.prices.set(price.id, price)
      const alert = state.alerts.get(price.id) ?? createAlertState()
      const { state: next, justTriggered } = checkAlert(alert, price.priceUsd, now)
      state.alerts.set(price.id, next)
      if (justTriggered && next.basePrice !== null) {
        const movePct = ((price.priceUsd - next.basePrice) / next.basePrice) * 100
        state.lastTriggered = { symbol: price.symbol, movePct }
      }
    }
    state.updatedAt = new Date()
    state.stale = false
    backoffMs = POLL_INTERVAL_MS
  } catch (err) {
    state.stale = true
    if (err instanceof RateLimitedError) {
      backoffMs = nextBackoffMs(backoffMs)
      console.warn(`Hyperliquid 429, backing off to ${backoffMs / 1000}s`)
    } else {
      console.warn('Price fetch failed, keeping last data:', err)
    }
  }
  await renderGlasses()
  renderPhone()
}

function scheduleNextPoll(): void {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = setTimeout(async () => {
    await refresh()
    scheduleNextPoll()
  }, backoffMs)
}

function handleListClick(index: number | undefined): void {
  if (index === undefined || index < 0 || index >= WATCHLIST.length) return
  toggleCoinAlert(index)
}

async function main(): Promise<void> {
  bridge = await waitForBridgeOrTimeout(BRIDGE_TIMEOUT_MS)
  console.log(
    `[glance] ready (bridge: ${bridge ? 'connected' : 'phone-only'})`,
  )
  if (bridge) {
    bridge.onEvenHubEvent((event) => {
      const listEvent = event.listEvent
      if (listEvent && listEvent.containerID === LIST_ID) {
        const type = listEvent.eventType
        if (type === OsEventTypeList.CLICK_EVENT || type === undefined) {
          handleListClick(listEvent.currentSelectItemIndex)
        } else if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
          void bridge?.shutDownPageContainer(1)
        } else if (type === OsEventTypeList.LONG_PRESS_EVENT) {
          void refresh()
        }
        return
      }
      const textEvent = event.textEvent
      if (textEvent && textEvent.containerID === HEADER_ID) {
        if (textEvent.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
          void bridge?.shutDownPageContainer(1)
        } else if (textEvent.eventType === OsEventTypeList.LONG_PRESS_EVENT) {
          void refresh()
        }
      }
    })
  }
  await refresh()
  scheduleNextPoll()
}

void main()
