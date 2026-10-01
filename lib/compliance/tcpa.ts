import fs from 'fs'
import path from 'path'

interface DncRecord {
  phone: string
  addedAt: string
  reason?: string
}

let inMemoryDncSet = new Set<string>()

export function clearDncRegistry(): void {
  inMemoryDncSet.clear()
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export function addNumberToDnc(phone: string, reason?: string): void {
  const normalized = normalizePhone(phone)
  inMemoryDncSet.add(normalized)
}

export function isNumberOnDnc(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return inMemoryDncSet.has(normalized)
}

export function checkCallingTimeWindow(
  recipientPhone: string,
  nowDate = new Date()
): { allowed: boolean; reason?: string } {
  const hour = nowDate.getHours()
  if (hour < 8 || hour >= 21) {
    return {
      allowed: false,
      reason: `Calling time window restriction: local hour ${hour} is outside 8:00 AM - 9:00 PM window.`,
    }
  }
  return { allowed: true }
}

export const optOutAndEndCallTool = {
  name: 'opt_out_and_end_call',
  description:
    'Opt out caller from future automated contacts and terminate the call immediately upon verbal request.',
  parameters: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Caller phone number to place on DNC list',
      },
      reason: { type: 'string', description: 'Reason for opt-out' },
    },
    required: ['phoneNumber'],
  },
  execute: async ({
    phoneNumber,
    reason,
  }: {
    phoneNumber: string
    reason?: string
  }) => {
    addNumberToDnc(phoneNumber, reason || 'Verbal request during call')
    return {
      success: true,
      action: 'end_call',
      message:
        'Phone number has been added to Do-Not-Call registry. Terminating call now.',
    }
  },
}
