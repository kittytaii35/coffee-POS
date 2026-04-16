'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Users, Clock, AlertTriangle, CheckCircle, Search, Download, Calendar, Activity, Info
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

interface PROData {
  summary: { totalStaffToday: number; workingNow: number; totalHoursToday: number; lateCount: number }
  liveStaff: any[]
  alerts: { type: string, message: string, id: string }[]
  history: any[]
}

export default function ManagerAttendancePro() {
  const { lang } = useLanguage()
  const t = translations[lang].attendancePro

  const [data, setData] = useState<PROData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterEmp, setFilterEmp] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard/attendance-pro')
      const d = await res.json()
      if (!d.error) setData(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const t = setInterval(fetchData, 10000) // Poll every 10s for near real-time
    return () => clearInterval(t)
  }, [])

  const exportCSV = () => {
    if (!data || data.history.length === 0) return
    const headers = [t.colEmployee, t.colDate, t.colCheckIn, t.colCheckOut, t.colHours, t.colStatus, t.colGps]
    const rows = filteredHistory.map(r => [
      r.employees?.name || t.unknown,
      new Date(r.check_in).toLocaleDateString('th-TH'),
      new Date(r.check_in).toLocaleTimeString('th-TH'),
      r.check_out ? new Date(r.check_out).toLocaleTimeString('th-TH') : '-',
      (r.work_hours || 0).toFixed(2),
      r.status,
      r.latitude ? `${r.latitude},${r.longitude}` : 'No GPS'
    ])
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.map(s => `"${s}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const [uniqueEmps, filteredHistory] = useMemo(() => {
    if (!data) return [[], []]
    const emps = Array.from(new Set(data.history.map(r => r.employees?.name).filter(Boolean))) as string[]
    const h = data.history.filter(r => {
      const matchEmp = filterEmp === 'ALL' || r.employees?.name === filterEmp
      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus
      return matchEmp && matchStatus
    })
    return [emps, h]
  }, [data, filterEmp, filterStatus])

  const chartData = useMemo(() => {
    if (!data) return []
    // Sum hours per day for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { dateStr: d.toISOString().split('T')[0], label: d.toLocaleDateString('th-TH', { weekday: 'short' }), hours: 0 }
    })
    
    const nowTs = Date.now()
    data.history.forEach(r => {
      const dbDate = r.check_in.split('T')[0]
      const target = last7Days.find(d => typeof r.check_in === 'string' && r.check_in.startsWith(dbDate)) as any
      if (target) {
        let sessionHours = r.work_hours || 0
        if (!r.check_out && r.check_in) {
          const start = new Date(r.check_in).getTime()
          sessionHours = Math.max(0, (nowTs - start) / (1000 * 60 * 60))
        }
        const name = r.employees?.name || 'Unknown'
        target[name] = (target[name] || 0) + sessionHours
        target.total = (target.total || 0) + sessionHours
      }
    })
    return last7Days.map(d => ({ ...d }))
  }, [data])

  const chartColors = ['#d4af37', '#22c55e', '#60a5fa', '#ec4899', '#a78bfa', '#fb923c', '#06b6d4']

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--coffee-light)' }}>{t.loadingPro}</div>
  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{t.errLoadPro}</div>

  const s = data.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <KPI icon={<Users size={24}/>} title={t.totalStaffToday} value={s.totalStaffToday} color="#d4af37" />
        <KPI icon={<Activity size={24}/>} title={t.workingNow} value={s.workingNow} color="#22c55e" pulse />
        <KPI icon={<Clock size={24}/>} title={t.totalHours} value={`${s.totalHoursToday.toFixed(1)}h`} color="#60a5fa" />
        <KPI icon={<AlertTriangle size={24}/>} title={t.lateArrivals} value={s.lateCount} color={s.lateCount > 0 ? '#ef4444' : '#9ca3af'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Live Staff Chart */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#22c55e" /> {t.liveStaff}
            </h3>
            {data.liveStaff.length === 0 ? (
              <p style={{ color: 'var(--coffee-light)', fontSize: '14px', fontStyle: 'italic' }}>{t.noOneWorking}</p>
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {data.liveStaff.map(l => {
                  const hrs = ((Date.now() - new Date(l.check_in).getTime()) / 3600000).toFixed(1)
                  return (
                    <div key={l.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', minWidth: '160px' }}>
                      <p style={{ fontWeight: '800', color: '#166534' }}>{l.employees?.name}</p>
                      <p style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>{t.in} {new Date(l.check_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                      <p style={{ fontSize: '18px', fontWeight: '900', color: '#22c55e', marginTop: '4px' }}>{hrs} <span style={{fontSize:'12px', fontWeight:'600'}}>{t.hrs}</span></p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Historical Table & Analytics */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f0e8df', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--coffee-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} /> {t.attendanceRecords}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={selStyle}>
                  <option value="ALL">{t.allEmployees}</option>
                  {uniqueEmps.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selStyle}>
                  <option value="ALL">{t.allStatus}</option>
                  <option value="working">{t.statusWorking}</option>
                  <option value="done">{t.statusDone}</option>
                </select>
                <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--coffee-dark)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', border: 'none', cursor: 'pointer' }}>
                  <Download size={14} /> {t.exportCsv}
                </button>
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#fafcfb', borderBottom: '2px solid #f0e8df' }}>
                  <tr>
                    {[t.colEmployee, t.colDate, t.colCheckIn, t.colCheckOut, t.colHours, t.colStatus, t.colGps, t.colPhoto].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--coffee-light)', fontWeight: '700' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.slice(0, 15).map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0e8df' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--coffee-dark)' }}>{r.employees?.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--coffee-medium)' }}>{new Date(r.check_in).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600' }}>{new Date(r.check_in).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' })}</td>
                      <td style={{ padding: '12px 16px' }}>{r.check_out ? new Date(r.check_out).toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' }) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--gold)' }}>
                        {(() => {
                          let h = r.work_hours || 0
                          if (!r.check_out && r.check_in && r.status === 'working') {
                            h = (Date.now() - new Date(r.check_in).getTime()) / 3600000
                          }
                          return h > 0 ? h.toFixed(1) : '-'
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: r.status === 'working' ? '#d1fae5' : '#f3f4f6', color: r.status === 'working' ? '#059669' : '#6b7280' }}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{r.latitude ? '✅' : '❌'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{r.image_url ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredHistory.length > 15 && (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--coffee-light)', fontSize: '13px', background: '#fafcfb' }}>
                {t.showingDesc} {filteredHistory.length} {t.recordsName}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column (Alerts & Chart) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Alerts Panel */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#ef4444" /> {t.systemAlerts}
            </h3>
            {data.alerts.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', background: '#f0fdf4', padding: '12px', borderRadius: '12px' }}>
                <CheckCircle size={16} /> <span style={{ fontSize: '13px', fontWeight: '600' }}>{t.sysNominal}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.alerts.map(a => {
                  const bg = a.type === 'danger' ? '#fef2f2' : a.type === 'warning' ? '#fffbeb' : '#eff6ff'
                  const color = a.type === 'danger' ? '#ef4444' : a.type === 'warning' ? '#f59e0b' : '#3b82f6'
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: bg, padding: '12px', borderRadius: '12px', borderLeft: `4px solid ${color}` }}>
                      <AlertTriangle size={16} color={color} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--coffee-dark)', lineHeight: '1.4' }}>{a.message}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Chart */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '16px' }}>
              {t.hours7Days}
            </h3>
            <div style={{ width: '100%', height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  {uniqueEmps.map((name, i) => (
                    <Bar 
                      key={name}
                      dataKey={name} 
                      stackId="a" 
                      fill={chartColors[i % chartColors.length]} 
                      radius={i === uniqueEmps.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', justifyContent: 'center' }}>
              {uniqueEmps.map((name, i) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: chartColors[i % chartColors.length] }} />
                  <span style={{ fontSize: '10px', color: 'var(--coffee-light)', fontWeight: '600' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ icon, title, value, color, pulse = false }: { icon: any, title: string, value: any, color: string, pulse?: boolean }) {
  return (
    <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', minHeight: '120px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: pulse ? 'pulse-glow 2s infinite' : 'none' }}>
        {icon}
      </div>
      <div>
        <p style={{ color: 'var(--coffee-light)', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>{title}</p>
        <p style={{ color: 'var(--coffee-dark)', fontSize: '28px', fontWeight: '900', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  )
}

const selStyle = {
  padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', color: 'var(--coffee-dark)', outline: 'none'
}
