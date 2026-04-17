'use client'

import React, { useState, useEffect } from 'react'
import { Search, Download, Calendar, Filter, ChevronRight, Coffee, User, CreditCard, Printer, Banknote, QrCode } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import { OrderStatus } from '@/lib/supabase'
import { useSettings } from '@/context/SettingsContext'
import { printReceiptBrowser, printReceiptBluetooth, ReceiptData } from '@/lib/printer'

interface OrderHistoryProps {
  startDate: string
  endDate: string
}

export default function OrderHistory({ startDate, endDate }: OrderHistoryProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [openPrintId, setOpenPrintId] = useState<string | null>(null)
  
  const { lang } = useLanguage()
  const { settings } = useSettings()
  const t = translations[lang].orderHistory
  const common = translations[lang].pos.status

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          startDate,
          endDate,
          status: statusFilter,
          search: search
        })
        const res = await fetch(`/api/orders?${params.toString()}`)
        const d = await res.json()
        if (!d.error) setOrders(d.orders || [])
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchHistory, 300) // Debounce search
    return () => clearTimeout(timer)
  }, [startDate, endDate, statusFilter, search])

  const exportCSV = () => {
    if (orders.length === 0) return
    const headers = [t.date, 'ID', t.customer, t.items, t.total, t.status, t.payment, 'Method']
    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleString('th-TH'),
      o.order_id || o.id,
      o.customer_name,
      o.items.map((i: any) => `${i.name} x${i.quantity}`).join(' | '),
      o.total,
      o.status,
      o.paid ? t.paid : t.unpaid,
      o.payment_type || '-'
    ])

    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.map(s => `"${s}"`).join(','))].join('\n')
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
      timestamp: new Date(order.created_at).toLocaleString('th-TH')
    }

    if (type === 'os') {
      printReceiptBrowser(data)
    } else {
      await printReceiptBluetooth(data)
    }
    setOpenPrintId(null)
  }

  return (
    <div className="animate-fade-in">
      {/* Filters Bar */}
      <div style={{ 
        display: 'flex', gap: '12px', marginBottom: '20px', 
        alignItems: 'center', flexWrap: 'wrap',
        background: 'white', padding: '16px', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--coffee-light)' }} />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '10px 10px 10px 40px', borderRadius: '12px',
              border: '1px solid #e8d5c4', outline: 'none', fontSize: '14px'
            }}
          />
        </div>

        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          style={{ 
            padding: '10px 16px', borderRadius: '12px', border: '1px solid #e8d5c4',
            outline: 'none', fontSize: '14px', cursor: 'pointer', background: 'white'
          }}
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
            fontSize: '14px', cursor: 'pointer'
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
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.date}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.customer}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.items}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.total}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.status}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.payment}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><Coffee size={32} color="var(--coffee-light)" /></div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: 'var(--coffee-light)' }}>{t.noOrders}</td>
              </tr>
            ) : orders.map((order) => (
              <tr key={order.id} style={{ borderBottom: '1px solid #f0e8df', transition: 'background 0.2s' }} className="hover-row">
                <td style={{ padding: '16px', fontSize: '13px' }}>
                  <div style={{ fontWeight: '700', color: 'var(--coffee-dark)' }}>{new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ fontSize: '11px', color: 'var(--coffee-light)' }}>{new Date(order.created_at).toLocaleDateString('th-TH')}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color="var(--coffee-medium)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '14px' }}>{order.customer_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--coffee-light)', letterSpacing: '0.5px' }}>{order.order_id || `#${order.id.slice(-8).toUpperCase()}`}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', maxWidth: '300px' }}>
                  <div style={{ fontSize: '13px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {order.items.map((item: any, i: number) => (
                      <span key={i} style={{ padding: '2px 8px', background: '#fdf6f0', borderRadius: '4px', fontSize: '11px', border: '1px solid #e8d5c4' }}>
                        {item.name} x{item.quantity}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '16px', fontWeight: '800', fontSize: '15px' }}>
                  ฿{order.total.toLocaleString()}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: order.status === 'completed' ? '#d1fae5' : order.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                    color: order.status === 'completed' ? '#065f46' : order.status === 'cancelled' ? '#991b1b' : '#92400e'
                  }}>
                    {common[order.status as keyof typeof common] || order.status}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
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
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => setOpenPrintId(openPrintId === order.id ? null : order.id)}
                      style={{ 
                        padding: '8px 12px', borderRadius: '8px', border: '1px solid #e8d5c4',
                        background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', fontWeight: '600', color: 'var(--coffee-medium)', margin: '0 auto'
                      }}
                    >
                      <Printer size={14} /> {t.reprint}
                    </button>
                    {openPrintId === order.id && (
                      <div style={{ 
                        position: 'absolute', top: '100%', right: 0, zIndex: 50, marginTop: '4px',
                        background: 'white', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        border: '1px solid #e8d5c4', overflow: 'hidden', minWidth: '160px'
                      }}>
                        <button onClick={() => handlePrint(order, 'os')} style={printBtnStyle}>{t.printUsb}</button>
                        <button onClick={() => handlePrint(order, 'bt')} style={printBtnStyle}>{t.printBt}</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .hover-row:hover {
          background-color: #faf7f4;
        }
      `}</style>
    </div>
  )
}

const printBtnStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
  cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--coffee-dark)',
  fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
  borderBottom: '1px solid #f0e8df'
}
