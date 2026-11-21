/**
 * Price-alert state machine (pure logic, no I/O).
 *
 * One alert per watched coin. Arming captures the current price as the
 * base; the alert triggers when the price moves away from the base by
 * at least `pct` percent in either direction. A triggered alert latches
 * until the user taps the coin again (acknowledge + disarm).
 *
 * The threshold is deliberately simple: a fixed percent from the arming
 * price. No server, no push, no background work — the app only checks
 * while it is open, which matches the G2 rule that an app cannot show
 * anything while the user has switched away.
 */

export interface AlertState {
  armed: boolean
  /** Price when armed, or null when never armed. */
  basePrice: number | null
  /** Threshold in percent, e.g. 5 means +/-5%. */
  pct: number
  /** Latched once the threshold is crossed. */
  triggered: boolean
  /** Timestamp (ms) of the trigger, or null. */
  triggeredAt: number | null
  /** Price at the moment of the trigger, or null. */
  triggerPrice: number | null
}

export const DEFAULT_ALERT_PCT = 5

export function createAlertState(): AlertState {
  return {
    armed: false,
    basePrice: null,
    pct: DEFAULT_ALERT_PCT,
    triggered: false,
    triggeredAt: null,
    triggerPrice: null,
  }
}

export function armAlert(
  state: AlertState,
  price: number,
  pct: number = DEFAULT_ALERT_PCT,
): AlertState {
  return {
    ...state,
    armed: true,
    basePrice: price,
    pct,
    triggered: false,
    triggeredAt: null,
    triggerPrice: null,
  }
}

export function disarmAlert(state: AlertState): AlertState {
  return {
    ...state,
    armed: false,
    triggered: false,
    triggeredAt: null,
    triggerPrice: null,
  }
}

/** Tap behaviour: armed -> disarm (and clear a latched trigger); idle -> arm. */
export function toggleAlert(state: AlertState, price: number): AlertState {
  return state.armed ? disarmAlert(state) : armAlert(state, price)
}

export interface CheckResult {
  state: AlertState
  /** True only on the poll where the threshold is first crossed. */
  justTriggered: boolean
}

/** Pure check: given the current price, does the alert fire now? */
export function checkAlert(
  state: AlertState,
  price: number,
  nowMs: number,
): CheckResult {
  if (!state.armed || state.triggered || state.basePrice === null) {
    return { state, justTriggered: false }
  }
  const movePct = ((price - state.basePrice) / state.basePrice) * 100
  if (Math.abs(movePct) < state.pct) return { state, justTriggered: false }
  return {
    state: {
      ...state,
      triggered: true,
      triggeredAt: nowMs,
      triggerPrice: price,
    },
    justTriggered: true,
  }
}

/** Short marker for the glasses list row: '!!' triggered, '!' armed, '' idle. */
export function alertMarker(state: AlertState): string {
  if (state.triggered) return '!!'
  if (state.armed) return '!'
  return ''
}
