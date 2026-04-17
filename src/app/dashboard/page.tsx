'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Calendar, Clock, Users, TrendingUp, Coffee,
  ChevronLeft, ChevronRight, Zap, AlertTriangle,
  CheckCircle, Info, BarChart2, Award, Target, RefreshCw, Globe
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import { analyzeOrders, AnalyticsResult } from '@/lib/analytics'
import type { Order } from '@/lib/analytics'
import ManagerAttendancePro from './components/ManagerAttendancePro'
import UnifiedReports from './components/UnifiedReports'
import CashControl from './components/CashControl'
import OrderHistory from './components/OrderHistory'
import ManagerMembers from './components/ManagerMembers'

// ─── Mock fallback with richer data ──────────────────────────
const mockOrders: Order[] = (() => {
  const now = new Date()
  const items = [
    { name: 'Bear Brand Thai Tea', price: 50, quantity: 2 },
    { name: 'Matcha Latte', price: 55, quantity: 1 },
    { name: 'Mango Smoothie', price: 40, quantity: 3 },
    { name: 'Avocado Honey', price: 55, quantity: 1 },
    { name: 'Oreo Cocoa', price: 50, quantity: 2 },
    { name: 'Strawberry Soda', price: 35, quantity: 1 },
    { name: 'Blueberry', price: 60, quantity: 1 },
    { name: 'Cocoa Caramel', price: 50, quantity: 2 },
    { name: 'Bear Brand Pink Milk', price: 50, quantity: 1 },
    { name: 'Lemon', price: 40, quantity: 1 },
  ]
  const hours = [8, 9, 9, 10, 10, 10, 11, 13, 15, 17, 18, 20]
  return hours.map((h, i) => {
    const d = new Date(now)
    d.setHours(h, Math.floor(Math.random() * 59), 0, 0)
    const item = items[i % items.length]
    return {
      id: `mock-${i}`,
      customer_name: `Customer ${i + 1}`,
      line_user_id: i % 3 === 0 ? `line-${i}` : undefined,
      items: [{ ...item }],
      total: item.price * item.quantity,
      status: i % 5 === 0 ? 'pending' : 'done',
      payment_type: i % 3 === 0 ? 'cash' : i % 3 === 1 ? 'transfer' : 'promptpay',
      paid: i % 5 !== 0,
      created_at: d.toISOString(),
    }
  })
})()

// ─── Interface ────────────────────────────────────────────────
interface AttendanceRecord {
  id: string
  employee_id: string
  check_in: string
  check_out?: string
  work_hours?: number
  status: 'working' | 'done'
  latitude?: number
  longitude?: number
  image_url?: string
  employees?: { id: string; name: string; role: string }
}
interface EmployeeSummary {
  name: string; role: string; totalHours: number; sessions: number
}
type Period = 'custom' | 'daily' | 'weekly' | 'monthly'
type Tab = 'overview' | 'reports' | 'cash' | 'attendance' | 'members' | 'history'

// ─── Palette helper ───────────────────────────────────────────
const insightColors = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a', text: '#15803d' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706', text: '#92400e' },
  danger: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626', text: '#991b1b' },
  info: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb', text: '#1e40af' },
}

