'use client'

import { useState, useEffect, useCallback } from 'react'
import { SWEETNESS_OPTIONS } from '@/lib/menu'
import { ShoppingCart, Plus, Minus, X, ChevronRight, CheckCircle, Loader2, Coffee, Eye } from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { translations } from '@/lib/translations'

interface CartItem {
  id: string
  name: string
  name_th: string
  price: number
  quantity: number
  sweetness?: string
  toppings: string[]
  image?: string
}

type Step = 'menu' | 'cart' | 'info' | 'success'

export default function OrderPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spin" /></div>}>
      <OrderContent />
    </Suspense>
  )
}

function OrderContent() {
  const searchParams = useSearchParams()
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang].order
  const c = translations[lang].common
  const [activeCategory, setActiveCategory] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [step, setStep] = useState<Step>('menu')
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [sweetness, setSweetness] = useState('75')
  const [selectedToppings, setSelectedToppings] = useState<string[]>([])
  const [customerName, setCustomerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [lineUserId, setLineUserId] = useState<string | null>(null)

  // Auto-populate from LIFF/Query
  useEffect(() => {
    const luid = searchParams.get('line_user_id')
    const cname = searchParams.get('customer_name')
    if (luid) setLineUserId(luid)
    if (cname) setCustomerName(decodeURIComponent(cname))
    
    // Check localStorage for recent order
    const lastOrder = localStorage.getItem('last_order_id')
    if (lastOrder) {
       // Optional: show a small toast or button to track last order
    }
  }, [searchParams])

  const { settings, loading: settingsLoading } = useSettings()
  const shopName = settings.receipt.header
  const promptPayId = settings.receipt.promptpay_id

  useEffect(() => {
    const tick = () => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const t = setInterval(tick, 60000)
    
    // Fetch dynamic menu
    fetch('/api/menu')
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setMenuItems(d.products.map((p: any) => ({
            ...p,
            id: p.product_id || p.id // ensure backward compatibility with cart key logic
          })))
          setCategories(d.categories)
        }
        setMenuLoading(false)
      })

    return () => clearInterval(t)
  }, [])

  const filteredMenu = activeCategory === 'all'
    ? menuItems.filter(i => i.available)
    : menuItems.filter(i => i.category_id === activeCategory && i.available)

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const openItemModal = (item: any) => {
    setSelectedItem(item)
    setSweetness('75')
    setSelectedToppings([])
  }

  const addToCart = useCallback(() => {
    if (!selectedItem) return
    setCart(prev => {
      const key = `${selectedItem.id}-${sweetness}-${selectedToppings.sort().join(',')}`
      const existing = prev.find(
        i => i.id === key
      )
      if (existing) {
        return prev.map(i => i.id === key ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, {
        id: key,
        name: selectedItem.name,
        name_th: selectedItem.name_th,
        price: selectedItem.price,
        quantity: 1,
        sweetness: selectedItem.sweetness_options ? sweetness : undefined,
        toppings: selectedToppings,
        image: selectedItem.image,
      }]
    })
    setSelectedItem(null)
  }, [selectedItem, sweetness, selectedToppings])

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    )
  }

  const submitOrder = async () => {
    if (!customerName.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            sweetness: i.sweetness,
            toppings: i.toppings,
          })),
          total: cartTotal,
          line_user_id: lineUserId, // Send to API
        }),
      })
      const data = await res.json()
      if (data.success) {
        setOrderId(data.order.id)
        setStep('success')
        setCart([])
        // Bonus: Store last order for tracking
        localStorage.setItem('last_order_id', data.order.id)
      }
    } catch {
      alert('Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="animate-slide-up" style={{ padding: '40px 20px', maxWidth: '400px', margin: '40px auto', width: '100%' }}>
        <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(74, 222, 128, 0.4)'
          }}>
            <CheckCircle size={40} color="white" />
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '12px' }}>
            {t.placed}
          </h2>
          <p style={{ color: 'var(--coffee-light)', fontSize: '15px', marginBottom: '32px' }}>
            {t.placedMsg}
          </p>

          <div style={{
            background: '#fdf6f0', borderRadius: '16px', padding: '24px',
            border: '1px solid #e8d5c4', marginBottom: '24px'
          }}>
            <p style={{ color: 'var(--coffee-light)', fontSize: '13px', marginBottom: '8px' }}>{t.orderId}</p>
            <p style={{ fontSize: '32px', fontWeight: '900', color: 'var(--coffee-dark)', letterSpacing: '4px' }}>
              #{orderId.slice(-8).toUpperCase()}
            </p>
          </div>

          <Link href={`/track/${orderId}`} style={{ textDecoration: 'none' }}>
            <button className="btn-gold" style={{ width: '100%', marginBottom: '12px', background: 'linear-gradient(135deg, var(--coffee-medium), var(--coffee-dark))', color: 'white' }}>
              <Eye size={18} style={{ marginRight: '8px' }} /> ติดตามสถานะออเดอร์ Real-time
            </button>
          </Link>

          <p style={{ color: 'var(--coffee-light)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            ☕ {t.notify}
          </p>
          <button style={{ width: '100%', background: 'none', border: '1px solid #e8d5c4', padding: '12px', borderRadius: '12px', color: 'var(--coffee-light)', fontWeight: '700', cursor: 'pointer' }}
            onClick={() => { setStep('menu'); setCustomerName('') }}>
            {t.orderAgain}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--coffee-dark) 0%, #faf7f4 200px)',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-brown))',
        padding: '24px 20px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div className="header-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coffee size={22} color="var(--gold)" />
              <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>{shopName}</h1>
            </div>
            <p style={{ color: 'rgba(245,230,211,0.6)', fontSize: '12px' }}>{currentTime}</p>
          </div>
          {step === 'menu' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              
              {/* View Toggle */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '12px', gap: '2px' }}>
                <button 
                  onClick={() => setViewMode('grid')} 
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    background: viewMode === 'grid' ? 'white' : 'transparent',
                    color: viewMode === 'grid' ? 'var(--coffee-dark)' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s'
                  }}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    background: viewMode === 'list' ? 'white' : 'transparent',
                    color: viewMode === 'list' ? 'var(--coffee-dark)' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s'
                  }}
                >
                  List
                </button>
              </div>

              <button onClick={toggleLang} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', padding: '8px 14px', borderRadius: '14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {c.langToggle}
              </button>
              {cartCount > 0 && (
                <button
                  onClick={() => setStep('cart')}
                  style={{
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    border: 'none', borderRadius: '14px', padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: 'pointer', fontWeight: '700', color: 'var(--coffee-dark)',
                  }}
                >
                  <ShoppingCart size={18} />
                  <span>{cartCount}</span>
                  <span>·</span>
                  <span>฿{cartTotal}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category tabs */}
        {step === 'menu' && (
          <div style={{
            display: 'flex', gap: '8px', marginTop: '20px',
            overflowX: 'auto', paddingBottom: '4px',
            maxWidth: '1200px', margin: '20px auto 0',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}>
            <button
                onClick={() => setActiveCategory('all')}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  background: activeCategory === 'all'
                    ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                    : 'rgba(255,255,255,0.1)',
                  color: activeCategory === 'all' ? 'var(--coffee-dark)' : 'rgba(245,230,211,0.8)',
                  fontWeight: activeCategory === 'all' ? '700' : '500',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: '13px', transition: 'all 0.2s ease',
                }}
              >
                👑 {lang === 'th' ? 'ทั้งหมด' : 'All'}
              </button>
            {categories.filter(c => c.id !== 'all').map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  background: activeCategory === cat.id
                    ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                    : 'rgba(255,255,255,0.1)',
                  color: activeCategory === cat.id ? 'var(--coffee-dark)' : 'rgba(245,230,211,0.8)',
                  fontWeight: activeCategory === cat.id ? '700' : '500',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: '13px', transition: 'all 0.2s ease',
                }}
              >
                {cat.emoji} {lang === 'th' ? cat.label_th : cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Grid */}
      {step === 'menu' && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {menuLoading ? (
             <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--coffee-light)' }}>
                <Loader2 size={40} className="spin" style={{ margin: '0 auto 16px' }} />
                <p>Loading menu...</p>
             </div>
          ) : viewMode === 'grid' ? (
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {filteredMenu.map(item => (
                <div key={item.id} className="menu-card" onClick={() => openItemModal(item)}>
                  <div style={{
                    height: '160px',
                    width: '100%',
                    backgroundImage: `url(${item.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderBottom: '1px solid rgba(200, 151, 110, 0.15)',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: '#f9f5f0'
                  }} />
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--coffee-dark)', marginBottom: '2px' }}>
                      {lang === 'th' ? item.name_th : item.name}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--coffee-light)', marginBottom: '8px' }}>
                      {lang === 'th' ? item.name : item.name_th}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800', color: 'var(--coffee-medium)', fontSize: '16px' }}>
                        ฿{item.price}
                      </span>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--coffee-medium), var(--coffee-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Plus size={16} color="white" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View for Order Page */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMenu.map(item => (
                <div 
                  key={item.id} 
                  className="card" 
                  onClick={() => openItemModal(item)}
                  style={{ 
                    padding: '12px', display: 'flex', alignItems: 'center', gap: '16px', 
                    cursor: 'pointer', transition: 'transform 0.1s' 
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                    background: '#f9f5f0', border: '1px solid #e8d5c4'
                  }}>
                    {item.image ? <img src={item.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Coffee size={24} style={{ margin: '28px' }} color="#d1d5db" />}
                  </div>
                  <div style={{ flex: 1 }}>
                     <h4 style={{ fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)' }}>{lang === 'th' ? item.name_th : item.name}</h4>
                     <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{lang === 'th' ? item.name : item.name_th}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <p style={{ fontWeight: '900', fontSize: '18px', color: 'var(--gold)' }}>฿{item.price}</p>
                     <div style={{
                        marginTop: '4px', padding: '4px 10px', background: 'var(--coffee-medium)', color: 'white',
                        borderRadius: '20px', fontSize: '11px', fontWeight: '700', display: 'inline-block'
                     }}>
                        {lang === 'th' ? 'สั่งเลย' : 'Order'}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart */}
      {step === 'cart' && (
        <div className="animate-slide-up" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => setStep('menu')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>{t.cartTitle}</h2>
            <span style={{
              marginLeft: 'auto', fontSize: '13px', color: 'var(--coffee-light)',
              background: '#fdf6f0', padding: '4px 10px', borderRadius: '20px',
              border: '1px solid #e8d5c4',
            }}>
              {cartCount} {t.items}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {cart.map(item => (
              <div key={item.id} className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '12px',
                    backgroundImage: `url(${item.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=100&q=80'})`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    flexShrink: 0, border: '1px solid #e8d5c4'
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '700', fontSize: '15px', marginBottom: '2px' }}>{lang === 'th' ? item.name_th : item.name}</p>
                    {item.sweetness && (
                      <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{t.swLevel}: {item.sweetness}%</p>
                    )}
                    {item.toppings.length > 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>+ {item.toppings.join(', ')}</p>
                    )}
                    <p style={{ fontWeight: '800', color: 'var(--coffee-medium)', marginTop: '4px' }}>
                      ฿{item.price * item.quantity}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: '#fdf6f0', border: '1px solid #e8d5c4',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'var(--coffee-medium)', border: 'none',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} color="white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--coffee-light)' }}>{t.subtotal}</span>
              <span style={{ fontWeight: '600' }}>฿{cartTotal}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              paddingTop: '8px', borderTop: '1px solid #e8d5c4',
            }}>
              <span style={{ fontWeight: '800', fontSize: '18px' }}>{t.total}</span>
              <span style={{ fontWeight: '800', fontSize: '18px', color: 'var(--coffee-medium)' }}>฿{cartTotal}</span>
            </div>
          </div>

          <button
            className="btn-gold"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => setStep('info')}
          >
            {t.continue} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Customer Info */}
      {step === 'info' && (
        <div className="animate-slide-up" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button
              onClick={() => setStep('cart')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
            >
              ←
            </button>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>{t.details}</h2>
          </div>

          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '20px' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px', fontSize: '15px' }}>{t.nameLabel}</p>
              <input
                className="input-field"
                type="text"
                placeholder={t.namePH}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
            </label>

            <div style={{
              background: '#fdf6f0', borderRadius: '12px', padding: '14px',
              border: '1px solid #e8d5c4',
            }}>
              <p style={{ fontWeight: '700', marginBottom: '10px', color: 'var(--coffee-dark)' }}>{t.summary}</p>
              {cart.map((item: any) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: '6px', fontSize: '14px',
                }}>
                  <span style={{ color: 'var(--coffee-medium)' }}>{lang === 'th' ? item.name_th : item.name} x{item.quantity}</span>
                  <span style={{ fontWeight: '600' }}>฿{item.price * item.quantity}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '1px solid #e8d5c4', paddingTop: '8px', marginTop: '8px',
              }}>
                <span style={{ fontWeight: '800' }}>{t.total}</span>
                <span style={{ fontWeight: '800', color: 'var(--coffee-medium)' }}>฿{cartTotal}</span>
              </div>
            </div>
          </div>

          <button
            className="btn-gold"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: !customerName.trim() || submitting ? 0.6 : 1,
            }}
            disabled={!customerName.trim() || submitting}
            onClick={submitOrder}
          >
            {submitting ? (
              <><Loader2 size={18} className="spin" /> {t.placing}</>
            ) : (
              <><CheckCircle size={18} /> {t.orderBtn} · ฿{cartTotal}</>
            )}
          </button>
        </div>
      )}

      {/* Item Modal */}
      {selectedItem && (
        <div
          onClick={() => setSelectedItem(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            className="animate-slide-up"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '24px 24px 0 0',
              padding: '24px', width: '100%', maxWidth: '500px',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <img src={selectedItem.image} alt={selectedItem.name} style={{ width: '84px', height: '84px', borderRadius: '16px', objectFit: 'cover' }} />
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>
                    {lang === 'th' ? selectedItem.name_th : selectedItem.name}
                  </h3>
                  <p style={{ color: 'var(--coffee-light)', fontSize: '14px' }}>{lang === 'th' ? selectedItem.name : selectedItem.name_th}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#fdf6f0', border: '1px solid #e8d5c4',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {selectedItem.sweetness_options && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontWeight: '700', marginBottom: '10px' }}>{t.swLevel}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {SWEETNESS_OPTIONS.map((opt: any) => (
                    <button
                      key={opt.value}
                      onClick={() => setSweetness(opt.value)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px', border: '2px solid',
                        borderColor: sweetness === opt.value ? 'var(--coffee-medium)' : '#e8d5c4',
                        background: sweetness === opt.value ? '#fdf6f0' : 'white',
                        cursor: 'pointer', textAlign: 'left', fontSize: '14px',
                        fontWeight: sweetness === opt.value ? '700' : '400',
                        color: sweetness === opt.value ? 'var(--coffee-medium)' : 'var(--coffee-dark)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {lang === 'th' ? opt.label_th : opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedItem.toppings.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontWeight: '700', marginBottom: '10px' }}>{t.addons}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedItem.toppings.map((top: string) => {
                    const active = selectedToppings.includes(top)
                    return (
                      <button
                        key={top}
                        onClick={() => setSelectedToppings(prev =>
                          active ? prev.filter((t: string) => t !== top) : [...prev, top]
                        )}
                        style={{
                          padding: '8px 14px', borderRadius: '20px', border: '2px solid',
                          borderColor: active ? 'var(--coffee-medium)' : '#e8d5c4',
                          background: active ? 'var(--coffee-medium)' : 'white',
                          color: active ? 'white' : 'var(--coffee-medium)',
                          cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {active ? '✓ ' : '+ '}{top}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              paddingTop: '16px', borderTop: '1px solid #e8d5c4',
            }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--coffee-medium)' }}>
                ฿{selectedItem.price}
              </span>
              <button className="btn-primary" onClick={addToCart}>
                {t.addCart}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
