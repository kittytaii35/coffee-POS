'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit3, TrendingDown, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { PieChart as RePie, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

// ─── Types ────────────────────────────────────────────────────
interface ExpenseCategory { id: string; name: string; name_th: string; icon: string; color: string }
interface Expense {
  id: string; category_id?: string; amount: number; description?: string
  expense_date: string; payment_method: string; category?: ExpenseCategory
}
interface ProfitData {
  period: string; revenue: number; cogs: number; gross_profit: number
  expenses: number; net_profit: number; margin_pct: number
  daily_data: { report_date: string; revenue: number; expenses: number; net_profit: number; order_count: number }[]
  expenses_by_category: { name: string; name_th: string; icon: string; color: string; total: number }[]
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: '1', name: 'Rent',        name_th: 'ค่าเช่า',   icon: '🏠', color: '#ef4444' },
  { id: '2', name: 'Utilities',   name_th: 'ค่าน้ำ/ไฟ', icon: '⚡', color: '#f59e0b' },
  { id: '3', name: 'Payroll',     name_th: 'เงินเดือน', icon: '👥', color: '#3b82f6' },
  { id: '4', name: 'Materials',   name_th: 'วัตถุดิบ',  icon: '🛒', color: '#22c55e' },
  { id: '5', name: 'Marketing',   name_th: 'การตลาด',   icon: '📣', color: '#8b5cf6' },
  { id: '6', name: 'Maintenance', name_th: 'ซ่อมบำรุง', icon: '🔧', color: '#06b6d4' },
  { id: '7', name: 'Other',       name_th: 'อื่นๆ',     icon: '📋', color: '#9ca3af' },
]

function fmt(n: number) { return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }

