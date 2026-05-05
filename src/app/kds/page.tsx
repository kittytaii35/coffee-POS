'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Clock, CheckCircle, ChevronRight, Volume2, VolumeX, RefreshCw, Wifi, WifiOff, Home, Globe } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import type { KdsStatus } from '@/types/advanced'

// ─── Types ────────────────────────────────────────────────────
interface KdsItem {
  name: string
  name_th?: string
  quantity: number
  modifiers?: { name: string; value: string; price_delta: number }[]
  notes?: string
  sweetness?: string
  toppings?: string[]
}

interface KdsOrder {
  id: string
  order_id: string
  customer_name: string
  items: KdsItem[]
  total: number
  kds_status: KdsStatus
  kds_started_at?: string
  kds_ready_at?: string
  priority: number
  created_at: string
}

// ─── Constants ────────────────────────────────────────────────
const KDS_COLUMNS: { id: KdsStatus; label: string; color: string; bg: string; nextLabel: string; nextStatus: KdsStatus | null }[] = [
  { id: 'queued',    label: '🟡 รอคิว',       color: '#f59e0b', bg: '#fffbeb', nextLabel: 'เริ่มทำ →',  nextStatus: 'preparing' },
  { id: 'preparing', label: '🔵 กำลังทำ',      color: '#3b82f6', bg: '#eff6ff', nextLabel: 'พร้อมเสิร์ฟ →', nextStatus: 'ready' },
  { id: 'ready',     label: '🟢 พร้อมเสิร์ฟ',  color: '#22c55e', bg: '#f0fdf4', nextLabel: '✓ เสิร์ฟแล้ว', nextStatus: 'served' },
]

// ─── Helpers ──────────────────────────────────────────────────
function useElapsed(isoTime?: string) {
  const [mins, setMins] = useState(0)
  useEffect(() => {
    if (!isoTime) return
    const calc = () => setMins(Math.floor((Date.now() - new Date(isoTime).getTime()) / 60000))
    calc()
    const t = setInterval(calc, 10000)
    return () => clearInterval(t)
  }, [isoTime])
  return mins
}

function timerColor(mins: number, warning = 8, danger = 15) {
  if (mins >= danger) return '#ef4444'
  if (mins >= warning) return '#f59e0b'
  return '#22c55e'
}

