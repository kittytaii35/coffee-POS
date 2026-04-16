'use client'

import React, { useState, useEffect } from 'react'
import { Wallet, Settings, AlertTriangle, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

interface Shift {
  id: string
  user_id: string
  opening_cash: number
  closing_cash?: number
  expected_cash?: number
  difference?: number
  start_time: string
  end_time?: string
  status: 'active' | 'closed'
  employees?: { name: string }
}

export default function CashControl() {
  const { lang } = useLanguage()
  const t = translations[lang].cashControl

  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [history, setHistory] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const [openingCash, setOpeningCash] = useState('')
  const [actualCash, setActualCash] = useState('')
  const [userId, setUserId] = useState('')

  const [starting, setStarting] = useState(false)
  const [ending, setEnding] = useState(false)

  const { settings, loading: settingsLoading } = useSettings()
  const currency = settings.pos.currency

  const loadData = async () => {
    try {
      const [currRes, histRes] = await Promise.all([
        fetch('/api/shift/current'),
        fetch('/api/shift/history')
      ])
      const curr = await currRes.json()
      const hist = await histRes.json()

      setCurrentShift(curr.current || null)
      setHistory(hist.history || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStartShift = async () => {
    if (!openingCash || !userId) return alert(t.enterUserIdCash)
    setStarting(true)
    try {
      const res = await fetch('/api/shift/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening_cash: parseFloat(openingCash), user_id: userId })
      })
      if (res.ok) {
        setOpeningCash('')
        setUserId('')
        await loadData()
      } else {
        const data = await res.json()
        alert(data.error)
      }
    } finally {
      setStarting(false)
    }
  }

  const handleEndShift = async () => {
    if (!actualCash) return alert(t.enterActualCash)
    setEnding(true)
    try {
      const res = await fetch('/api/shift/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_cash: parseFloat(actualCash) })
      })
      const data = await res.json()
      if (res.ok) {
        setActualCash('')
        alert(`${t.shiftEndedDiff} ${currency}${data.shift?.difference?.toFixed(2)}`)
        await loadData()
      } else {
        alert(data.error)
      }
    } finally {
      setEnding(false)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t.loading}</div>

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* LEFT COLUMN: Shift Action */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Active Shift Component */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet /> {t.shiftAction}
          </h3>
          
          {!currentShift ? (
            <div>
              <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
                <p style={{ fontWeight: '700', color: '#1e3a8a', fontSize: '14px' }}>{t.noActiveShift}</p>
                <p style={{ color: '#3b82f6', fontSize: '13px' }}>{t.startShiftDesc}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <input 
                  type="text" placeholder={t.empUuid} value={userId} 
                  onChange={e => setUserId(e.target.value)}
                  style={inputStyle}
                />
                <input 
                  type="number" placeholder={`${t.openingCash} (${currency})`} value={openingCash} 
                  onChange={e => setOpeningCash(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <button 
                onClick={handleStartShift} disabled={starting}
                style={{ width: '100%', background: '#16a34a', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                {starting ? <Loader2 className="spin" size={18} /> : t.startShift}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ padding: '16px', background: '#fdf4ff', borderRadius: '12px', border: '1px solid #fbcfe8', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d946ef', animation: 'pulse-glow 2s infinite' }} />
                  <p style={{ fontWeight: '800', color: '#a21caf', fontSize: '15px' }}>{t.shiftIsActive}</p>
                </div>
                <p style={{ fontSize: '13px', color: '#86198f', marginBottom: '4px' }}>{t.startedBy} {currentShift.employees?.name || currentShift.user_id}</p>
                <p style={{ fontSize: '13px', color: '#86198f', marginBottom: '4px' }}>{t.time} {new Date(currentShift.start_time).toLocaleString('th-TH')}</p>
                <p style={{ fontSize: '13px', color: '#86198f', fontWeight: '800' }}>{t.openingCash}: {currency}{currentShift.opening_cash.toLocaleString()}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600' }}>{t.closeShiftDesc}</p>
                <input 
                  type="number" placeholder={`${t.actualCashDraw} (${currency})`} value={actualCash} 
                  onChange={e => setActualCash(e.target.value)}
                  style={inputStyle}
                />
              </div>
              
              <button 
                onClick={handleEndShift} disabled={ending}
                style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                {ending ? <Loader2 className="spin" size={18} /> : t.endShift}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Shift History */}
      <div style={{ flex: '2 1 500px', background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
           <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>{t.shiftHistory}</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <tr>
                {[t.user, t.start, t.end, t.opening, t.expected, t.actual, t.diff, t.status].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(s => {
                const diffColor = !s.difference ? '#6b7280' : s.difference < 0 ? '#ef4444' : s.difference > 0 ? '#f59e0b' : '#10b981'
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{s.employees?.name || 'Unknown'}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(s.start_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</td>
                    <td style={{ padding: '12px 16px' }}>{s.end_time ? new Date(s.end_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '-'}</td>
                    <td style={{ padding: '12px 16px' }}>{currency}{s.opening_cash}</td>
                    <td style={{ padding: '12px 16px' }}>{s.expected_cash ? `${currency}${s.expected_cash}` : '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700' }}>{s.closing_cash ? `${currency}${s.closing_cash}` : '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: diffColor }}>
                      {s.difference !== undefined ? (s.difference > 0 ? `+${currency}${s.difference}` : `${currency}${s.difference}`) : '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: s.status === 'active' ? '#dcfce7' : '#f3f4f6', color: s.status === 'active' ? '#166534' : '#6b7280' }}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {history.length === 0 && <p style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>{t.noHistory}</p>}
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '12px 16px', borderRadius: '10px', border: '1px solid #d1d5db',
  fontSize: '14px', width: '100%', outline: 'none'
}
