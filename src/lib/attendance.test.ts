import { describe, expect, it } from 'vitest'
import { canPunchNow, evaluatePunches, monthStats, slotFor } from './attendance'
import type { HolidayOverride, PunchRecord } from './types'

const punch = (id: string, local: string): PunchRecord => ({
  id,
  occurredAt: new Date(`${local}:00+08:00`).toISOString(),
  createdAt: new Date(`${local}:00+08:00`).toISOString(),
  source: 'manual',
  note: 'test',
})

describe('attendance rules', () => {
  it('counts only one valid punch in the same date slot', () => {
    const result = evaluatePunches([
      punch('a', '2026-06-01T07:30'),
      punch('b', '2026-06-01T11:59'),
    ])
    expect(result.map((item) => item.valid)).toEqual([true, false])
    expect(result[1].reason).toContain('同一日期同一时段')
  })

  it('requires cross-slot interval to be strictly more than four hours', () => {
    const exactly = evaluatePunches([punch('a', '2026-06-01T08:00'), punch('b', '2026-06-01T12:00')])
    const over = evaluatePunches([punch('a', '2026-06-01T07:59'), punch('b', '2026-06-01T12:00')])
    expect(exactly[1].valid).toBe(false)
    expect(over[1].valid).toBe(true)
  })

  it('assigns boundary times to expected slots', () => {
    expect(slotFor(new Date('2026-06-01T06:59:59+08:00'))?.id).toBeUndefined()
    expect(slotFor(new Date('2026-06-01T07:00:00+08:00'))?.id).toBe('morning')
    expect(slotFor(new Date('2026-06-01T12:00:00+08:00'))?.id).toBe('afternoon')
    expect(slotFor(new Date('2026-06-01T18:00:00+08:00'))?.id).toBe('evening')
  })

  it('rounds monthly requirement up and applies holiday overrides', () => {
    const overrides: HolidayOverride[] = [
      { date: '2026-06-03', isHoliday: true, note: 'custom', updatedAt: new Date().toISOString() },
    ]
    const stats = monthStats('2026-06', [], overrides)
    // Built-in 2026 Dragon Boat holiday has 3 days; plus one custom day = 4 holidays.
    expect(stats.holidayCount).toBe(4)
    expect(stats.requiredPunches).toBe(Math.ceil((40 * 26) / 30))
  })

  it('explains invalid early-morning button punches', () => {
    const result = canPunchNow(new Date('2026-06-01T06:30:00+08:00'), [])
    expect(result.valid).toBe(false)
    expect(result.reason).toContain('00:00-07:00')
  })
})