// ─── Order Card ───────────────────────────────────────────────
function KdsCard({ order, onAdvance, isUpdating }: {
  order: KdsOrder
  onAdvance: (id: string, next: KdsStatus) => void
  isUpdating: boolean
}) {
  const waitMins = useElapsed(order.created_at)
  const prepMins = useElapsed(order.kds_started_at)
  const col = KDS_COLUMNS.find(c => c.id === order.kds_status)!

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      border: `2px solid ${col.color}30`,
      boxShadow: order.priority > 0 ? `0 0 0 3px ${col.color}60` : '0 2px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      transition: 'transform 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ background: col.bg, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: '900', color: '#1f2937' }}>#{order.order_id?.split('-').pop()}</span>
          {order.priority > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>URGENT</span>}
          <p className="thai-fix" style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{order.customer_name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color: timerColor(waitMins) }}>
            {waitMins}น.
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>รอ</div>
        </div>
      </div>

      {/* Items */}
      <div style={{ padding: '12px 16px' }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ marginBottom: i < order.items.length - 1 ? '10px' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="thai-fix" style={{ fontWeight: '800', fontSize: '15px', color: '#111827' }}>
                x{item.quantity} {item.name_th || item.name}
              </span>
            </div>
            {/* Modifiers */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {item.modifiers?.map((m, mi) => (
                <span key={mi} style={{ background: '#f3f4f6', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#6b7280' }}>
                  {m.name}: {m.value}
                </span>
              ))}
              {item.sweetness && (
                <span style={{ background: '#fef3c7', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#92400e' }}>
                  หวาน {item.sweetness}
                </span>
              )}
              {item.toppings?.map((t, ti) => (
                <span key={ti} style={{ background: '#ede9fe', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#5b21b6' }}>
                  +{t}
                </span>
              ))}
              {item.notes && (
                <span style={{ background: '#fff7ed', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: '#c2410c' }}>
                  📝 {item.notes}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prep timer (only when preparing) */}
      {order.kds_status === 'preparing' && order.kds_started_at && (
        <div style={{ padding: '6px 16px', background: '#eff6ff', borderTop: '1px solid #dbeafe' }}>
          <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700' }}>
            ⏱ กำลังทำ {prepMins} น.
          </span>
        </div>
      )}

      {/* Advance Button */}
      {col.nextStatus && (
        <button
          onClick={() => onAdvance(order.id, col.nextStatus!)}
          disabled={isUpdating}
          style={{
            width: '100%',
            padding: '14px',
            background: isUpdating ? '#d1d5db' : col.color,
            color: 'white',
            border: 'none',
            fontWeight: '900',
            fontSize: '15px',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'opacity 0.2s',
          }}
        >
          {col.nextLabel} <ChevronRight size={18} />
        </button>
      )}
      {order.kds_status === 'ready' && col.nextStatus === 'served' && (
        <div style={{ height: '4px', background: '#22c55e', animation: 'pulse-glow 2s infinite' }} />
      )}
    </div>
  )
}

// ─── Main KDS Page ────────────────────────────────────────────
export default function KdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const prevOrderIds = useRef<Set<string>>(new Set())
  const audioCtx = useRef<AudioContext | null>(null)
  
  const { lang, toggleLang } = useLanguage()

  // ── Sound alert ──────────────────────────────────────────────
  const playBeep = useCallback(() => {
    if (!soundOn) return
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* ignore */ }
  }, [soundOn])

  // ── Fetch orders ─────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/kds')
      const data = await res.json()
      if (data.orders) {
        setOrders(data.orders)
        setLastUpdate(new Date())

        // Play beep for new queued orders
        const newIds = new Set<string>(data.orders.map((o: KdsOrder) => o.id))
        const hasNew = data.orders.some((o: KdsOrder) => o.kds_status === 'queued' && !prevOrderIds.current.has(o.id))
        if (hasNew) playBeep()
        prevOrderIds.current = newIds
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [playBeep])

  // ── Supabase Realtime ─────────────────────────────────────────
  useEffect(() => {
    fetchOrders()

    if (!isSupabaseConfigured) {
      // Fallback: poll every 10s
      const t = setInterval(fetchOrders, 10000)
      return () => clearInterval(t)
    }

    const channel = supabase
      .channel('kds_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  // ── Advance status ───────────────────────────────────────────
  const handleAdvance = async (orderId: string, nextStatus: KdsStatus) => {
    setUpdating(orderId)
    try {
      await fetch(`/api/kds/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kds_status: nextStatus }),
      })
      // Optimistic update
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kds_status: nextStatus } : o))
    } catch { /* silent */ }
    finally { setUpdating(null) }
  }

  // ── Column grouping ──────────────────────────────────────────
  const columnOrders = (status: KdsStatus) =>
    orders.filter(o => o.kds_status === status).sort((a, b) => b.priority - a.priority || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const totalActive = orders.filter(o => o.kds_status !== 'served').length

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>🍵 กำลังโหลด KDS...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <div style={{ background: '#1e293b', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '900', margin: 0 }}>
            👑 Queen Coffee — Kitchen Display
          </h1>
          <div style={{ background: '#334155', borderRadius: '8px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSupabaseConfigured
              ? (connected ? <Wifi size={14} color="#22c55e" /> : <WifiOff size={14} color="#f59e0b" />)
              : <RefreshCw size={14} color="#60a5fa" />}
            <span style={{ color: '#94a3b8', fontSize: '12px' }}>
              {isSupabaseConfigured ? (connected ? 'Realtime' : 'กำลังเชื่อมต่อ...') : 'Polling mode'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Active order count */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b', lineHeight: 1 }}>{totalActive}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>ออเดอร์</div>
          </div>

          {/* Time */}
          <LiveClock />

          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn(s => !s)}
            style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: soundOn ? '#22c55e' : '#ef4444' }}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchOrders}
            style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#60a5fa' }}
          >
            <RefreshCw size={18} />
          </button>

          {/* Back to Home */}
          <a href="/" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={16} /> {lang === 'th' ? 'หน้าหลัก' : 'Home'}
            </button>
          </a>

          {/* Lang toggle */}
          <button 
            onClick={toggleLang} 
            className="thai-fix"
            style={{ background: '#334155', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', color: 'white', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={16} /> {lang === 'th' ? 'English' : 'ไทย'}
          </button>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px', overflowY: 'auto' }}>
        {KDS_COLUMNS.map(col => {
          const colOrders = columnOrders(col.id)
          return (
            <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Column header */}
              <div style={{ background: '#1e293b', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${col.color}30` }}>
                <h2 className="thai-fix" style={{ color: 'white', fontSize: '16px', fontWeight: '800', margin: 0 }}>{col.label}</h2>
                <span style={{ background: col.color, color: 'white', borderRadius: '20px', padding: '2px 10px', fontSize: '14px', fontWeight: '900' }}>
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {colOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#475569', padding: '40px 20px', background: '#1e293b', borderRadius: '12px', border: '2px dashed #334155' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                      {col.id === 'queued' ? '☕' : col.id === 'preparing' ? '🧑‍🍳' : '✅'}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      {col.id === 'queued' ? 'ไม่มีออเดอร์รอ' : col.id === 'preparing' ? 'ไม่มีออเดอร์กำลังทำ' : 'ไม่มีออเดอร์พร้อม'}
                    </p>
                  </div>
                ) : colOrders.map(order => (
                  <KdsCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    isUpdating={updating === order.id}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{ background: '#1e293b', padding: '8px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {KDS_COLUMNS.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.color }} />
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>{c.label.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#475569', fontSize: '11px' }}>
          <Clock size={12} style={{ display: 'inline' }} /> อัปเดต: {lastUpdate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// ── Live Clock component ──────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  return <span style={{ color: 'white', fontSize: '20px', fontWeight: '900', fontVariantNumeric: 'tabular-nums' }}>{time}</span>
}
