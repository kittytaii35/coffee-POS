'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, Filter, Coffee, User, CreditCard, Printer,
  Banknote, QrCode, Star, XCircle, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import { OrderStatus } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { printReceiptBrowser, printReceiptBluetooth, ReceiptData } from '@/lib/printer'
import { cancelOrderAction } from '@/app/actions/orderActions'
import type { OrderItem, ItemModifier } from '@/types/supabase'

interface OrderHistoryProps {
  startDate: string
  endDate: string
}

// ─── Modifier Pills ────────────────────────────────────────────
function ModifierPills({ modifiers }: { modifiers?: ItemModifier[] }) {
  if (!modifiers || modifiers.length === 0) return null
  return (
    <div className="modifier-pills">
      {modifiers.map((mod, i) => (
        <span key={i} className="modifier-pill">
          {mod.name}: <strong>{mod.value}</strong>
          {mod.price_delta > 0 && <em> +฿{mod.price_delta}</em>}
        </span>
      ))}
    </div>
  )
}

// ─── Order Items Cell ─────────────────────────────────────────
function OrderItemsCell({ items }: { items: OrderItem[] }) {
  const [expanded, setExpanded] = useState(false)
  const hasModifiers = items.some(i => i.modifiers && i.modifiers.length > 0)
  const displayItems = expanded ? items : items.slice(0, 2)

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {displayItems.map((item, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-block', padding: '2px 8px',
                background: '#fdf6f0', borderRadius: '4px',
                fontSize: '11px', border: '1px solid #e8d5c4',
                fontWeight: '600', color: 'var(--coffee-dark)',
              }}
            >
              {item.name} ×{item.quantity}
            </span>

            {/* Legacy sweetness/toppings (backward-compat) */}
            {(item.sweetness || (item.toppings && item.toppings.length > 0)) && !item.modifiers?.length && (
              <div style={{ paddingLeft: '8px', marginTop: '2px' }}>
                {item.sweetness && (
                  <span className="modifier-pill">หวาน: <strong>{item.sweetness}%</strong></span>
                )}
                {item.toppings?.map((t, ti) => (
                  <span key={ti} className="modifier-pill">{t}</span>
                ))}
              </div>
            )}

            {/* New structured modifiers */}
            {item.modifiers && item.modifiers.length > 0 && (
              <div style={{ paddingLeft: '8px', marginTop: '2px' }}>
                <ModifierPills modifiers={item.modifiers} />
              </div>
            )}

            {item.notes && (
              <div style={{ paddingLeft: '8px', marginTop: '2px' }}>
                <span className="modifier-pill" style={{ background: '#fff3cd', borderColor: '#fcd34d', color: '#92400e' }}>
                  📝 {item.notes}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {items.length > 2 && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '11px', color: 'var(--coffee-medium)', display: 'flex',
            alignItems: 'center', gap: '2px', marginTop: '4px', fontWeight: '600',
          }}
        >
          {expanded
            ? <><ChevronUp size={12} /> Show less</>
            : <><ChevronDown size={12} /> +{items.length - 2} more</>}
        </button>
      )}
    </div>
  )
}