// ─── Expense Form Modal ────────────────────────────────────────
function ExpenseFormModal({ onClose, onSave, categories, initial }: {
  onClose: () => void
  onSave: (data: any) => Promise<void>
  categories: ExpenseCategory[]
  initial?: Expense
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    category_id: initial?.category_id || categories[0]?.id || '',
    amount: initial?.amount?.toString() || '',
    description: initial?.description || '',
    expense_date: initial?.expense_date || today,
    payment_method: initial?.payment_method || 'cash',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) { setError('กรุณากรอกจำนวนเงิน'); return }
    setSaving(true); setError('')
    try { await onSave({ ...form, amount: Number(form.amount) }); onClose() }
    catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="animate-slide-up" style={{ background: 'white', borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '20px', color: 'var(--coffee-dark)' }}>
          {initial ? 'แก้ไขรายจ่าย' : '+ บันทึกรายจ่าย'}
        </h3>

        {/* Category */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>หมวดหมู่</label>
          <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={inputStyle}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_th}</option>)}
          </select>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>จำนวนเงิน (฿)</label>
          <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>รายละเอียด (ถ้ามี)</label>
          <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="เช่น ค่าเช่าเดือน พ.ค." style={inputStyle} />
        </div>

        {/* Date */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>วันที่</label>
          <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} style={inputStyle} />
        </div>

        {/* Payment method */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>ชำระด้วย</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['cash', 'transfer', 'credit_card'].map(m => (
              <button key={m} onClick={() => setForm(f => ({ ...f, payment_method: m }))}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `2px solid ${form.payment_method === m ? 'var(--coffee-dark)' : '#e5e7eb'}`,
                  background: form.payment_method === m ? 'var(--coffee-dark)' : 'white', color: form.payment_method === m ? 'white' : '#6b7280',
                  fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                {m === 'cash' ? '💵 เงินสด' : m === 'transfer' ? '📱 โอน' : '💳 บัตร'}
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontWeight: '700', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: '12px', borderRadius: '12px', background: saving ? '#d1d5db' : 'var(--coffee-dark)', color: 'white', border: 'none', fontWeight: '800', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--coffee-medium)', marginBottom: '6px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e8d5c4', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }

// ─── Main Page ────────────────────────────────────────────────
export default function ExpensesPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [profit, setProfit] = useState<ProfitData | null>(null)
  const [categories] = useState<ExpenseCategory[]>(DEFAULT_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Expense | undefined>()
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [profitPeriod, setProfitPeriod] = useState<'today' | 'week' | 'month'>('month')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [expRes, profRes] = await Promise.all([
        fetch(`/api/expenses?start=${startDate}&end=${endDate}`),
        fetch(`/api/profit?period=${profitPeriod}`),
      ])
      const [expData, profData] = await Promise.all([expRes.json(), profRes.json()])
      if (expData.expenses) setExpenses(expData.expenses)
      if (!profData.error) setProfit(profData)
    } finally { setLoading(false) }
  }, [startDate, endDate, profitPeriod])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (data: any) => {
    const method = editItem ? 'PUT' : 'POST'
    const url = editItem ? `/api/expenses/${editItem.id}` : '/api/expenses'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
    setEditItem(undefined); fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ต้องการลบรายจ่ายนี้?')) return
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* ── Net Profit Summary ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--coffee-dark)' }}>💰 รายจ่าย & กำไร</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => setProfitPeriod(p)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                background: profitPeriod === p ? 'var(--coffee-dark)' : 'white', color: profitPeriod === p ? 'white' : 'var(--coffee-medium)' }}>
              {p === 'today' ? 'วันนี้' : p === 'week' ? '7 วัน' : 'เดือนนี้'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {profit && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'รายได้รวม', value: profit.revenue, color: '#22c55e', icon: '📈', bg: '#f0fdf4' },
            { label: 'ต้นทุนสินค้า (COGS)', value: profit.cogs, color: '#f59e0b', icon: '🧾', bg: '#fffbeb' },
            { label: 'รายจ่ายดำเนินงาน', value: profit.expenses, color: '#ef4444', icon: '💸', bg: '#fef2f2' },
            { label: 'กำไรสุทธิ', value: profit.net_profit, color: profit.net_profit >= 0 ? '#16a34a' : '#dc2626', icon: '🏆', bg: profit.net_profit >= 0 ? '#f0fdf4' : '#fef2f2' },
          ].map(({ label, value, color, icon, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '16px', padding: '20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
              <p className="thai-fix" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{label}</p>
              <p style={{ fontSize: '24px', fontWeight: '900', color, margin: 0 }}>฿{fmt(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {profit && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Daily trend chart */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: 'var(--coffee-dark)' }}>📊 แนวโน้มรายได้ vs รายจ่าย</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={profit.daily_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8df" />
                <XAxis dataKey="report_date" fontSize={10} tickFormatter={d => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} />
                <YAxis fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => `฿${fmt(Number(v))}`} />
                <Legend />
                <Bar dataKey="revenue"    name="รายได้"  fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="expenses"   name="รายจ่าย" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="net_profit" name="กำไร"    fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: 'var(--coffee-dark)' }}>🍩 รายจ่ายตามหมวด</h3>
            {profit.expenses_by_category.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <RePie>
                    <Pie data={profit.expenses_by_category} dataKey="total" nameKey="name_th" cx="50%" cy="50%" innerRadius={40} outerRadius={60}>
                      {profit.expenses_by_category.map((c, i) => <Cell key={i} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `฿${fmt(Number(v))}`} />
                  </RePie>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {profit.expenses_by_category.map(c => (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                        <span className="thai-fix" style={{ fontSize: '12px', color: '#6b7280' }}>{c.icon} {c.name_th}</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700' }}>฿{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>ไม่มีรายจ่าย</p>}
          </div>
        </div>
      )}

      {/* ── Expense Table ── */}
      <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0e8df', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--coffee-medium)' }}>ตั้งแต่:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e8d5c4', fontSize: '13px' }} />
            <span style={{ color: '#9ca3af' }}>–</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e8d5c4', fontSize: '13px' }} />
          </div>
          <button onClick={() => { setEditItem(undefined); setShowForm(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--coffee-dark)', color: 'white', padding: '8px 16px', borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
            <Plus size={16} /> บันทึกรายจ่าย
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div>
            <p>ยังไม่มีรายจ่ายในช่วงเวลานี้</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ background: '#fafcfb' }}>
                <tr>
                  {['วันที่', 'หมวดหมู่', 'รายละเอียด', 'ชำระด้วย', 'จำนวน', ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--coffee-light)', fontWeight: '700', borderBottom: '2px solid #f0e8df' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #f0e8df' }}>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{fmtDate(e.expense_date)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {e.category && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${e.category.color}15`, color: e.category.color, padding: '4px 10px', borderRadius: '20px', fontWeight: '700', fontSize: '12px' }}>
                          {e.category.icon} {e.category.name_th}
                        </span>
                      )}
                    </td>
                    <td className="thai-fix" style={{ padding: '12px 16px', color: '#374151' }}>{e.description || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {e.payment_method === 'cash' ? '💵 เงินสด' : e.payment_method === 'transfer' ? '📱 โอน' : '💳 บัตร'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '800', color: '#ef4444' }}>฿{fmt(e.amount)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { setEditItem(e); setShowForm(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: '#fafcfb' }}>
                <tr>
                  <td colSpan={4} style={{ padding: '12px 16px', fontWeight: '800', color: 'var(--coffee-dark)' }}>รวมรายจ่าย</td>
                  <td style={{ padding: '12px 16px', fontWeight: '900', color: '#ef4444', fontSize: '16px' }}>
                    ฿{fmt(expenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <ExpenseFormModal
          categories={categories}
          initial={editItem}
          onClose={() => { setShowForm(false); setEditItem(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
