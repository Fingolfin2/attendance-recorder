import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { builtInHolidayFor, holidayLabel, isHoliday } from './lib/holidays'
import {
  addMonths,
  canPunchNow,
  dailySummary,
  dateKey,
  datesInMonth,
  effectivePunches,
  formatBeijing,
  monthKey,
  monthStats,
  nextEligibleTime,
  parseBeijingLocal,
  toDatetimeLocal,
  uid,
} from './lib/attendance'
import { emptyData, loadData, parseImportedData, saveData } from './lib/storage'
import type { AppData, AuditLog, HolidayOverride, PunchRecord } from './lib/types'

type Tab = 'home' | 'calendar' | 'records' | 'holidays' | 'backup'

function App() {
  const [data, setData] = useState<AppData>(() => (typeof window === 'undefined' ? emptyData() : loadData()))
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [viewMonth, setViewMonth] = useState(monthKey(new Date()))
  const [message, setMessage] = useState('')
  const [manualTime, setManualTime] = useState(toDatetimeLocal(new Date()))
  const [manualNote, setManualNote] = useState('')
  const [holidayDate, setHolidayDate] = useState(dateKey(new Date()))
  const [holidayNote, setHolidayNote] = useState('')
  const [holidayValue, setHolidayValue] = useState('true')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('')
  const [editNote, setEditNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveData(data), [data])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const stats = useMemo(() => monthStats(viewMonth, data.punches, data.holidayOverrides), [viewMonth, data])
  const currentMonthStats = useMemo(() => monthStats(monthKey(now), data.punches, data.holidayOverrides), [now, data])
  const currentEligibility = useMemo(() => canPunchNow(now, data.punches), [now, data.punches])
  const nextTime = useMemo(() => nextEligibleTime(now, data.punches), [now, data.punches])
  const evaluated = useMemo(() => effectivePunches(data.punches), [data.punches])

  const updateData = (producer: (prev: AppData) => AppData) => setData((prev) => producer(prev))

  const addAudit = (action: AuditLog['action'], note: string, before?: unknown, after?: unknown): AuditLog => ({
    id: uid('audit'),
    action,
    createdAt: new Date().toISOString(),
    before,
    after,
    note,
  })

  const handlePunchNow = () => {
    const record: PunchRecord = { id: uid('punch'), occurredAt: now.toISOString(), createdAt: now.toISOString(), source: 'button', note: '按钮打卡' }
    const result = canPunchNow(now, data.punches)
    updateData((prev) => ({ ...prev, punches: [...prev.punches, record], auditLogs: [addAudit('add-punch', '按钮打卡', undefined, record), ...prev.auditLogs] }))
    setMessage(result.valid ? `已记录：${formatBeijing(record.occurredAt)}，本次计为有效打卡。` : `已记录原始打卡，但不新增有效次数：${result.reason}`)
  }

  const handleManualAdd = () => {
    if (!manualNote.trim()) return setMessage('补录必须填写备注。')
    const occurred = parseBeijingLocal(manualTime)
    const record: PunchRecord = { id: uid('punch'), occurredAt: occurred.toISOString(), createdAt: new Date().toISOString(), source: 'manual', note: manualNote.trim() }
    updateData((prev) => ({ ...prev, punches: [...prev.punches, record], auditLogs: [addAudit('add-punch', manualNote.trim(), undefined, record), ...prev.auditLogs] }))
    setManualNote('')
    setMessage('已补录打卡记录。')
  }

  const startEdit = (record: PunchRecord) => {
    setEditingId(record.id)
    setEditTime(toDatetimeLocal(record.occurredAt))
    setEditNote(record.note)
  }

  const saveEdit = (record: PunchRecord) => {
    if (!editNote.trim()) return setMessage('修改记录必须填写备注。')
    const updated: PunchRecord = { ...record, occurredAt: parseBeijingLocal(editTime).toISOString(), note: editNote.trim(), source: 'manual' }
    updateData((prev) => ({
      ...prev,
      punches: prev.punches.map((item) => (item.id === record.id ? updated : item)),
      auditLogs: [addAudit('update-punch', editNote.trim(), record, updated), ...prev.auditLogs],
    }))
    setEditingId(null)
    setMessage('已修改打卡记录。')
  }

  const deleteRecord = (record: PunchRecord) => {
    const note = window.prompt('删除记录原因/备注（必填）')?.trim()
    if (!note) return setMessage('删除已取消：必须填写备注。')
    updateData((prev) => ({ ...prev, punches: prev.punches.filter((item) => item.id !== record.id), auditLogs: [addAudit('delete-punch', note, record, undefined), ...prev.auditLogs] }))
    setMessage('已删除记录，并写入审计日志。')
  }

  const upsertHoliday = () => {
    if (!holidayNote.trim()) return setMessage('修改节假日必须填写备注。')
    const next: HolidayOverride = { date: holidayDate, isHoliday: holidayValue === 'true', note: holidayNote.trim(), updatedAt: new Date().toISOString() }
    const before = data.holidayOverrides.find((item) => item.date === holidayDate)
    updateData((prev) => ({
      ...prev,
      holidayOverrides: [...prev.holidayOverrides.filter((item) => item.date !== holidayDate), next].sort((a, b) => a.date.localeCompare(b.date)),
      auditLogs: [addAudit('upsert-holiday', holidayNote.trim(), before, next), ...prev.auditLogs],
    }))
    setMessage('已保存节假日覆盖设置。')
  }

  const deleteHolidayOverride = (override: HolidayOverride) => {
    const note = window.prompt('删除节假日覆盖原因/备注（必填）')?.trim()
    if (!note) return setMessage('删除已取消：必须填写备注。')
    updateData((prev) => ({ ...prev, holidayOverrides: prev.holidayOverrides.filter((item) => item.date !== override.date), auditLogs: [addAudit('delete-holiday', note, override, undefined), ...prev.auditLogs] }))
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-recorder-${dateKey(new Date())}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const imported = parseImportedData(await file.text())
      const audit = addAudit('import-data', `导入备份：${file.name}`, data, imported)
      setData({ ...imported, auditLogs: [audit, ...imported.auditLogs] })
      setMessage('导入成功。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败。')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const days = datesInMonth(viewMonth)
  const sortedPunches = [...data.punches].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))

  return (
    <main className="app">
      <header className="hero-card">
        <div>
          <p className="eyebrow">手机专用 · 北京时间 · 离线优先 PWA</p>
          <h1>每日打卡记录器</h1>
          <p>发布到公网 HTTPS 后，请只在手机桌面 PWA 中打卡；安装后日常使用可脱离电脑。</p>
        </div>
        <div className="clock">
          <span>当前北京时间</span>
          <strong>{formatBeijing(now)}</strong>
        </div>
      </header>

      <nav className="tabs">
        {(['home', 'calendar', 'records', 'holidays', 'backup'] as Tab[]).map((tab) => (
          <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
            {tabName(tab)}
          </button>
        ))}
      </nav>

      {message && <div className="message">{message}<button onClick={() => setMessage('')}>×</button></div>}

      {activeTab === 'home' && (
        <section className="grid two">
          <article className="panel primary-panel">
            <h2>手机打卡</h2>
            <p className="status-line">当前判断：{currentEligibility.valid ? '现在点击会新增有效次数' : currentEligibility.reason}</p>
            <button className="punch-button" onClick={handlePunchNow}>我已打卡</button>
            <div className="next-time">下一可有效打卡时间：<strong>{formatBeijing(nextTime)}</strong></div>
          </article>
          <article className="panel stats-panel">
            <h2>{currentMonthStats.monthKey} 进度</h2>
            <div className="big-number">{currentMonthStats.effectivePunches}<span> / {currentMonthStats.requiredPunches}</span></div>
            <p>本月 {currentMonthStats.daysInMonth} 天，节假日 {currentMonthStats.holidayCount} 天，剩余 {currentMonthStats.remainingPunches} 次。</p>
            <progress value={currentMonthStats.effectivePunches} max={currentMonthStats.requiredPunches}></progress>
          </article>
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className="panel">
          <MonthToolbar viewMonth={viewMonth} setViewMonth={setViewMonth} />
          <div className="month-summary">
            <strong>本月应打卡 {stats.requiredPunches} 次</strong>
            <span>有效 {stats.effectivePunches} 次 · 节假日 {stats.holidayCount} 天 · 剩余 {stats.remainingPunches} 次</span>
          </div>
          <div className="calendar-grid">
            {days.map((day) => {
              const summary = dailySummary(day, data.punches)
              const holiday = isHoliday(day, data.holidayOverrides)
              return (
                <div key={day} className={`day-card ${holiday ? 'holiday' : ''} ${summary.validCount ? 'has-punch' : ''}`}>
                  <div className="day-top"><strong>{day.slice(8)}</strong>{holiday && <span>休</span>}</div>
                  <p>{holidayLabel(day, data.holidayOverrides) || '工作日/普通日'}</p>
                  <p>原始 {summary.rawCount} · 有效 {summary.validCount}</p>
                  <small>{summary.validSlots.join('、') || '无有效打卡'}</small>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === 'records' && (
        <section className="grid two">
          <article className="panel">
            <h2>补录打卡</h2>
            <label>打卡时间<input type="datetime-local" value={manualTime} onChange={(e) => setManualTime(e.target.value)} /></label>
            <label>备注<input value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="例如：手机没电后补录" /></label>
            <button onClick={handleManualAdd}>保存补录</button>
          </article>
          <article className="panel">
            <h2>有效记录摘要</h2>
            <p>累计有效打卡 {evaluated.length} 次；所有统计均由原始记录实时计算。</p>
          </article>
          <article className="panel wide">
            <h2>历史记录</h2>
            <div className="record-list">
              {sortedPunches.map((record) => {
                const result = data.punches.length ? data.punches && dailySummary(dateKey(record.occurredAt), data.punches).evaluated.find((item) => item.record.id === record.id) : undefined
                return (
                  <div className="record" key={record.id}>
                    {editingId === record.id ? (
                      <>
                        <input type="datetime-local" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                        <input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                        <button onClick={() => saveEdit(record)}>保存</button>
                        <button onClick={() => setEditingId(null)}>取消</button>
                      </>
                    ) : (
                      <>
                        <div><strong>{formatBeijing(record.occurredAt)}</strong><small>{record.source === 'button' ? '按钮' : '手动'} · {record.note}</small></div>
                        <span className={result?.valid ? 'badge ok' : 'badge'}>{result?.valid ? '有效' : result?.reason || '未计入'}</span>
                        <button onClick={() => startEdit(record)}>修改</button>
                        <button className="danger" onClick={() => deleteRecord(record)}>删除</button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'holidays' && (
        <section className="grid two">
          <article className="panel">
            <h2>节假日覆盖</h2>
            <label>日期<input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} /></label>
            <label>类型<select value={holidayValue} onChange={(e) => setHolidayValue(e.target.value)}><option value="true">节假日</option><option value="false">工作日/非节假日</option></select></label>
            <label>备注<input value={holidayNote} onChange={(e) => setHolidayNote(e.target.value)} placeholder="例如：单位另行放假" /></label>
            <button onClick={upsertHoliday}>保存覆盖</button>
            <p className="hint">当前内置：{builtInHolidayFor(holidayDate)?.name || '无'}</p>
          </article>
          <article className="panel">
            <h2>已设置覆盖</h2>
            {data.holidayOverrides.length === 0 && <p>暂无自定义节假日。</p>}
            {data.holidayOverrides.map((item) => (
              <div className="record" key={item.date}>
                <div><strong>{item.date}</strong><small>{item.isHoliday ? '节假日' : '工作日'} · {item.note}</small></div>
                <button className="danger" onClick={() => deleteHolidayOverride(item)}>删除</button>
              </div>
            ))}
          </article>
        </section>
      )}

      {activeTab === 'backup' && (
        <section className="grid two">
          <article className="panel">
            <h2>备份与恢复</h2>
            <button onClick={exportData}>导出 JSON 备份</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={importData} />
            <p className="hint">数据只保存在当前手机的当前浏览器/桌面 PWA 中，不与电脑同步。换手机、换浏览器或清数据前请先导出 JSON。</p>
          </article>
          <article className="panel">
            <h2>审计日志</h2>
            <div className="audit-list">
              {data.auditLogs.slice(0, 80).map((log) => (
                <div key={log.id} className="audit"><strong>{formatBeijing(log.createdAt)}</strong><span>{log.action} · {log.note}</span></div>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  )
}

function MonthToolbar({ viewMonth, setViewMonth }: { viewMonth: string; setViewMonth: (value: string) => void }) {
  return (
    <div className="toolbar">
      <button onClick={() => setViewMonth(addMonths(viewMonth, -1))}>上月</button>
      <input type="month" value={viewMonth} onChange={(event) => setViewMonth(event.target.value)} />
      <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}>下月</button>
    </div>
  )
}

function tabName(tab: Tab) {
  return ({ home: '首页', calendar: '日历', records: '记录', holidays: '节假日', backup: '备份' } as Record<Tab, string>)[tab]
}

export default App



