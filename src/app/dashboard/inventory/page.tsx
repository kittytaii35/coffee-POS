'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, Search, AlertTriangle, PackagePlus, TrendingDown, X, ArrowLeft, Home, Globe } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/lib/translations'

// ─── Types ────────────────────────────────────────────────────
interface Ingredient {
  id: string; name: string; name_th?: string; unit: string
  stock_qty: number; low_stock_threshold: number; cost_per_unit: number
  category?: string; supplier?: string; active: boolean
}

const CATEGORIES = [
  { value: 'beans',   label: 'เมล็ดกาแฟ',  icon: '☕' },
  { value: 'milk',    label: 'นม/ครีม',     icon: '🥛' },
  { value: 'syrup',   label: 'ไซรัป',       icon: '🍯' },
  { value: 'cup',     label: 'บรรจุภัณฑ์',  icon: '🥤' },
  { value: 'topping', label: 'ท็อปปิ้ง',    icon: '🍫' },
  { value: 'other',   label: 'อื่นๆ',       icon: '📦' },
]

function stockStatus(i: Ingredient) {
  if (i.stock_qty <= 0) return { label: 'หมด', color: '#ef4444', bg: '#fef2f2' }
  if (i.stock_qty <= i.low_stock_threshold) return { label: 'ใกล้หมด', color: '#f59e0b', bg: '#fffbeb' }
  return { label: 'ปกติ', color: '#22c55e', bg: '#f0fdf4' }
}

function fmt(n: number, decimals = 0) { return n.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) }

