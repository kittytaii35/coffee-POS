'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Order, OrderStatus, PaymentType } from '@/lib/supabase'
import { printReceiptBluetooth } from '@/lib/printer'
import { generatePromptPayPayload } from '@/lib/promptpay'
import {
  Clock, CheckCircle, AlertCircle,
  Printer, CreditCard, Banknote, QrCode,
  RefreshCw, Coffee, ChefHat, Package
} from 'lucide-react'
import QRCode from 'qrcode'
import { useSettings } from '@/context/SettingsContext'

type Tab = 'orders' | 'new-order'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; emoji: string }> = {
  pending: { label: 'Pending', color: '#92400e', bg: '#fef3c7', emoji: '⏳' },
  making: { label: 'Making', color: '#1e40af', bg: '#dbeafe', emoji: '👨‍🍳' },
  done: { label: 'Done', color: '#065f46', bg: '#d1fae5', emoji: '✅' },
  cancelled: { label: 'Cancelled', color: '#991b1b', bg: '#fee2e2', emoji: '❌' },
}

export default function POSPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('orders')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [paymentType, setPaymentType] = useState<PaymentType>('cash')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState('')

  const { settings, loading: settingsLoading } = useSettings()
  const vatRate = settings.pos.vat_rate
  const currency = settings.pos.currency
  const promptPayId = settings.receipt.promptpay_id
  const enableQr = settings.pos.enable_qr

  useEffect(() => {
    const tick = () =>
      setCurrentTime(new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/orders?date=${today}`)
      const data = await res.json()
      if (data.orders) setOrders(data.orders)
    } catch { /* API not available — no DB configured */ }
    setLoading(false)
  }, [])


  useEffect(() => {
    fetchOrders()

    // Supabase realtime subscription (only if configured)
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('orders')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'orders',
        }, () => { fetchOrders() })
        .subscribe()
    } catch { /* Realtime not available without valid Supabase config */ }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchOrders])


  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId)
    await fetch(`/api/orders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    })
    await fetchOrders()
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status } : null)
    }
    setUpdating(null)
  }

  const handlePayment = async () => {
    if (!selectedOrder) return
    setUpdating(selectedOrder.id)
    await fetch(`/api/orders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedOrder.id, payment_type: paymentType, paid: true, status: 'done' }),
    })
    await fetchOrders()
    setShowPayment(false)
    setSelectedOrder(null)
    setUpdating(null)
  }

  const printReceipt = async (order: Order) => {
    const result = await printReceiptBluetooth({
      shopName: 'Queen Coffee',
      orderId: order.id,
      customerName: order.customer_name,
      items: order.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      total: order.total,
      paymentType: order.payment_type || 'cash',
      timestamp: new Date(order.created_at).toLocaleString('th-TH'),
    })
    if (!result.success) {
      alert(`Print failed: ${result.error}`)
    }
  }

  const openPaymentModal = async (order: Order) => {
    setSelectedOrder(order)
    setShowPayment(true)
    setPaymentType('cash')
    // Pre-generate QR
    const payload = generatePromptPayPayload(
      promptPayId || '0812345678',
      order.total
    )
    try {
      const url = await QRCode.toDataURL(payload, { width: 256, margin: 2 })
      setQrDataUrl(url)
    } catch { /* silent */ }
  }

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus)

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    making: orders.filter(o => o.status === 'making').length,
    done: orders.filter(o => o.status === 'done').length,
    revenue: orders.filter(o => o.paid).reduce((s, o) => s + o.total, 0),
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#faf7f4', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px', flexShrink: 0,
        background: 'linear-gradient(160deg, var(--coffee-dark) 0%, var(--coffee-brown) 100%)',
        display: 'flex', flexDirection: 'column', padding: '20px',
        boxShadow: '4px 0 20px rgba(0,0,0,0.2)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Coffee size={24} color="var(--gold)" />
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800' }}>Queen Coffee</h1>
          </div>
          <p style={{ color: 'rgba(245,230,211,0.5)', fontSize: '12px' }}>POS System</p>
          <p style={{ color: 'var(--gold)', fontSize: '13px', fontWeight: '600', marginTop: '4px' }}>
            {currentTime}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: 'Pending', count: stats.pending, color: '#fcd34d', emoji: '⏳' },
            { label: 'Making', count: stats.making, color: '#93c5fd', emoji: '👨‍🍳' },
            { label: 'Done', count: stats.done, color: '#6ee7b7', emoji: '✅' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: '12px',
              padding: '10px 14px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', border: `1px solid ${s.color}20`,
            }}>
              <span style={{ color: 'rgba(245,230,211,0.7)', fontSize: '13px' }}>
                {s.emoji} {s.label}
              </span>
              <span style={{ color: s.color, fontWeight: '800', fontSize: '18px' }}>{s.count}</span>
            </div>
          ))}
          <div style={{
            background: 'rgba(212,168,83,0.15)', borderRadius: '12px',
            padding: '10px 14px', border: '1px solid rgba(212,168,83,0.3)',
          }}>
            <p style={{ color: 'rgba(245,230,211,0.6)', fontSize: '11px', marginBottom: '2px' }}>Today&apos;s Revenue</p>
            <p style={{ color: 'var(--gold)', fontWeight: '800', fontSize: '20px' }}>{currency}{stats.revenue}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div style={{ flex: 1 }}>
          <p style={{ color: 'rgba(245,230,211,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px', marginBottom: '8px' }}>
            FILTER
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(['all', 'pending', 'making', 'done'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '10px 14px', borderRadius: '10px', border: 'none',
                background: filterStatus === s ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                color: filterStatus === s ? 'var(--coffee-dark)' : 'rgba(245,230,211,0.7)',
                fontWeight: filterStatus === s ? '700' : '400',
                cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                transition: 'all 0.2s ease',
              }}>
                {s === 'all' ? '📋 All Orders' : `${STATUS_CONFIG[s].emoji} ${STATUS_CONFIG[s].label}`}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={fetchOrders}
          style={{
            padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)', color: 'rgba(245,230,211,0.7)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '14px', width: '100%',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          background: 'white', padding: '16px 24px',
          borderBottom: '1px solid #e8d5c4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--coffee-dark)' }}>
            Orders · {filteredOrders.length}
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/order" target="_blank" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '8px 16px', borderRadius: '10px', border: '2px solid #e8d5c4',
                background: 'white', cursor: 'pointer', fontSize: '13px',
                fontWeight: '600', color: 'var(--coffee-medium)', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <Package size={14} /> Customer Order
              </button>
            </a>
          </div>
        </div>

        {/* Order grid */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px', alignContent: 'start',
        }}>
          {loading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--coffee-light)' }}>
              <Coffee size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ fontSize: '16px' }}>Loading orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--coffee-light)' }}>
              <Coffee size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '18px', fontWeight: '600' }}>No orders yet</p>
              <p style={{ fontSize: '14px', marginTop: '4px', opacity: 0.7 }}>Orders will appear here in real-time</p>
            </div>
          ) : filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              updating={updating === order.id}
              onSelect={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
              selected={selectedOrder?.id === order.id}
              onUpdateStatus={updateOrderStatus}
              onPay={() => openPaymentModal(order)}
              onPrint={() => printReceipt(order)}
              currency={currency}
            />
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && selectedOrder && (
        <div
          onClick={() => setShowPayment(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="animate-slide-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '24px', padding: '28px',
              width: '100%', maxWidth: '440px',
            }}
          >
            <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>Payment</h3>
            <p style={{ color: 'var(--coffee-light)', fontSize: '14px', marginBottom: '20px' }}>
              Order #{selectedOrder.id.slice(-8).toUpperCase()} · {selectedOrder.customer_name}
            </p>

            <div style={{
              background: '#fdf6f0', borderRadius: '16px', padding: '20px',
              marginBottom: '20px', textAlign: 'center',
            }}>
              <p style={{ color: 'var(--coffee-light)', fontSize: '14px' }}>Total Amount</p>
              <p style={{ fontSize: '40px', fontWeight: '900', color: 'var(--coffee-dark)', lineHeight: 1.1 }}>
                {currency}{selectedOrder.total}
              </p>
            </div>

            <p style={{ fontWeight: '700', marginBottom: '12px' }}>Payment Method</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {[
                { type: 'cash' as PaymentType, icon: <Banknote size={20} />, label: 'Cash' },
                { type: 'transfer' as PaymentType, icon: <CreditCard size={20} />, label: 'Transfer' },
                { type: 'promptpay' as PaymentType, icon: <QrCode size={20} />, label: 'PromptPay' },
              ].map(p => (
                <button
                  key={p.type}
                  onClick={() => setPaymentType(p.type)}
                  style={{
                    flex: 1, padding: '14px 10px', borderRadius: '14px',
                    border: '2px solid', borderColor: paymentType === p.type ? 'var(--coffee-medium)' : '#e8d5c4',
                    background: paymentType === p.type ? '#fdf6f0' : 'white',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '6px',
                    color: paymentType === p.type ? 'var(--coffee-medium)' : 'var(--coffee-light)',
                    fontWeight: paymentType === p.type ? '700' : '400',
                    transition: 'all 0.15s ease', fontSize: '13px',
                  }}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>

            {paymentType === 'promptpay' && qrDataUrl && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <img src={qrDataUrl} alt="PromptPay QR" style={{ width: '200px', height: '200px', margin: '0 auto' }} />
                <p style={{ fontSize: '12px', color: 'var(--coffee-light)', marginTop: '8px' }}>
                  Scan with banking app
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowPayment(false)}
                style={{
                  flex: 1, padding: '14px', borderRadius: '14px',
                  border: '2px solid #e8d5c4', background: 'white',
                  cursor: 'pointer', fontWeight: '600', color: 'var(--coffee-light)',
                }}
              >
                Cancel
              </button>
              <button
                className="btn-gold"
                style={{ flex: 2 }}
                onClick={handlePayment}
                disabled={!!updating || settingsLoading}
              >
                <CheckCircle size={18} style={{ display: 'inline', marginRight: '6px' }} />
                Confirm Payment ({currency}{selectedOrder.total})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({
  order, updating, selected, onSelect, onUpdateStatus, onPay, onPrint, currency
}: {
  order: Order
  updating: boolean
  selected: boolean
  onSelect: () => void
  onUpdateStatus: (id: string, status: OrderStatus) => void
  onPay: () => void
  onPrint: () => void
  currency: string
}) {
  const config = STATUS_CONFIG[order.status]
  const timeSince = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <div
      className={`order-card ${order.status}`}
      style={{ cursor: 'pointer', opacity: updating ? 0.7 : 1 }}
      onClick={onSelect}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: selected ? '#fdf6f0' : 'white',
        borderBottom: '1px solid #f0e8df',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <p style={{ fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)' }}>
              {order.customer_name}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>
              #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
              background: config.bg, color: config.color,
            }}>
              {config.emoji} {config.label}
            </span>
            <p style={{ fontSize: '11px', color: 'var(--coffee-light)', marginTop: '4px' }}>
              <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
              {timeSince < 1 ? 'just now' : `${timeSince}m ago`}
            </p>
          </div>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {order.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '13px', color: 'var(--coffee-medium)',
            }}>
              <span>
                {item.name} x{item.quantity}
                {item.sweetness ? ` (${item.sweetness}%)` : ''}
              </span>
              <span style={{ fontWeight: '600' }}>{currency}{item.price * item.quantity}</span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #f0e8df', marginTop: '10px', paddingTop: '8px',
        }}>
          <span style={{ fontSize: '14px', color: 'var(--coffee-light)' }}>
            {order.paid ? '✅ Paid' : '💳 Unpaid'}
            {order.payment_type ? ` · ${order.payment_type}` : ''}
          </span>
          <span style={{ fontWeight: '800', color: 'var(--coffee-dark)', fontSize: '16px' }}>
            {currency}{order.total}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        padding: '10px 12px',
        background: selected ? '#fdf6f0' : '#faf7f4',
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }} onClick={e => e.stopPropagation()}>
        {order.status === 'pending' && (
          <ActionButton
            color="#3b82f6" label="▶ Start Making"
            onClick={() => onUpdateStatus(order.id, 'making')}
            icon={<ChefHat size={14} />}
          />
        )}
        {order.status === 'making' && (
          <ActionButton
            color="#22c55e" label="✓ Mark Done"
            onClick={() => onUpdateStatus(order.id, 'done')}
            icon={<CheckCircle size={14} />}
          />
        )}
        {order.status === 'done' && !order.paid && (
          <ActionButton
            color="var(--gold)" textColor="var(--coffee-dark)" label="💳 Collect Payment"
            onClick={onPay}
            icon={<CreditCard size={14} />}
          />
        )}
        <button
          onClick={onPrint}
          style={{
            padding: '7px 12px', borderRadius: '8px',
            border: '1px solid #e8d5c4', background: 'white',
            cursor: 'pointer', fontSize: '12px', color: 'var(--coffee-medium)',
            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600',
          }}
        >
          <Printer size={13} /> Print
        </button>
        {order.status !== 'cancelled' && order.status !== 'done' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'cancelled')}
            style={{
              padding: '7px 12px', borderRadius: '8px',
              border: '1px solid #fca5a5', background: '#fff5f5',
              cursor: 'pointer', fontSize: '12px', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <AlertCircle size={13} /> Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  color, textColor = 'white', label, onClick, icon
}: {
  color: string; textColor?: string; label: string; onClick: () => void; icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: '100px', padding: '8px 12px', borderRadius: '10px',
        border: 'none', background: color, color: textColor,
        cursor: 'pointer', fontWeight: '700', fontSize: '13px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        transition: 'opacity 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {icon} {label}
    </button>
  )
}
