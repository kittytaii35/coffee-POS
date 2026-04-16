'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import GlobalSettingsManager from '../dashboard/components/GlobalSettingsManager'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function SettingsPage() {
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang].settingsPage
  const c = translations[lang].common
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-brown))',
        padding: '24px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/">
            <button style={{
              width: '40px', height: '40px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }} title={lang === 'th' ? 'หน้าหลัก' : 'Home'}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={28} color="var(--gold)" /> {t.title}
            </h1>
            <p style={{ color: 'rgba(245,230,211,0.7)', fontSize: '14px' }}>{t.desc}</p>
          </div>
          
          <div style={{ marginLeft: 'auto' }}>
            <button 
              onClick={toggleLang}
              style={{
                background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', 
                padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              {c.langToggle}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="card" style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)' }}>
          <GlobalSettingsManager />
        </div>
      </div>
    </div>
  )
}