// ─── Ingredient Form Modal ────────────────────────────────────
function IngredientModal({ initial, onClose, onSave }: {
  initial?: Ingredient; onClose: () => void; onSave: (data: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    name: initial?.name || '', name_th: initial?.name_th || '',
    unit: initial?.unit || 'g', stock_qty: initial?.stock_qty?.toString() || '0',
    low_stock_threshold: initial?.low_stock_threshold?.toString() || '0',
    cost_per_unit: initial?.cost_per_unit?.toString() || '0',
    category: initial?.category || 'other', supplier: initial?.supplier || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!form.name) { setError('กรุณากรอกชื่อวัตถุดิบ'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        ...form,
        stock_qty: Number(form.stock_qty),
        low_stock_threshold: Number(form.low_stock_threshold),
        cost_per_unit: Number(form.cost_per_unit),
      })
      onClose()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const F = (key: string) => ({ value: (form as any)[key], onChange: (e: any) => setForm(f => ({ ...f, [key]: e.target.value })) })
  const inputS: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelS: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--coffee-medium)', marginBottom: '5px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div className="animate-slide-up" style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--coffee-dark)', margin: 0 }}>{initial ? 'แก้ไขวัตถุดิบ' : '+ เพิ่มวัตถุดิบ'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ gridColumn: '1/-1' }}><label style={labelS}>ชื่อ (อังกฤษ) *</label><input {...F('name')} placeholder="Coffee Beans" style={inputS} /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={labelS}>ชื่อ (ไทย)</label><input {...F('name_th')} placeholder="เมล็ดกาแฟ" style={inputS} /></div>

          <div>
            <label style={labelS}>หมวดหมู่</label>
            <select {...F('category')} style={inputS}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelS}>หน่วย</label>
            <select {...F('unit')} style={inputS}>
              {['g', 'kg', 'ml', 'L', 'piece', 'pack', 'bottle'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div><label style={labelS}>จำนวนสต็อก ({form.unit})</label><input type="number" {...F('stock_qty')} style={inputS} /></div>
          <div><label style={labelS}>แจ้งเตือนเมื่อเหลือ ({form.unit})</label><input type="number" {...F('low_stock_threshold')} style={inputS} /></div>

          <div><label style={labelS}>ต้นทุน/หน่วย (฿)</label><input type="number" step="0.01" {...F('cost_per_unit')} style={inputS} /></div>
          <div><label style={labelS}>ซัพพลายเออร์</label><input {...F('supplier')} placeholder="ชื่อผู้ขาย" style={inputS} /></div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontWeight: '700', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={save} disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: saving ? '#d1d5db' : 'var(--coffee-dark)', color: 'white', border: 'none', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stock-In Modal ───────────────────────────────────────────
function StockInModal({ ingredient, onClose, onSave }: {
  ingredient: Ingredient; onClose: () => void; onSave: (qty: number, cost: number) => Promise<void>
}) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState(ingredient.cost_per_unit.toString())
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!qty || Number(qty) <= 0) return
    setSaving(true)
    try { await onSave(Number(qty), Number(cost)); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="animate-slide-up" style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '380px', width: '100%' }}>
        <h3 style={{ fontWeight: '900', marginBottom: '8px' }}>📦 รับสต็อก</h3>
        <p className="thai-fix" style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>{ingredient.name_th || ingredient.name}</p>
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280', fontSize: '13px' }}>สต็อกปัจจุบัน</span>
          <span style={{ fontWeight: '900' }}>{ingredient.stock_qty} {ingredient.unit}</span>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--coffee-medium)', marginBottom: '5px' }}>จำนวนที่รับ ({ingredient.unit}) *</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '16px', fontWeight: '800', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--coffee-medium)', marginBottom: '5px' }}>ต้นทุน/หน่วย (฿)</label>
          <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} style={{ width: '100%', padding: '9px 13px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {qty && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: '700' }}>
              หลังรับ: {ingredient.stock_qty + Number(qty)} {ingredient.unit}
              {cost && ` · ต้นทุนรวม ฿${fmt(Number(qty) * Number(cost), 2)}`}
            </p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontWeight: '700', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={save} disabled={saving || !qty} style={{ flex: 2, padding: '12px', borderRadius: '12px', background: (!qty || saving) ? '#d1d5db' : '#22c55e', color: 'white', border: 'none', fontWeight: '800', cursor: (!qty || saving) ? 'not-allowed' : 'pointer' }}>
            {saving ? 'กำลังบันทึก...' : '✓ รับสต็อก'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function InventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [showLowOnly, setShowLowOnly] = useState(false)
  const [editItem, setEditItem] = useState<Ingredient | undefined>()
  const [showForm, setShowForm] = useState(false)
  const [stockInItem, setStockInItem] = useState<Ingredient | undefined>()

  const { lang, toggleLang } = useLanguage()

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ingredients')
      const data = await res.json()
      if (data.ingredients) setIngredients(data.ingredients)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  const filtered = ingredients.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.name_th || '').includes(search)
    const matchCat = catFilter === 'all' || i.category === catFilter
    const matchLow = !showLowOnly || i.stock_qty <= i.low_stock_threshold
    return matchSearch && matchCat && matchLow
  })

  const lowCount = ingredients.filter(i => i.stock_qty <= i.low_stock_threshold).length

  const handleSave = async (data: any) => {
    const method = editItem ? 'PUT' : 'POST'
    const url = editItem ? `/api/ingredients/${editItem.id}` : '/api/ingredients'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
    fetch_()
  }

  const handleStockIn = async (qty: number, cost: number) => {
    if (!stockInItem) return
    const res = await fetch('/api/stock/stock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient_id: stockInItem.id, qty, cost_per_unit: cost }),
    })
    if (!res.ok) throw new Error('รับสต็อกไม่สำเร็จ')
    fetch_()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบวัตถุดิบนี้?')) return
    await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
    fetch_()
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--coffee-dark)', margin: 0 }}>📦 คลังวัตถุดิบ</h1>
          <p className="thai-fix" style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>จัดการวัตถุดิบและสต็อก</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => { setEditItem(undefined); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--coffee-dark)', color: 'white', padding: '8px 14px', borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>
            <Plus size={16} /> เพิ่มวัตถุดิบ
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

      {/* Low stock alert */}
      {lowCount > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={18} color="#f59e0b" />
          <span className="thai-fix" style={{ fontWeight: '700', color: '#92400e', fontSize: '14px' }}>
            ⚠️ มีวัตถุดิบ {lowCount} รายการที่ใกล้หมดหรือหมดแล้ว
          </span>
          <button onClick={() => setShowLowOnly(s => !s)}
            style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '8px', border: '1px solid #fcd34d', background: showLowOnly ? '#f59e0b' : 'white', color: showLowOnly ? 'white' : '#92400e', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
            {showLowOnly ? 'ดูทั้งหมด' : 'ดูเฉพาะใกล้หมด'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาวัตถุดิบ..." style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setCatFilter('all')} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e8d5c4', background: catFilter === 'all' ? 'var(--coffee-dark)' : 'white', color: catFilter === 'all' ? 'white' : '#6b7280', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>ทั้งหมด</button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCatFilter(catFilter === c.value ? 'all' : c.value)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e8d5c4', background: catFilter === c.value ? 'var(--coffee-dark)' : 'white', color: catFilter === c.value ? 'white' : '#6b7280', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
              {c.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#fafcfb', borderBottom: '2px solid #f0e8df' }}>
                <tr>
                  {['วัตถุดิบ', 'หมวด', 'สต็อก', 'แจ้งเตือน', 'ต้นทุน/หน่วย', 'มูลค่าสต็อก', 'สถานะ', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--coffee-light)', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const st = stockStatus(i)
                  const catInfo = CATEGORIES.find(c => c.value === i.category)
                  return (
                    <tr key={i.id} style={{ borderBottom: '1px solid #f0e8df' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ fontWeight: '800', color: 'var(--coffee-dark)', margin: 0 }}>{i.name}</p>
                        {i.name_th && <p className="thai-fix" style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{i.name_th}</p>}
                        {i.supplier && <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>จาก: {i.supplier}</p>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#f3f4f6', borderRadius: '6px', padding: '3px 8px', fontSize: '12px' }}>
                          {catInfo?.icon} {catInfo?.label || i.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', fontSize: '15px', color: i.stock_qty <= i.low_stock_threshold ? st.color : 'var(--coffee-dark)' }}>
                        {fmt(i.stock_qty, i.unit === 'g' || i.unit === 'ml' ? 0 : 1)} <span style={{ fontSize: '11px', fontWeight: '400', color: '#9ca3af' }}>{i.unit}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{fmt(i.low_stock_threshold)} {i.unit}</td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>฿{i.cost_per_unit}/{i.unit}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700' }}>฿{fmt(i.stock_qty * i.cost_per_unit, 0)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>{st.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => setStockInItem(i)} title="รับสต็อก" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#16a34a' }}><PackagePlus size={14} /></button>
                          <button onClick={() => { setEditItem(i); setShowForm(true) }} title="แก้ไข" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit3 size={14} /></button>
                          <button onClick={() => handleDelete(i.id)} title="ลบ" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                <p>ไม่พบวัตถุดิบ</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'วัตถุดิบทั้งหมด', value: `${ingredients.length} รายการ`, color: '#3b82f6' },
          { label: 'มูลค่าสต็อกรวม', value: `฿${fmt(ingredients.reduce((s, i) => s + i.stock_qty * i.cost_per_unit, 0))}`, color: '#22c55e' },
          { label: 'ใกล้หมด/หมด', value: `${lowCount} รายการ`, color: lowCount > 0 ? '#f59e0b' : '#22c55e' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '12px', padding: '16px 20px' }}>
            <p className="thai-fix" style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{label}</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <IngredientModal
          initial={editItem}
          onClose={() => { setShowForm(false); setEditItem(undefined) }}
          onSave={handleSave}
        />
      )}
      {stockInItem && (
        <StockInModal
          ingredient={stockInItem}
          onClose={() => setStockInItem(undefined)}
          onSave={handleStockIn}
        />
      )}
    </div>
  )
}
