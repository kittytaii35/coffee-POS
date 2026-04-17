'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Box, Globe } from 'lucide-react'
import ProductManager from '../dashboard/components/ProductManager'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function ProductsPage() {
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang].productManager
  const c = translations[lang].common
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-brown))',
        padding: '24px 20px',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}>
        <div className="header-content" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
              <h1 className="thai-fix" style={{ color: 'white', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box size={28} color="var(--gold)" /> {t.menuTitle}
              </h1>
              <p style={{ color: 'rgba(245,230,211,0.7)', fontSize: '13px' }}>{t.menuDesc}</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              onClick={toggleLang}
              className="thai-fix"
              style={{
                background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', 
                padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Globe size={16} /> <span>{c.langToggle}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px' }}>
        <div className="card" style={{ padding: '24px', position: 'relative' }}>
          <ProductManager />
        </div>
      </div>
    </div>
  )
}
