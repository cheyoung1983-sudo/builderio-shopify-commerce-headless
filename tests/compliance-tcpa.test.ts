import { describe, it, expect, beforeEach } from 'vitest'
import {
  addNumberToDnc,
  isNumberOnDnc,
  checkCallingTimeWindow,
  clearDncRegistry,
  optOutAndEndCallTool,
} from '../lib/compliance/tcpa'

describe('TCPA Compliance Module', () => {
  beforeEach(() => {
    clearDncRegistry()
  })

  it('should add numbers to internal DNC registry and correctly verify presence', () => {
    const phone = '+18005550199'
    expect(isNumberOnDnc(phone)).toBe(false)
    addNumberToDnc(phone, 'Verbal opt-out request')
    expect(isNumberOnDnc(phone)).toBe(true)
  })

  it('should allow calls within 8:00 AM to 9:00 PM local time window', () => {
    const phone = '+12125550100' // NY (Eastern Time)
    const validTime = new Date('2025-03-29T14:00:00-04:00') // 2:00 PM EDT (hour 14)
    const result = checkCallingTimeWindow(phone, validTime)
    expect(result.allowed).toBe(true)
  })

  it('should reject calls outside 8:00 AM to 9:00 PM local time window', () => {
    const phone = '+12125550100' // NY (Eastern Time)
    const lateTime = new Date('2025-03-29T22:30:00-04:00') // 10:30 PM EDT (hour 22)
    const result = checkCallingTimeWindow(phone, lateTime)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Calling time window restriction')
  })

  it('should execute optOutAndEndCallTool and add phone number to DNC list', async () => {
    const phone = '+18005550123'
    expect(isNumberOnDnc(phone)).toBe(false)

    const result = await optOutAndEndCallTool.execute({
      phoneNumber: phone,
      reason: 'User requested opt-out during call',
    })

    expect(result.success).toBe(true)
    expect(result.action).toBe('end_call')
    expect(isNumberOnDnc(phone)).toBe(true)
  })
})
