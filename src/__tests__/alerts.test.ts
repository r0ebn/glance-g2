import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ALERT_PCT,
  armAlert,
  checkAlert,
  createAlertState,
  disarmAlert,
  toggleAlert,
  alertMarker,
} from '../alerts.ts'

describe('createAlertState', () => {
  it('starts disarmed with the default threshold', () => {
    const s = createAlertState()
    expect(s.armed).toBe(false)
    expect(s.triggered).toBe(false)
    expect(s.basePrice).toBeNull()
    expect(s.pct).toBe(DEFAULT_ALERT_PCT)
  })
})

describe('arm/disarm/toggle', () => {
  it('arming captures the base price', () => {
    const s = armAlert(createAlertState(), 100)
    expect(s.armed).toBe(true)
    expect(s.basePrice).toBe(100)
    expect(s.triggered).toBe(false)
  })

  it('disarming clears the latched trigger', () => {
    const armed = armAlert(createAlertState(), 100)
    const { state: fired } = checkAlert(armed, 106, 1000)
    expect(fired.triggered).toBe(true)
    const off = disarmAlert(fired)
    expect(off.armed).toBe(false)
    expect(off.triggered).toBe(false)
    expect(off.triggerPrice).toBeNull()
  })

  it('toggle arms when idle and disarms when armed', () => {
    const armed = toggleAlert(createAlertState(), 50)
    expect(armed.armed).toBe(true)
    const off = toggleAlert(armed, 50)
    expect(off.armed).toBe(false)
  })
})

describe('checkAlert', () => {
  it('does not fire below the threshold', () => {
    const armed = armAlert(createAlertState(), 100, 5)
    const { state, justTriggered } = checkAlert(armed, 104.9, 1000)
    expect(justTriggered).toBe(false)
    expect(state.triggered).toBe(false)
  })

  it('fires exactly at the threshold, up or down', () => {
    const up = checkAlert(armAlert(createAlertState(), 100, 5), 105, 1000)
    expect(up.justTriggered).toBe(true)
    expect(up.state.triggerPrice).toBe(105)
    const down = checkAlert(armAlert(createAlertState(), 100, 5), 95, 1000)
    expect(down.justTriggered).toBe(true)
  })

  it('fires only once (latched)', () => {
    const armed = armAlert(createAlertState(), 100, 5)
    const first = checkAlert(armed, 110, 1000)
    expect(first.justTriggered).toBe(true)
    const second = checkAlert(first.state, 120, 2000)
    expect(second.justTriggered).toBe(false)
    expect(second.state.triggerPrice).toBe(110)
  })

  it('ignores checks when disarmed or never armed', () => {
    expect(checkAlert(createAlertState(), 1000, 1000).justTriggered).toBe(false)
  })
})

describe('alertMarker', () => {
  it('marks triggered, armed, and idle distinctly', () => {
    expect(alertMarker(createAlertState())).toBe('')
    expect(alertMarker(armAlert(createAlertState(), 100))).toBe('!')
    const { state } = checkAlert(armAlert(createAlertState(), 100), 106, 1)
    expect(alertMarker(state)).toBe('!!')
  })
})
