import { isHoliday } from './holidays'
import type { EffectivePunch, HolidayOverride, MonthStats, PunchRecord, SlotId, SlotInfo } from './types'

export const BEIJING_TIME_ZONE = 'Asia/Shanghai'
export const FOUR_HOURS_MS = 4 * 60 * 60 * 1000
export const ONE_MINUTE_MS = 60 * 1000

export const SLOTS: SlotInfo[] = [
  { id: 'morning', label: '第一时段 07:00-12:00', startHour: 7, endHour: 12 },
  { id: 'afternoon', label: '第二时段 12:00-18:00', startHour: 12, endHour: 18 },
  { id: 'evening', label: '第三时段 18:00之后', startHour: 18, endHour: 24 },
]

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BEIJING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getBeijingParts(input: Date | string | number) {
  const date = input instanceof Date ? input : new Date(input)
  const parts = formatter.formatToParts(date)
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  }
}

export function dateKey(input: Date | string | number) {
  const p = getBeijingParts(input)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function monthKey(input: Date | string | number) {
  const p = getBeijingParts(input)
  return `${p.year}-${pad(p.month)}`
}

export function formatBeijing(input: Date | string | number) {
  const p = getBeijingParts(input)
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`
}

export function toDatetimeLocal(input: Date | string | number) {
  const p = getBeijingParts(input)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

export function parseBeijingLocal(value: string) {
  return new Date(`${value}:00+08:00`)
}

export function beijingDateAt(date: string, hour: number, minute = 0, second = 0, ms = 0) {
  return new Date(`${date}T${pad(hour)}:${pad(minute)}:${pad(second)}.${String(ms).padStart(3, '0')}+08:00`)
}

export function slotFor(input: Date | string | number): SlotInfo | null {
  const { hour } = getBeijingParts(input)
  return SLOTS.find((slot) => hour >= slot.startHour && hour < slot.endHour) ?? null
}

export function daysInMonthFromKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function datesInMonth(key: string) {
  const total = daysInMonthFromKey(key)
  return Array.from({ length: total }, (_, idx) => `${key}-${pad(idx + 1)}`)
}

export function addMonths(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export function evaluatePunches(punches: PunchRecord[]): EffectivePunch[] {
  const sorted = [...punches].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt))
  const accepted: EffectivePunch[] = []
  const usedDateSlots = new Set<string>()

  return sorted.map((record) => {
    const occurredMs = Date.parse(record.occurredAt)
    const slot = slotFor(record.occurredAt)
    const day = dateKey(record.occurredAt)
    if (!slot) {
      return { record, slot: 'morning' as SlotId, slotLabel: '非有效时段', dateKey: day, valid: false, reason: '00:00-07:00 不属于有效打卡时段' }
    }

    const dateSlotKey = `${day}:${slot.id}`
    if (usedDateSlots.has(dateSlotKey)) {
      return { record, slot: slot.id, slotLabel: slot.label, dateKey: day, valid: false, reason: '同一日期同一时段已有 1 次有效打卡' }
    }

    const last = accepted.at(-1)
    if (last) {
      const lastMs = Date.parse(last.record.occurredAt)
      if (occurredMs - lastMs <= FOUR_HOURS_MS) {
        return { record, slot: slot.id, slotLabel: slot.label, dateKey: day, valid: false, reason: '距离上一条有效打卡未严格超过 4 小时' }
      }
    }

    const result: EffectivePunch = { record, slot: slot.id, slotLabel: slot.label, dateKey: day, valid: true, reason: '有效打卡' }
    accepted.push(result)
    usedDateSlots.add(dateSlotKey)
    return result
  })
}

export function effectivePunches(punches: PunchRecord[]) {
  return evaluatePunches(punches).filter((item) => item.valid)
}

export function monthStats(month: string, punches: PunchRecord[], overrides: HolidayOverride[]): MonthStats {
  const days = datesInMonth(month)
  const holidayCount = days.filter((date) => isHoliday(date, overrides)).length
  const requiredPunches = Math.ceil((40 * (days.length - holidayCount)) / days.length)
  const effectivePunchesInMonth = effectivePunches(punches).filter((item) => item.dateKey.startsWith(month)).length
  return {
    monthKey: month,
    daysInMonth: days.length,
    holidayCount,
    requiredPunches,
    effectivePunches: effectivePunchesInMonth,
    remainingPunches: Math.max(0, requiredPunches - effectivePunchesInMonth),
  }
}

export function dailySummary(date: string, punches: PunchRecord[]) {
  const raw = punches.filter((item) => dateKey(item.occurredAt) === date)
  const evaluated = evaluatePunches(punches).filter((item) => item.dateKey === date)
  const valid = evaluated.filter((item) => item.valid)
  return {
    date,
    rawCount: raw.length,
    validCount: valid.length,
    validSlots: valid.map((item) => item.slotLabel),
    evaluated,
  }
}

export function nextEligibleTime(now: Date, punches: PunchRecord[]) {
  const valid = effectivePunches(punches)
  const usedDateSlots = new Set(valid.map((item) => `${item.dateKey}:${item.slot}`))
  const last = valid.at(-1)
  const minAfterLast = last ? new Date(Date.parse(last.record.occurredAt) + FOUR_HOURS_MS + ONE_MINUTE_MS) : null
  const nowMs = now.getTime()
  const today = dateKey(now)
  const currentMonth = monthKey(now)
  const candidateMonths = [currentMonth, addMonths(currentMonth, 1)]

  for (const month of candidateMonths) {
    for (const day of datesInMonth(month)) {
      if (day < today) continue
      for (const slot of SLOTS) {
        if (usedDateSlots.has(`${day}:${slot.id}`)) continue
        const slotStart = beijingDateAt(day, slot.startHour)
        const slotEnd = slot.endHour === 24 ? beijingDateAt(day, 23, 59, 59, 999) : beijingDateAt(day, slot.endHour)
        const start = new Date(Math.max(nowMs, slotStart.getTime(), minAfterLast?.getTime() ?? 0))
        if (start.getTime() <= slotEnd.getTime()) return start
      }
    }
  }

  return beijingDateAt(`${addMonths(currentMonth, 2)}-01`, 7)
}

export function canPunchNow(now: Date, punches: PunchRecord[]) {
  const candidate: PunchRecord = { id: 'candidate', occurredAt: now.toISOString(), createdAt: now.toISOString(), source: 'button', note: '' }
  return evaluatePunches([...punches, candidate]).at(-1)!
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}