// ─── Component ────────────────────────────────────────────────
export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('daily')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<Record<string, EmployeeSummary>>({})
  const [orders, setOrders] = useState<Order[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [menuMap, setMenuMap] = useState<Map<string, string>>(new Map())

  const { settings, loading: settingsLoading } = useSettings()
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang].dashboard
  const c = translations[lang].common

  const currency = settings.pos.currency
  const shopName = settings.receipt.header
  const shopSub = `${t.title} · ${t.subtitle}`

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const url = `/api/attendance?period=${period}&date=${date}&endDate=${endDate}`
      // Fix: API expects 'startDate' and 'endDate' for range queries
      const ordUrl = `/api/orders?startDate=${date}&endDate=${endDate}&period=${period}`

      const [attRes, ordRes] = await Promise.all([
        fetch(url),
        fetch(ordUrl)
      ])
      const [attData, ordData] = await Promise.all([attRes.json(), ordRes.json()])

      if (attData.records) setRecords(attData.records)
      if (attData.summary) setSummary(attData.summary)

      const fetchedOrders: Order[] = ordData.orders || mockOrders

      // Attach localized names dynamically using cached menuMap
      if (menuMap.size > 0) {
        fetchedOrders.forEach(o => {
          o.items.forEach(i => {
            const mappedName = menuMap.get(i.name)
            if (lang === 'th' && mappedName) {
              i.name = mappedName
            }
          })
        })
      }

      setOrders(fetchedOrders)
      setAnalytics(analyzeOrders(fetchedOrders))
      setLastRefresh(new Date())
    } catch {
      setOrders(mockOrders)
      setAnalytics(analyzeOrders(mockOrders))
    }
    setLoading(false)
  }, [period, date, endDate, lang, menuMap])

  // Fetch menu once on mount
  useEffect(() => {
    fetch('/api/menu')
      .then(r => r.json())
      .then(data => {
        if (data.products) {
          const m = new Map<string, string>()
          data.products.forEach((p: any) => {
            if (p.name_th) m.set(p.name, p.name_th)
          })
          setMenuMap(m)
        }
      })
      .catch(() => { })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Real-time synchronization
  useEffect(() => {
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData(true))
      .subscribe()

    const attendanceChannel = supabase
      .channel('dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchData(true))
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(attendanceChannel)
    }
  }, [fetchData])

  const changeDate = (delta: number) => {
    const d = new Date(date); d.setDate(d.getDate() + delta)
    const newDateStr = d.toISOString().split('T')[0]
    setDate(newDateStr)
    if (period === 'daily') setEndDate(newDateStr)
  }

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    const today = new Date().toISOString().split('T')[0]
    if (p === 'daily') {
      setDate(today); setEndDate(today)
    } else if (p === 'weekly') {
      const d = new Date(); d.setDate(d.getDate() - 6)
      setDate(d.toISOString().split('T')[0]); setEndDate(today)
    } else if (p === 'monthly') {
      const d = new Date(); d.setDate(d.getDate() - 29)
      setDate(d.toISOString().split('T')[0]); setEndDate(today)
    }
  }

  const totalWorkHours = Object.values(summary).reduce((s, e) => s + e.totalHours, 0)
  const activeNow = records.filter(r => r.status === 'working').length
  const a = analytics

  // ─── Bar chart helper ──────────────────────────────────────
  const maxHourlyOrders = Math.max(...(a?.hourly.map(h => h.orders) ?? [1]), 1)

  // ─── Export CSV ───────────────────────────────────────────
  const exportToCSV = () => {
    if (records.length === 0) return
    const headers = ['Employee', 'Role', 'Check-in', 'Check-out', 'Work Hours', 'Status', 'Location', 'Image']
    const rows = records.map(r => [
      r.employees?.name || 'Unknown',
      r.employees?.role || 'Unknown',
      new Date(r.check_in).toLocaleString('th-TH'),
      r.check_out ? new Date(r.check_out).toLocaleString('th-TH') : t.stillWorking,
      r.work_hours || 0,
      r.status,
      r.latitude && r.longitude ? `${r.latitude},${r.longitude}` : 'N/A',
      r.image_url ? 'Yes' : 'No'
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.map(cell => `"${cell}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `attendance_${period}_${date.split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coffee-dark) 0%, var(--coffee-brown) 100%)',
        padding: '20px 24px 0',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px' }}>
            {/* Left – title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '200px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Coffee size={20} color="var(--coffee-dark)" />
              </div>
              <div>
                <h1 className="thai-fix" style={{ color: 'white', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>{shopName}</h1>
                <p className="thai-fix" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: 0 }}>{shopSub}</p>
              </div>
            </div>

            {/* Right – controls */}
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Home Link */}
              <a href="/" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)',
                  padding: '6px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  🏠 <span className="desktop-only">{lang === 'th' ? 'หน้าหลัก' : 'Home'}</span>
                </button>
              </a>
              {/* Lang toggle */}
              <button 
                onClick={toggleLang} 
                className="thai-fix"
                style={{
                  background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)',
                  padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Globe size={16} /> <span>{c.langToggle}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '16px', flexWrap: 'wrap' }}>
            {/* Period Selection */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none' }}>
              {(['daily', 'weekly', 'monthly', 'custom'] as const).map(p => {
                const labelMap: Record<string, string> = { daily: c.daily, weekly: c.weekly, monthly: c.monthly, custom: lang === 'th' ? 'เลือกช่วง' : 'Custom' }
                return (
                  <button key={p} onClick={() => handlePeriodChange(p)} style={{
                    padding: '6px 12px', borderRadius: '9px', border: 'none',
                    background: period === p ? 'var(--gold)' : 'transparent',
                    color: period === p ? 'var(--coffee-dark)' : 'rgba(245,230,211,0.7)',
                    cursor: 'pointer', fontWeight: period === p ? '700' : '400',
                    fontSize: '12px', transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}>{labelMap[p]}</button>
                )
              })}
            </div>

            {/* Date Range Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px 8px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', flex: '1', minWidth: '280px', justifyContent: 'center' }}>
              {period === 'daily' && (
                <button onClick={() => changeDate(-1)} style={dateArrowStyle}><ChevronLeft size={16} /></button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={dateLabelStyle}>{lang === 'th' ? 'เริ่ม' : 'Start'}</span>
                  <input type="date" value={date} onChange={e => { setDate(e.target.value); if (period !== 'custom') setPeriod('custom') }} style={dateInputStyle} />
                </div>

                {period !== 'daily' && (
                  <>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontWeight: '300' }}>-</div>
                    <div style={{ position: 'relative' }}>
                      <span style={dateLabelStyle}>{lang === 'th' ? 'ถึง' : 'End'}</span>
                      <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); if (period !== 'custom') setPeriod('custom') }} style={dateInputStyle} />
                    </div>
                  </>
                )}
              </div>

              {period === 'daily' && (
                <button onClick={() => changeDate(1)} style={dateArrowStyle}><ChevronRight size={16} /></button>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="tab-scroll" style={{ display: 'flex', gap: '2px' }}>
            {([
              { id: 'overview', label: t.overview },
              { id: 'reports', label: t.reports },
              { id: 'cash', label: t.cash },
              { id: 'attendance', label: t.attendance },
              { id: 'members', label: t.members },
              { id: 'history', label: t.history },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? 'var(--coffee-dark)' : 'rgba(255,255,255,0.65)',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '14px', borderRadius: '10px 10px 0 0',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--coffee-light)' }}>
            <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p>{t.loading}</p>
          </div>
        )}

        {!loading && activeTab === 'overview' && analytics && (
          <div>
            {/* KPI Cards */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <KPICard
                icon={<TrendingUp size={22} />}
                label={t.totalRevenue}
                value={`${currency}${analytics.totalRevenue.toLocaleString()}`}
                sub={`${t.paid} ${currency}${analytics.paidRevenue.toLocaleString()}`}
                accent="#d4af37"
              />
              <KPICard
                icon={<Coffee size={22} />}
                label={t.ordersTotal}
                value={analytics.totalOrders.toString()}
                sub={`${t.avgOrder} ${currency}${analytics.avgOrderValue}${t.perOrder}`}
                accent="#60a5fa"
              />
              <KPICard icon={<Users size={22} />} label={t.staffActive} value={activeNow.toString()} sub={`${Object.keys(summary).length} ${t.inPeriod}`} accent="#34d399" />
              <KPICard icon={<Clock size={22} />} label={t.workHours} value={totalWorkHours.toFixed(1)} sub={t.thisPeriod} accent="#f472b6" />
            </div>

            {/* Quick Insights row */}
            {analytics.insights.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <SectionTitle icon="✨" title={t.quickInsights} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {analytics.insights.map((ins, i) => {
                    // map insight types to proper texts if possible..
                    // We'll trust the insights AI to send localized text, or simply use as is since it's an alert
                    const c = insightColors[ins.type]
                    return (
                      <div key={i} style={{
                        background: c.bg, border: `1px solid ${c.border}`,
                        borderRadius: '14px', padding: '14px 16px',
                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                      }}>
                        <span style={{ fontSize: '22px', lineHeight: 1.2 }}>{ins.icon}</span>
                        <div>
                          <p style={{ fontWeight: '700', fontSize: '14px', color: c.text, marginBottom: '2px' }}>{ins.title}</p>
                          <p style={{ fontSize: '12px', color: c.text, opacity: 0.8 }}>{ins.body}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Two-col: top items + payment breakdown */}
            <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Top Items */}
              <div className="card" style={{ padding: '20px' }}>
                <SectionTitle icon="🔥" title={t.topItems} />
                {analytics.topItems.length === 0
                  ? <EmptyState text={t.noData} />
                  : analytics.topItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #d4af37, #fceea7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: '800', fontSize: '13px', color: 'var(--coffee-dark)', flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <p className="thai-fix" style={{ fontWeight: '700', fontSize: '14px', color: 'var(--coffee-dark)' }}>{item.name}</p>
                        <div style={{ height: '6px', background: '#f0e8df', borderRadius: '4px', marginTop: '4px' }}>
                          <div style={{
                            height: '6px', borderRadius: '4px',
                            background: 'linear-gradient(90deg, #d4af37, #22c55e)',
                            width: `${Math.round((item.sold / (analytics.topItems[0]?.sold || 1)) * 100)}%`,
                          }} />
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: '800', fontSize: '14px', color: 'var(--coffee-dark)' }}>{item.sold} {t.cups}</p>
                        <p style={{ fontSize: '11px', color: 'var(--coffee-light)' }}>{currency}{item.revenue}</p>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Payment types */}
              <div className="card" style={{ padding: '20px' }}>
                <SectionTitle icon="💳" title={t.paymentBreakdown} />
                {Object.keys(analytics.paymentBreakdown).length === 0
                  ? <EmptyState text={t.noPaymentData} />
                  : Object.entries(analytics.paymentBreakdown).map(([type, data]: [string, any]) => {
                    const typeLabelMap: Record<string, string> = { cash: t.cashPay, transfer: t.transferPay, promptpay: t.promptpayPay, unknown: t.unknownPay }
                    const label = typeLabelMap[type] || type
                    const icons: Record<string, string> = { cash: '💵', transfer: '🏦', promptpay: '📲', unknown: '❓' }
                    const pct = analytics.totalOrders > 0 ? Math.round((data.count / analytics.totalOrders) * 100) : 0
                    return (
                      <div key={type} style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px', textTransform: 'capitalize' }}>
                            {icons[type] || '💳'} {label}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--coffee-light)' }}>{pct}% · {currency}{data.revenue}</span>
                        </div>
                        <div style={{ height: '8px', background: '#f0e8df', borderRadius: '4px' }}>
                          <div style={{
                            height: '8px', borderRadius: '4px',
                            background: type === 'cash' ? '#22c55e' : type === 'transfer' ? '#60a5fa' : '#a78bfa',
                            width: `${pct}%`, transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>

            {/* Employee summary */}
            <div className="card" style={{ padding: '20px' }}>
              <SectionTitle icon="👥" title={t.employeeSummary} />
              {Object.keys(summary).length === 0
                ? <EmptyState text={t.noAttendanceData} />
                : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f0e8df' }}>
                          {[t.empName, t.empRole, t.empSessions, t.empTotalHours, t.empAvgDay].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: 'var(--coffee-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(summary).map(([id, emp]) => (
                          <tr key={id} style={{ borderBottom: '1px solid #f0e8df' }}>
                            <td style={{ padding: '12px', fontWeight: '700', color: 'var(--coffee-dark)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%',
                                  background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: '14px', fontWeight: '800',
                                }}>{emp.name.charAt(0)}</div>
                                <span className="thai-fix">{emp.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px' }}><span style={{ background: '#f0f9f4', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', color: 'var(--coffee-medium)', fontWeight: '600' }}>{emp.role}</span></td>
                            <td style={{ padding: '12px', fontWeight: '700' }}>{emp.sessions}</td>
                            <td style={{ padding: '12px', fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)' }}>{emp.totalHours.toFixed(1)} {t.hrsShorthand}</td>
                            <td style={{ padding: '12px', color: 'var(--coffee-light)' }}>{emp.sessions > 0 ? (emp.totalHours / emp.sessions).toFixed(1) : 0} {t.hrsPerDay}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {!loading && activeTab === 'reports' && (
          <UnifiedReports period={period} date={date} endDate={endDate} />
        )}

        {/* ── CASH CONTROL TAB ── */}
        {!loading && activeTab === 'cash' && (
          <CashControl />
        )}


        {/* ── ATTENDANCE TAB ── */}
        {!loading && activeTab === 'attendance' && (
          <ManagerAttendancePro />
        )}

        {!loading && activeTab === 'members' && (
          <ManagerMembers />
        )}

        {!loading && activeTab === 'history' && (
          <OrderHistory startDate={date} endDate={endDate} />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: string
}) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px',
      padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      borderTop: `4px solid ${accent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      minHeight: '130px', flex: 1
    }}>
      <div>
        <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--coffee-light)', marginBottom: '8px' }}>{label}</p>
        <p style={{ fontSize: '34px', fontWeight: '900', color: 'var(--coffee-dark)', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: '12px', color: 'var(--coffee-light)', marginTop: '4px' }}>{sub}</p>
      </div>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>{icon}</div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="thai-fix" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon} {title}
    </h3>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p style={{ color: 'var(--coffee-light)', textAlign: 'center', padding: '32px' }}>{text}</p>
}

function ChipLegend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: color }} />
      <span style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{label}</span>
    </div>
  )
}

const dateInputStyle: React.CSSProperties = {
  padding: '6px 8px 6px 30px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '12px', outline: 'none',
  width: '135px', cursor: 'pointer', fontFamily: 'inherit'
}

const dateLabelStyle: React.CSSProperties = {
  position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
  fontSize: '9px', color: 'var(--gold)', fontWeight: '800', pointerEvents: 'none', borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '4px'
}

const dateArrowStyle: React.CSSProperties = {
  width: '28px', height: '28px', borderRadius: '8px', border: 'none',
  background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}
