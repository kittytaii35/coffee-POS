'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, PieChart as PieIcon, TrendingUp, Users, Coffee } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'

export default function UnifiedReports() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'payments' | 'staff'>('sales')
  
  const { settings, loading: settingsLoading } = useSettings()
  const currency = settings.pos.currency

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setData(d)
        setLoading(false)
      })
  }, [])

  const exportCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csv = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.map(s => `"${s}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.href = encodeURI(csv)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Analytics...</div>
  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Failed to load reports.</div>

  const paymentData = [
    { name: 'Cash', value: data.payments?.cash || 0, color: '#f59e0b' },
    { name: 'Transfer', value: data.payments?.transfer || 0, color: '#3b82f6' },
    { name: 'PromptPay', value: data.payments?.promptpay || 0, color: '#10b981' },
  ].filter(d => d.value > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Sub Navigation ── */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #f3f4f6', paddingBottom: '16px' }}>
        <button onClick={() => setActiveTab('sales')} style={tabStyle(activeTab === 'sales')}><TrendingUp size={16}/> Sales & Peak</button>
        <button onClick={() => setActiveTab('products')} style={tabStyle(activeTab === 'products')}><Coffee size={16}/> Products</button>
        <button onClick={() => setActiveTab('payments')} style={tabStyle(activeTab === 'payments')}><PieIcon size={16}/> Payments</button>
        <button onClick={() => setActiveTab('staff')} style={tabStyle(activeTab === 'staff')}><Users size={16}/> Staff & Hours</button>
      </div>

      {/* ── SALES TAB ── */}
      {activeTab === 'sales' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px' }}>
          
          <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Daily Revenue Trend (30 Days)</h3>
              <button 
                onClick={() => exportCSV('Sales_Trend.csv', ['Date', 'Revenue'], data.sales.map((s: any) => [s.date, s.revenue]))}
                style={btnExportStyle}
              ><Download size={14} /> Export CSV</button>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.sales}>
                  <XAxis dataKey="date" fontSize={11} tickFormatter={(t) => t.substring(5)} />
                  <YAxis fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Peak Order Times (24h)</h3>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.peak}>
                  <XAxis dataKey="hour" fontSize={11} tickFormatter={(h) => `${h}:00`} />
                  <YAxis fontSize={11} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Top Selling Products</h3>
            <button 
              onClick={() => exportCSV('Products_Sales.csv', ['Product', 'Qty Sold', `Revenue (${currency})`], data.products.map((p: any) => [p.name, p.qty, p.revenue]))}
              style={btnExportStyle}
            ><Download size={14} /> Export CSV</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Qty Sold</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>{`Revenue (${currency})`}</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{p.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{p.qty}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>{currency}{p.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {activeTab === 'payments' && (
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '40px flex-wrap: wrap' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Payment Method Breakdown</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${currency}${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {paymentData.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: p.color }} />
                    <span style={{ fontWeight: '700' }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: '800', fontSize: '18px' }}>{currency}{p.value.toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: '#fdf6f0', borderRadius: '12px' }}>
                <span style={{ fontWeight: '800' }}>Total Revenue</span>
                <span style={{ fontWeight: '900', fontSize: '20px', color: '#d97706' }}>
                  {currency}{data.payments?.total?.toLocaleString() || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF TAB ── */}
      {activeTab === 'staff' && (
        <div className="card" style={{ padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Staff Working Hours (30 Days)</h3>
            <button 
              onClick={() => exportCSV('Staff_Hours.csv', ['Name', 'Shifts', 'Total Hours'], data.staff.map((s: any) => [s.name, s.shifts, s.hours]))}
              style={btnExportStyle}
            ><Download size={14} /> Export CSV</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left' }}>Staff Name</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total Shifts</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{s.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{s.shifts}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#3b82f6' }}>{s.hours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

const tabStyle = (active: boolean) => ({
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
  background: active ? '#111827' : 'transparent',
  color: active ? 'white' : '#6b7280',
  fontWeight: '700', fontSize: '14px', border: 'none',
  transition: 'all 0.2s'
})

const btnExportStyle = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '6px 12px', borderRadius: '8px', border: '1px solid #e5e7eb',
  background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
}
