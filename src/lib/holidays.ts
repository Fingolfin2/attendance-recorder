import type { HolidayOverride } from './types'

export interface BuiltInHoliday {
  date: string
  name: string
  source: string
}

const source2025 = '国务院办公厅关于2025年部分节假日安排的通知（国办发明电〔2024〕12号）'
const source2026 = '国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）'

export const BUILTIN_HOLIDAYS: BuiltInHoliday[] = [
  { date: '2025-01-01', name: '元旦', source: source2025 },
  ...range('2025-01-28', '2025-02-04', '春节', source2025),
  ...range('2025-04-04', '2025-04-06', '清明节', source2025),
  ...range('2025-05-01', '2025-05-05', '劳动节', source2025),
  ...range('2025-05-31', '2025-06-02', '端午节', source2025),
  ...range('2025-10-01', '2025-10-08', '国庆节/中秋节', source2025),
  ...range('2026-01-01', '2026-01-03', '元旦', source2026),
  ...range('2026-02-15', '2026-02-23', '春节', source2026),
  ...range('2026-04-04', '2026-04-06', '清明节', source2026),
  ...range('2026-05-01', '2026-05-05', '劳动节', source2026),
  ...range('2026-06-19', '2026-06-21', '端午节', source2026),
  ...range('2026-09-25', '2026-09-27', '中秋节', source2026),
  ...range('2026-10-01', '2026-10-07', '国庆节', source2026),
]

function range(start: string, end: string, name: string, source: string): BuiltInHoliday[] {
  const out: BuiltInHoliday[] = []
  let cursor = Date.parse(`${start}T00:00:00+08:00`)
  const endMs = Date.parse(`${end}T00:00:00+08:00`)
  while (cursor <= endMs) {
    out.push({ date: dateKeyFromBeijingMs(cursor), name, source })
    cursor += 24 * 60 * 60 * 1000
  }
  return out
}

function dateKeyFromBeijingMs(ms: number) {
  const beijing = new Date(ms + 8 * 60 * 60 * 1000)
  return beijing.toISOString().slice(0, 10)
}

export function builtInHolidayFor(date: string) {
  return BUILTIN_HOLIDAYS.find((item) => item.date === date)
}

export function isHoliday(date: string, overrides: HolidayOverride[]) {
  const override = overrides.find((item) => item.date === date)
  if (override) return override.isHoliday
  return Boolean(builtInHolidayFor(date))
}

export function holidayLabel(date: string, overrides: HolidayOverride[]) {
  const override = overrides.find((item) => item.date === date)
  if (override) return override.isHoliday ? `自定义节假日：${override.note || '无备注'}` : `自定义工作日：${override.note || '无备注'}`
  const builtIn = builtInHolidayFor(date)
  return builtIn ? `${builtIn.name}（内置）` : ''
}

