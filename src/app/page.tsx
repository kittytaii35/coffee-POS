'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, X, ShieldAlert, Globe } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

const PROTECTED_ROUTES = ['/dashboard', '/products', '/settings', '/employees']

export default function HomePage() {
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang]
  const router = useRouter()

  const [targetUrl, setTargetUrl] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (PROTECTED_ROUTES.includes(href)) {
      e.preventDefault()
      setTargetUrl(href)
      setPin('')
      setError('')
      setShowPin(false)
    }
  }

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      setError(lang === 'th' ? 'กรุณากรอก PIN 4 หลัก' : 'Please enter 4-digit PIN')
      return
    }
    
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_code: pin })
      })
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        setError(data.error || (lang === 'th' ? 'PIN ไม่ถูกต้อง' : 'Invalid PIN'))
        setLoading(false)
        return
      }

      const role = data.employee?.role
      if (role === 'Manager' || role === 'Supervisor') {
        // Success
        router.push(targetUrl!)
      } else {
        setError(lang === 'th' ? 'ไม่มีสิทธิ์เข้าถึง (เฉพาะ Manager / Supervisor)' : 'Access denied (Manager / Supervisor only)')
        setLoading(false)
      }
    } catch {
      setError(lang === 'th' ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ' : 'Connection error')
      setLoading(false)
    }
  }


  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--coffee-dark) 0%, var(--coffee-brown) 40%, var(--coffee-medium) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(200,151,110,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      {/* Header-like actions */}
      <div className="header-content" style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100 }}>
        <button 
          onClick={toggleLang}
          className="thai-fix"
          style={{
            background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', 
            padding: '8px 16px', borderRadius: '14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Globe size={16} /> <span>{t.common.langToggle}</span>
        </button>
      </div>

      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '48px', padding: '0 20px' }}>
        <div style={{
          fontSize: '72px', marginBottom: '8px',
          filter: 'drop-shadow(0 4px 12px rgba(212,175,55,0.4))',
        }}>
          👑
        </div>
        <h1 className="thai-fix" style={{
          fontSize: '48px', fontWeight: '800', color: 'white',
          letterSpacing: '-1px', marginBottom: '8px',
        }}>
          {t.home.title}
        </h1>
        <p className="thai-fix" style={{ color: 'rgba(245,230,211,0.7)', fontSize: '18px', fontWeight: '400' }}>
          {t.home.subtitle}
        </p>
      </div>

      {/* Navigation cards */}
      <div
        className="animate-slide-up kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '900px',
        }}
      >
        <NavCard
          href="/order"
          emoji="📱"
          title={t.home.order}
          subtitle={t.home.orderSub}
          accent="#d4af37"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/pos"
          emoji="🖥️"
          title={t.home.pos}
          subtitle={t.home.posSub}
          accent="#60a5fa"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/attendance"
          emoji="👤"
          title={t.home.attendance}
          subtitle={t.home.attendanceSub}
          accent="#34d399"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/dashboard"
          emoji="📊"
          title={t.home.dashboard}
          subtitle={t.home.dashboardSub}
          accent="#f472b6"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/products"
          emoji="📦"
          title={t.home.products}
          subtitle={t.home.productsSub}
          accent="#ffb142"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/settings"
          emoji="⚙️"
          title={t.home.settings}
          subtitle={t.home.settingsSub}
          accent="#9ca3af"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
        <NavCard
          href="/employees"
          emoji="👥"
          title={t.home.employees}
          subtitle={t.home.employeesSub}
          accent="#a78bfa"
          openText={t.home.openButton}
          onClick={handleNavClick}
        />
      </div>

      <p style={{
        marginTop: '40px', color: 'rgba(245,230,211,0.4)',
        fontSize: '13px', textAlign: 'center',
      }}>
        Queen Coffee POS v1.0 · Built with Next.js & Supabase
      </p>

      {/* PIN LOCK MODAL */}
      {targetUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={() => setTargetUrl(null)}>
          <div className="animate-slide-up" style={{
            background: 'white', borderRadius: '28px', padding: '32px',
            width: '100%', maxWidth: '340px', textAlign: 'center',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)', position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setTargetUrl(null)} style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '32px', height: '32px', borderRadius: '50%',
              border: '1.5px solid #e8d5c4', background: '#fdf6f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--coffee-medium)',
            }}>
              <X size={16} />
            </button>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <ShieldAlert size={28} color="#dc2626" />
            </div>
            <h2 className="thai-fix" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '8px' }}>
              {lang === 'th' ? 'จำกัดสิทธิ์เข้าถึง' : 'Access Restricted'}
            </h2>
            <p style={{ color: 'var(--coffee-light)', fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
              {lang === 'th' 
                ? 'ส่วนนี้เข้าถึงได้เฉพาะ Manager / Supervisor. กรุณากรอกรหัส PIN ของท่าน'
                : 'This section requires Manager / Supervisor access. Please enter your PIN.'}
            </p>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                placeholder="••••"
                style={{
                  width: '100%', padding: '16px', borderRadius: '16px',
                  border: '2px solid #e8d5c4', background: '#fdf6f0',
                  fontSize: '28px', letterSpacing: '12px', textAlign: 'center',
                  outline: 'none', color: 'var(--coffee-dark)', fontWeight: '800'
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coffee-light)',
                }}
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className="animate-shake" style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePinSubmit}
              disabled={loading || pin.length !== 4}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-brown))',
                border: 'none', color: 'white', fontWeight: '800', fontSize: '16px',
                cursor: (loading || pin.length !== 4) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: (loading || pin.length !== 4) ? 0.7 : 1,
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)'
              }}
            >
              {loading ? <Loader2 size={20} className="spin" /> : (lang === 'th' ? 'ยืนยันตัวตน' : 'Verify')}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function NavCard({
  href,
  emoji,
  title,
  subtitle,
  accent,
  openText,
  onClick
}: {
  href: string
  emoji: string
  title: string
  subtitle: string
  accent: string
  openText: string
  onClick: (e: React.MouseEvent, href: string) => void
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }} onClick={(e) => onClick(e, href)}>
      <div
        className="glass"
        style={{
          padding: '28px 24px',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          textAlign: 'center',
          border: `1px solid rgba(255,255,255,0.15)`,
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          height: '100%',
          minHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-4px)'
          el.style.background = 'rgba(255,255,255,0.14)'
          el.style.boxShadow = `0 12px 40px ${accent}30`
          el.style.borderColor = accent + '60'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(0)'
          el.style.background = 'rgba(255,255,255,0.08)'
          el.style.boxShadow = 'none'
          el.style.borderColor = 'rgba(255,255,255,0.15)'
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{emoji}</div>
        <h2 style={{
          color: 'white', fontSize: '20px', fontWeight: '700',
          marginBottom: '6px',
        }}>
          {title}
        </h2>
        <p style={{ color: 'rgba(245,230,211,0.65)', fontSize: '13px', lineHeight: '1.5', minHeight: '38px' }}>
          {subtitle}
        </p>
        <div style={{
          marginTop: '16px',
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '20px',
          background: accent + '20',
          color: accent,
          fontSize: '12px',
          fontWeight: '600',
          border: `1px solid ${accent}40`,
        }}>
          {openText}
        </div>
      </div>
    </Link>
  )
}
