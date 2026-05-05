'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Tag, Clock, Gift, Percent, Minus, ArrowLeft, Home, Globe } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import type { Promotion, PromotionType } from '@/types/advanced'

const TYPE_META: Record<PromotionType, { label: string; labelTh: string; color: string; bg: string; icon: React.ReactNode }> = {
  percentage:    { label: 'Percentage',   labelTh: 'ส่วนลด %',     color: '#8b5cf6', bg: '#ede9fe', icon: <Percent size={14}/> },
  fixed:         { label: 'Fixed',        labelTh: 'ลดราคาตรง',    color: '#3b82f6', bg: '#eff6ff', icon: <Minus size={14}/> },
  bogo:          { label: 'BOGO',         labelTh: 'ซื้อแถมฟรี',   color: '#22c55e', bg: '#f0fdf4', icon: <Gift size={14}/> },
  happy_hour:    { label: 'Happy Hour',   labelTh: 'ช่วงเวลาพิเศษ', color: '#f59e0b', bg: '#fffbeb', icon: <Clock size={14}/> },
  tier_discount: { label: 'Tier',         labelTh: 'ส่วนลด Tier',  color: '#d4af37', bg: '#fefce8', icon: <Tag size={14}/> },
}

const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

function fmt(n: number) { return n.toLocaleString('th-TH') }

