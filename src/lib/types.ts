export type PunchSource = 'button' | 'manual'

export interface PunchRecord {
  id: string
  occurredAt: string
  createdAt: string
  source: PunchSource
  note: string
}

export interface HolidayOverride {
  date: string
  isHoliday: boolean
  note: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  action: 'add-punch' | 'update-punch' | 'delete-punch' | 'upsert-holiday' | 'delete-holiday' | 'import-data'
  createdAt: string
  before?: unknown
  after?: unknown
  note: string
}

export interface AppData {
  version: 1
  punches: PunchRecord[]
  holidayOverrides: HolidayOverride[]
  auditLogs: AuditLog[]
}

export type SlotId = 'morning' | 'afternoon' | 'evening'

export interface SlotInfo {
  id: SlotId
  label: string
  startHour: number
  endHour: number
}

export interface EffectivePunch {
  record: PunchRecord
  slot: SlotId
  slotLabel: string
  dateKey: string
  valid: boolean
  reason: string
}

export interface MonthStats {
  monthKey: string
  daysInMonth: number
  holidayCount: number
  requiredPunches: number
  effectivePunches: number
  remainingPunches: number
}
