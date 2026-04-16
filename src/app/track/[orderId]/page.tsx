'use client'

import { useEffect, useState, use } from 'react'
import { supabase, Order, OrderStatus } from '@/lib/supabase'
import {
  Clock, ChefHat, CheckCircle, Package,
  ArrowLeft, Coffee, QrCode, Calendar, CreditCard, Loader2
} from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function TrackOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const { lang } = useLanguage()
  const t = translations[lang].common
  const tr = translations[lang].order.track

  const STATUS_STEPS: { status: OrderStatus; icon: any; key: keyof typeof tr.steps }[] = [
    { status: 'pending', icon: Clock, key: 'pending' },
    { status: 'preparing', icon: ChefHat, key: 'preparing' },
    { status: 'ready', icon: CheckCircle, key: 'ready' },
    { status: 'completed', icon: Package, key: 'completed' },
  ]

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (data) setOrder(data)
      setLoading(false)
    }

    fetchOrder()

    const channel = supabase
      .channel(`track-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(payload.new as Order)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf7f4' }}>
        <Loader2 className="animate-spin" size={32} color="var(--coffee-medium)" />
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#faf7f4' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <Package size={40} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--coffee-dark)' }}>{tr.notFound}</h2>
        <p style={{ color: 'var(--coffee-light)', marginTop: '8px', marginBottom: '24px' }}>{tr.notFoundSub}</p>
        <Link href="/order" style={{ padding: '12px 24px', borderRadius: '12px', background: 'var(--coffee-dark)', color: 'white', textDecoration: 'none', fontWeight: '700' }}>
          {tr.backBtn}
        </Link>
      </div>
    )
  }

  const currentStep = STATUS_STEPS.findIndex(s => s.status === order.status)
  const isCancelled = order.status === 'cancelled'
  const currentStepData = STATUS_STEPS[currentStep] ? tr.steps[STATUS_STEPS[currentStep].key] : null

  return (
    <div style={{ minHeight: '100vh', background: '#faf7f4', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(160deg, var(--coffee-dark) 0%, var(--coffee-brown) 100%)',
        padding: '32px 24px 60px',
        color: 'white',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <Link href="/order" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{tr.orderId}</p>
            <h1 style={{ fontSize: '18px', fontWeight: '800' }}>{order.order_id || `#${order.id.slice(-8).toUpperCase()}`}</h1>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          {isCancelled ? (
            <div style={{ display: 'inline-flex', padding: '8px 24px', borderRadius: '24px', background: '#fee2e2', color: '#dc2626', fontWeight: '800', fontSize: '18px' }}>
              ❌ {tr.cancelled}
            </div>
          ) : (
            <div style={{ display: 'inline-flex', padding: '12px 28px', borderRadius: '24px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <Coffee size={32} color="var(--gold)" />
                <div style={{ position: 'absolute', top: -4, right: -4, width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', border: '2px solid white', animation: 'pulse-glow 2s infinite' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold)', lineHeight: 1.1 }}>
                  {currentStepData?.label}
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                  {currentStepData?.desc}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px', marginTop: '-30px' }}>
        {!isCancelled && (
          <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', position: 'relative' }}>
              {/* Line */}
              <div style={{ position: 'absolute', left: '16px', top: '24px', bottom: '24px', width: '2px', background: '#f1f5f9' }} />
              <div style={{ position: 'absolute', left: '16px', top: '24px', height: `${(currentStep / (STATUS_STEPS.length-1)) * 100}%`, width: '2px', background: 'var(--coffee-medium)', transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />

              {STATUS_STEPS.map((step, idx) => {
                const isActive = idx <= currentStep
                const isCurrent = idx === currentStep
                const StepIcon = step.icon
                const stepData = tr.steps[step.key]

                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', position: 'relative', zIndex: 10 }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                      background: isCurrent ? 'var(--coffee-medium)' : isActive ? 'var(--coffee-light)' : 'white',
                      border: `2px solid ${isActive ? 'transparent' : '#f1f5f9'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: isActive ? 'white' : '#cbd5e1',
                      transition: 'all 0.3s ease',
                      boxShadow: isCurrent ? '0 0 15px rgba(44,89,66,0.3)' : 'none',
                      marginTop: '2px'
                    }}>
                      <StepIcon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '15px', fontWeight: isCurrent ? '800' : '600', color: isCurrent ? 'var(--coffee-dark)' : isActive ? 'var(--coffee-medium)' : '#94a3b8', lineHeight: 1.2 }}>
                        {stepData.label}
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: '400', opacity: 0.7 }}>{stepData.labelEn}</span>
                      </h4>
                      {isCurrent && (
                        <p style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', marginTop: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>
                          {tr.updatedAt} {new Date(order.updated_at || order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <Calendar size={18} color="var(--coffee-light)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--coffee-dark)' }}>{tr.details}</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '15px', color: 'var(--coffee-dark)' }}>{lang === 'th' ? (item.name_th || item.name) : (item.name_en || item.name)} x{item.quantity}</p>
                  <p style={{ fontSize: '12px', color: 'var(--coffee-light)', marginTop: '2px' }}>
                    {[item.sweetness ? `หวาน ${item.sweetness}%` : '', ...(item.toppings || [])].filter(Boolean).join(', ')}
                  </p>
                </div>
                <p style={{ fontWeight: '800', color: 'var(--coffee-dark)' }}>฿{item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: 'var(--coffee-light)', fontWeight: '600' }}>{tr.total}</span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--coffee-dark)' }}>฿{order.total}</span>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
            <CreditCard size={16} color="#64748b" />
            <span style={{ fontSize: '13px', color: '#64748b' }}>{tr.payment}: {order.payment_type === 'promptpay' ? 'PromptPay QR' : order.payment_type === 'cash' ? 'เงินสด' : 'โอนเงิน'}</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '700', color: order.paid ? '#22c55e' : '#f59e0b' }}>
              {order.paid ? tr.paid : tr.unpaid}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
           <button 
             onClick={() => window.print()}
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', background: 'white', border: '1.5px solid #e2e8f0', color: '#64748b', fontWeight: '700', fontSize: '15px' }}
           >
             <QrCode size={18} /> {tr.saveQr}
           </button>
           <p style={{ fontSize: '11px', color: '#94a3b8' }}>* {tr.notice}</p>
        </div>
      </div>
      
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#64748b' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
        Live Tracking
      </div>
    </div>
  )
}
