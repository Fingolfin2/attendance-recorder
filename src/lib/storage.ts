import type { AppData } from './types'

export const STORAGE_KEY = 'attendance-recorder:v1'

export const emptyData = (): AppData => ({
  version: 1,
  punches: [],
  holidayOverrides: [],
  auditLogs: [],
})

export const loadData = (): AppData => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      version: 1,
      punches: Array.isArray(parsed.punches) ? parsed.punches : [],
      holidayOverrides: Array.isArray(parsed.holidayOverrides) ? parsed.holidayOverrides : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    }
  } catch {
    return emptyData()
  }
}

export const saveData = (data: AppData) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const parseImportedData = (text: string): AppData => {
  const parsed = JSON.parse(text) as Partial<AppData>
  if (!Array.isArray(parsed.punches) || !Array.isArray(parsed.holidayOverrides) || !Array.isArray(parsed.auditLogs)) {
    throw new Error('导入文件缺少 punches / holidayOverrides / auditLogs 字段')
  }
  return {
    version: 1,
    punches: parsed.punches,
    holidayOverrides: parsed.holidayOverrides,
    auditLogs: parsed.auditLogs,
  }
}