// ─── Promotion Form Modal ──────────────────────────────────────
function PromoFormModal({ initial, onClose, onSave }: {
  initial?: Promotion; onClose: () => void; onSave: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: initial?.name || '', name_th: initial?.name_th || '',
    type: (initial?.type || 'percentage') as PromotionType,
    value: initial?.value?.toString() || '10',
    min_order_amount: initial?.min_order_amount?.toString() || '0',
    max_discount_amount: initial?.max_discount_amount?.toString() || '',
    applies_to: initial?.applies_to || 'all',
    target_category: initial?.target_category || '',
    happy_hour_start: initial?.happy_hour_start || '08:00',
    happy_hour_end: initial?.happy_hour_end || '10:00',
    happy_hour_days: initial?.happy_hour_days || [1,2,3,4,5],
    bogo_buy_qty: initial?.bogo_buy_qty?.toString() || '2',
    bogo_get_qty: initial?.bogo_get_qty?.toString() || '1',
    start_date: initial?.start_date || '',
    end_date: initial?.end_date || '',
    usage_limit: initial?.usage_limit?.toString() || '',
    per_member_limit: initial?.per_member_limit?.toString() || '1',
    active: initial?.active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      happy_hour_days: f.happy_hour_days.includes(day)
        ? f.happy_hour_days.filter(d => d !== day)
        : [...f.happy_hour_days, day].sort()
    }))
  }

  const save = async () => {
    if (!form.name) { setError('กรุณากรอกชื่อโปรโมชัน'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        ...form,
        value: Number(form.value),
        min_order_amount: Number(form.min_order_amount),
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        bogo_buy_qty: Number(form.bogo_buy_qty),
        bogo_get_qty: Number(form.bogo_get_qty),
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_member_limit: Number(form.per_member_limit),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      })
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const inputS: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--coffee-medium)', marginBottom: '5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div className="animate-slide-up" style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '20px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', color: 'var(--coffee-dark)' }}>
          {initial ? 'แก้ไขโปรโมชัน' : '+ สร้างโปรโมชัน'}
        </h3>

        {/* Basic info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ gridColumn: '1/-1' }}><label style={labelS}>ชื่อโปรโมชัน (EN) *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputS} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={labelS}>ชื่อโปรโมชัน (TH)</label><input value={form.name_th} onChange={e => setForm(f => ({ ...f, name_th: e.target.value }))} style={inputS} /></div>
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelS}>ประเภทโปรโมชัน</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
            {(Object.entries(TYPE_META) as [PromotionType, any][]).map(([key, meta]) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, type: key }))}
                style={{ padding: '8px 6px', borderRadius: '8px', border: `2px solid ${form.type === key ? meta.color : '#e5e7eb'}`,
                  background: form.type === key ? meta.bg : 'white', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ color: meta.color, display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>{meta.icon}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: form.type === key ? meta.color : '#6b7280' }}>{meta.labelTh}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic fields by type */}
        {(form.type === 'percentage' || form.type === 'happy_hour' || form.type === 'tier_discount') && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelS}>ส่วนลด (%)</label>
            <input type="number" max="100" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={inputS} />
          </div>
        )}
        {form.type === 'fixed' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelS}>ลดราคา (฿)</label>
            <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={inputS} />
          </div>
        )}
        {form.type === 'bogo' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={labelS}>ซื้อกี่ชิ้น</label><input type="number" min="1" value={form.bogo_buy_qty} onChange={e => setForm(f => ({ ...f, bogo_buy_qty: e.target.value }))} style={inputS} /></div>
            <div><label style={labelS}>แถมกี่ชิ้น</label><input type="number" min="1" value={form.bogo_get_qty} onChange={e => setForm(f => ({ ...f, bogo_get_qty: e.target.value }))} style={inputS} /></div>
          </div>
        )}
        {form.type === 'happy_hour' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelS}>ช่วงเวลา</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input type="time" value={form.happy_hour_start} onChange={e => setForm(f => ({ ...f, happy_hour_start: e.target.value }))} style={{ ...inputS, flex: 1 }} />
              <span>–</span>
              <input type="time" value={form.happy_hour_end} onChange={e => setForm(f => ({ ...f, happy_hour_end: e.target.value }))} style={{ ...inputS, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DAYS_TH.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: `2px solid ${form.happy_hour_days.includes(i) ? '#f59e0b' : '#e5e7eb'}`,
                    background: form.happy_hour_days.includes(i) ? '#f59e0b' : 'white', color: form.happy_hour_days.includes(i) ? 'white' : '#6b7280',
                    cursor: 'pointer', fontWeight: '800', fontSize: '11px' }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div><label style={labelS}>ยอดขั้นต่ำ (฿)</label><input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))} style={inputS} /></div>
          <div><label style={labelS}>ลดสูงสุด (฿, เว้นว่าง = ไม่จำกัด)</label><input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value }))} placeholder="ไม่จำกัด" style={inputS} /></div>
          <div><label style={labelS}>วันเริ่มต้น</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} style={inputS} /></div>
          <div><label style={labelS}>วันสิ้นสุด</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} style={inputS} /></div>
          <div><label style={labelS}>จำนวนสิทธิ์รวม (เว้นว่าง = ไม่จำกัด)</label><input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))} placeholder="ไม่จำกัด" style={inputS} /></div>
        </div>

        {/* Active toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
            {form.active ? <ToggleRight size={28} color="#22c55e" /> : <ToggleLeft size={28} color="#9ca3af" />}
          </button>
          <span style={{ fontWeight: '700', color: form.active ? '#16a34a' : '#9ca3af', fontSize: '14px' }}>
            {form.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </span>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontWeight: '700', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: saving ? '#d1d5db' : 'var(--coffee-dark)', color: 'white', border: 'none', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกโปรโมชัน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────
export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Promotion | undefined>()
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const { lang, toggleLang } = useLanguage()

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/promotions')
      const data = await res.json()
      if (data.promotions) setPromos(data.promotions)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPromos() }, [fetchPromos])

  const handleSave = async (data: any) => {
    const method = editItem ? 'PUT' : 'POST'
    const url = editItem ? `/api/promotions/${editItem.id}` : '/api/promotions'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
    fetchPromos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบโปรโมชันนี้?')) return
    await fetch(`/api/promotions/${id}`, { method: 'DELETE' })
    fetchPromos()
  }

  const handleToggle = async (promo: Promotion) => {
    await fetch(`/api/promotions/${promo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !promo.active }),
    })
    fetchPromos()
  }

  const filtered = promos.filter(p =>
    filterActive === 'all' ? true : filterActive === 'active' ? p.active : !p.active
  )

  const activeCount = promos.filter(p => p.active).length

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--coffee-dark)', margin: 0 }}>🏷️ โปรโมชัน & ส่วนลด</h1>
          <p className="thai-fix" style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>กำลังใช้งาน {activeCount} โปรโมชัน</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => { setEditItem(undefined); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--coffee-dark)', color: 'white', padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
            <Plus size={16} /> สร้างโปรโมชัน
          </button>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'white', color: 'var(--coffee-dark)', border: '1px solid #e5e7eb',
              padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <Home size={16} /> {lang === 'th' ? 'หน้าหลัก' : 'Home'}
            </button>
          </Link>
          <button 
            onClick={toggleLang} 
            className="thai-fix"
            style={{
              background: 'white', color: 'var(--coffee-dark)', border: '1px solid #e5e7eb',
              padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            <Globe size={16} /> {lang === 'th' ? 'English' : 'ไทย'}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button key={f} onClick={() => setFilterActive(f)}
            style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
              background: filterActive === f ? 'var(--coffee-dark)' : 'white', color: filterActive === f ? 'white' : 'var(--coffee-medium)' }}>
            {f === 'all' ? 'ทั้งหมด' : f === 'active' ? '✅ เปิดใช้' : '⏸ ปิดใช้'}
          </button>
        ))}
      </div>

      {/* Promo grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #f0e8df' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏷️</div>
          <p style={{ color: '#9ca3af' }}>ยังไม่มีโปรโมชัน</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {filtered.map(promo => {
            const meta = TYPE_META[promo.type]
            return (
              <div key={promo.id} style={{
                background: 'white', borderRadius: '16px', border: `2px solid ${promo.active ? meta.color + '40' : '#e5e7eb'}`,
                overflow: 'hidden', opacity: promo.active ? 1 : 0.65
              }}>
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${meta.color}20`, background: meta.bg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ background: meta.color, color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {meta.icon} {meta.labelTh}
                        </span>
                        {promo.active && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700' }}>🟢 LIVE</span>}
                      </div>
                      <h3 className="thai-fix" style={{ fontWeight: '900', fontSize: '16px', color: 'var(--coffee-dark)', margin: 0 }}>{promo.name_th || promo.name}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => handleToggle(promo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: promo.active ? '#22c55e' : '#9ca3af' }}>
                        {promo.active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button onClick={() => { setEditItem(promo); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(promo.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Value display */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>ส่วนลด</span>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: meta.color }}>
                      {promo.type === 'bogo'
                        ? `ซื้อ ${promo.bogo_buy_qty} แถม ${promo.bogo_get_qty}`
                        : promo.type === 'fixed'
                        ? `฿${fmt(promo.value)}`
                        : `${promo.value}%`}
                    </span>
                  </div>

                  {/* Happy hour time */}
                  {promo.type === 'happy_hour' && promo.happy_hour_start && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Clock size={12} color="#f59e0b" />
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{promo.happy_hour_start} – {promo.happy_hour_end}</span>
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {DAYS_TH.map((d, i) => (
                          <span key={i} style={{ fontSize: '10px', fontWeight: '700', padding: '1px 4px', borderRadius: '4px',
                            background: promo.happy_hour_days.includes(i) ? '#f59e0b' : '#f3f4f6', color: promo.happy_hour_days.includes(i) ? 'white' : '#9ca3af' }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conditions */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#9ca3af' }}>
                    {promo.min_order_amount > 0 && <span>ขั้นต่ำ ฿{fmt(promo.min_order_amount)}</span>}
                    {promo.usage_limit && <span>ใช้ได้ {promo.usage_count}/{promo.usage_limit} ครั้ง</span>}
                    {promo.end_date && <span>ถึง {new Date(promo.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>}
                  </div>

                  {/* Usage progress bar */}
                  {promo.usage_limit && (
                    <div>
                      <div style={{ background: '#f0e8df', borderRadius: '4px', height: '4px' }}>
                        <div style={{ background: meta.color, borderRadius: '4px', height: '100%', width: `${Math.min(100, (promo.usage_count / promo.usage_limit) * 100)}%`, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {(Object.entries(TYPE_META) as [PromotionType, any][]).map(([type, meta]) => {
          const count = promos.filter(p => p.type === type).length
          return (
            <div key={type} style={{ background: meta.bg, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${meta.color}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: meta.color, marginBottom: '4px' }}>{meta.icon}<span style={{ fontSize: '12px', fontWeight: '700' }}>{meta.labelTh}</span></div>
              <p style={{ fontSize: '22px', fontWeight: '900', color: meta.color, margin: 0 }}>{count}</p>
            </div>
          )
        })}
      </div>

      {showForm && (
        <PromoFormModal
          initial={editItem}
          onClose={() => { setShowForm(false); setEditItem(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