// ─── Void Confirm Dialog ──────────────────────────────────────
function VoidConfirmDialog({
  order,
  onConfirm,
  onCancel,
  loading,
}: {
  order: any
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', padding: '28px',
        maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={22} color="#dc2626" />
          </div>
          <div>
            <h3 style={{ fontWeight: '800', fontSize: '16px', color: '#991b1b', margin: 0 }}>ยืนยันการยกเลิก</h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Confirm Order Void</p>
          </div>
        </div>

        <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '12px', marginBottom: '20px', fontSize: '13px' }}>
          <p style={{ fontWeight: '700', color: 'var(--coffee-dark)', marginBottom: '4px' }}>
            {order.order_id || `#${order.id.slice(-8).toUpperCase()}`} · ฿{order.total?.toLocaleString()}
          </p>
          {order.points_earned > 0 && (
            <p style={{ color: '#dc2626', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="currentColor" />
              จะหักคืน {order.points_earned} คะแนนที่เคยได้รับ
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb',
            background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: '#6b7280',
          }}>
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: loading ? '#f87171' : '#dc2626', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '800', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {loading ? <div className="animate-spin"><Coffee size={16} /></div> : <><XCircle size={16} /> Void Order</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function OrderHistory({ startDate, endDate }: OrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [openPrintId, setOpenPrintId] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<any | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)

  const { lang } = useLanguage()
  const { settings } = useSettings()
  const t = translations[lang].orderHistory
  const common = translations[lang].pos.status

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ startDate, endDate, status: statusFilter, search })
      const res = await fetch(`/api/orders?${params.toString()}`)
      const d = await res.json()
      if (!d.error) setOrders(d.orders || [])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, statusFilter, search])

  useEffect(() => {
    const timer = setTimeout(fetchHistory, 300)
    return () => clearTimeout(timer)
  }, [fetchHistory])

  const exportCSV = () => {
    if (orders.length === 0) return
    const headers = [t.date, 'ID', t.customer, t.items, t.total, t.status, t.payment, 'Method', 'Points Earned']
    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleString('th-TH'),
      o.order_id || o.id,
      o.customer_name,
      o.items.map((i: any) => `${i.name} x${i.quantity}`).join(' | '),
      o.total,
      o.status,
      o.paid ? t.paid : t.unpaid,
      o.payment_type || '-',
      o.points_earned || 0,
    ])
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.map(s => `"${s}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = `Order_History_${startDate}_to_${endDate}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = async (order: any, type: 'os' | 'bt') => {
    const data: ReceiptData = {
      shopName: settings.receipt.header || 'Queen Coffee',
      orderId: order.id,
      customerName: order.customer_name,
      items: order.items,
      total: order.total,
      paymentType: order.payment_type || 'cash',
      timestamp: new Date(order.created_at).toLocaleString('th-TH'),
    }
    if (type === 'os') printReceiptBrowser(data)
    else await printReceiptBluetooth(data)
    setOpenPrintId(null)
  }

  const handleVoidConfirm = async () => {
    if (!voidTarget) return
    setVoidLoading(true)
    try {
      const result = await cancelOrderAction({ orderId: voidTarget.id, reason: 'POS void' })
      if (result.success) {
        setVoidTarget(null)
        await fetchHistory()
      } else {
        alert(`ยกเลิกไม่ได้: ${result.error}`)
      }
    } finally {
      setVoidLoading(false)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: '#d1fae5', color: '#065f46' }
      case 'cancelled': return { bg: '#fee2e2', color: '#991b1b' }
      case 'ready':     return { bg: '#dbeafe', color: '#1e40af' }
      case 'preparing': return { bg: '#fef3c7', color: '#92400e' }
      default:          return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Filters Bar */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px',
        alignItems: 'center', flexWrap: 'wrap',
        background: 'white', padding: '16px', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--coffee-light)' }} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '12px', border: '1px solid #e8d5c4', outline: 'none', fontSize: '14px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #e8d5c4', outline: 'none', fontSize: '14px', cursor: 'pointer', background: 'white' }}
        >
          <option value="all">{t.allStatus}</option>
          <option value="pending">{common.pending}</option>
          <option value="preparing">{common.preparing}</option>
          <option value="ready">{common.ready}</option>
          <option value="completed">{common.completed}</option>
          <option value="cancelled">{common.cancelled}</option>
        </select>

        <button
          onClick={exportCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px', borderRadius: '12px', border: 'none',
            background: 'var(--coffee-dark)', color: 'white', fontWeight: '700',
            fontSize: '14px', cursor: 'pointer',
          }}
        >
          <Download size={18} /> {t.exportCsv}
        </button>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0e8df', background: '#faf7f4' }}>
              <th style={thStyle}>{t.date}</th>
              <th style={thStyle}>{t.customer}</th>
              <th style={thStyle}>{t.items}</th>
              <th style={thStyle}>{t.total}</th>
              <th style={thStyle}>{t.status}</th>
              <th style={thStyle}>{t.payment}</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}>
                    <Coffee size={32} color="var(--coffee-light)" />
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: 'var(--coffee-light)' }}>
                  {t.noOrders}
                </td>
              </tr>
            ) : orders.map(order => {
              const sc = statusColor(order.status)
              return (
                <tr key={order.id} style={{ borderBottom: '1px solid #f0e8df', transition: 'background 0.2s' }} className="hover-row">
                  {/* Date */}
                  <td style={{ padding: '14px 16px', fontSize: '13px', minWidth: '90px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--coffee-dark)' }}>
                      {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--coffee-light)' }}>
                      {new Date(order.created_at).toLocaleDateString('th-TH')}
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={16} color="var(--coffee-medium)" />
                      </div>
                      <div>
                        <p style={{ fontWeight: '700', fontSize: '14px', margin: 0 }}>{order.customer_name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--coffee-light)', margin: 0 }}>
                          {order.order_id || `#${order.id.slice(-8).toUpperCase()}`}
                        </p>
                        {order.points_earned > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <Star size={10} fill="#d4af37" color="#d4af37" />
                            <span style={{ fontSize: '10px', color: '#b8860b', fontWeight: '700' }}>
                              +{order.points_earned} pts
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Items with Modifiers */}
                  <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                    <OrderItemsCell items={order.items || []} />
                  </td>

                  {/* Total */}
                  <td style={{ padding: '14px 16px', fontWeight: '800', fontSize: '15px', whiteSpace: 'nowrap' }}>
                    <div>฿{order.total?.toLocaleString()}</div>
                    {order.discount_amount > 0 && (
                      <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                        -฿{order.discount_amount} disc.
                      </div>
                    )}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                      background: sc.bg, color: sc.color,
                    }}>
                      {common[order.status as keyof typeof common] || order.status}
                    </span>
                  </td>

                  {/* Payment */}
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={14} color={order.paid ? '#22c55e' : '#f59e0b'} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: order.paid ? '#22c55e' : '#f59e0b' }}>
                          {order.paid ? t.paid : t.unpaid}
                        </span>
                      </div>
                      {order.payment_type && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--coffee-light)', fontSize: '10px' }}>
                          {order.payment_type === 'cash' ? <Banknote size={10} /> : <QrCode size={10} />}
                          <span>{order.payment_type.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                      {/* Print Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setOpenPrintId(openPrintId === order.id ? null : order.id)}
                          style={actionBtnStyle}
                        >
                          <Printer size={13} /> {t.reprint}
                        </button>
                        {openPrintId === order.id && (
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 50, marginTop: '4px',
                            background: 'white', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: '1px solid #e8d5c4', overflow: 'hidden', minWidth: '160px',
                          }}>
                            <button onClick={() => handlePrint(order, 'os')} style={printBtnStyle}>{t.printUsb}</button>
                            <button onClick={() => handlePrint(order, 'bt')} style={printBtnStyle}>{t.printBt}</button>
                          </div>
                        )}
                      </div>

                      {/* Void Button – only for non-cancelled orders */}
                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => setVoidTarget(order)}
                          style={{
                            ...actionBtnStyle,
                            color: '#dc2626', borderColor: '#fca5a5',
                            background: '#fef2f2',
                          }}
                        >
                          <XCircle size={13} /> Void
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Void Confirmation Dialog */}
      {voidTarget && (
        <VoidConfirmDialog
          order={voidTarget}
          onConfirm={handleVoidConfirm}
          onCancel={() => setVoidTarget(null)}
          loading={voidLoading}
        />
      )}

      <style jsx>{`
        .hover-row:hover { background-color: #faf7f4; }
        .modifier-pills { display: flex; flex-wrap: wrap; gap: 3px; }
        .modifier-pill {
          display: inline-block; padding: 1px 6px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 4px; font-size: 10px; color: #166534;
        }
        .modifier-pill strong { font-weight: 700; }
        .modifier-pill em { font-style: normal; color: #d97706; }
      `}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '16px', fontSize: '13px', color: 'var(--coffee-light)', fontWeight: '700',
}

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: '8px', border: '1px solid #e8d5c4',
  background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
  fontSize: '11px', fontWeight: '600', color: 'var(--coffee-medium)', whiteSpace: 'nowrap',
}

const printBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
  cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--coffee-dark)',
  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
  borderBottom: '1px solid #f0e8df',
}
