'use client'

import Link from 'next/link'

export default function HomePage() {

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
      <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          fontSize: '72px', marginBottom: '8px',
          filter: 'drop-shadow(0 4px 12px rgba(212,175,55,0.4))',
        }}>
          👑
        </div>
        <h1 style={{
          fontSize: '48px', fontWeight: '800', color: 'white',
          letterSpacing: '-1px', marginBottom: '8px',
        }}>
          Queen Coffee
        </h1>
        <p style={{ color: 'rgba(245,230,211,0.7)', fontSize: '18px', fontWeight: '400' }}>
          Coffee Shop Management System
        </p>
      </div>

      {/* Navigation cards */}
      <div
        className="animate-slide-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '800px',
        }}
      >
        <NavCard
          href="/order"
          emoji="📱"
          title="Order"
          subtitle="Customer ordering"
          subtitle2="via LIFF / Web"
          accent="#d4af37"
        />
        <NavCard
          href="/pos"
          emoji="🖥️"
          title="POS System"
          subtitle="Order management"
          subtitle2="for staff & cashier"
          accent="#60a5fa"
        />
        <NavCard
          href="/attendance"
          emoji="👤"
          title="Attendance"
          subtitle="Check-in / Check-out"
          subtitle2="employee system"
          accent="#34d399"
        />
        <NavCard
          href="/dashboard"
          emoji="📊"
          title="Dashboard"
          subtitle="Reports & analytics"
          subtitle2="for managers"
          accent="#f472b6"
        />
      </div>

      <p style={{
        marginTop: '40px', color: 'rgba(245,230,211,0.4)',
        fontSize: '13px', textAlign: 'center',
      }}>
        Queen Coffee POS v1.0 · Built with Next.js & Supabase
      </p>
    </main>
  )
}

function NavCard({
  href,
  emoji,
  title,
  subtitle,
  subtitle2,
  accent,
}: {
  href: string
  emoji: string
  title: string
  subtitle: string
  subtitle2: string
  accent: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
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
        <p style={{ color: 'rgba(245,230,211,0.65)', fontSize: '13px', lineHeight: '1.5' }}>
          {subtitle}
          <br />
          {subtitle2}
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
          Open →
        </div>
      </div>
    </Link>
  )
}
