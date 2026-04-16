'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings, Save, RefreshCw, MapPin, 
  Wallet, Bell, Receipt, CheckCircle, 
  AlertCircle, Shield, Globe
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

export default function GlobalSettingsManager() {
  const { lang } = useLanguage()
  const t = translations[lang].settingsPage
  const { settings, loading: contextLoading, refresh } = useSettings()
  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleUpdate = async (category: keyof typeof settings, key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const saveSettings = async (category: keyof typeof settings) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: category,
          value: localSettings[category]
        })
      })
      setMessage({ type: 'success', text: `${category.toUpperCase()} ${t.successSave}` })
      await refresh()
    } catch (err) {
      setMessage({ type: 'error', text: t.errSave })
    } finally {
      setSaving(false)
    }
  }

  if (contextLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t.loading}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--coffee-dark)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Settings size={28} /> {t.globalConfig}
          </h2>
          <p style={{ color: 'var(--coffee-light)', fontSize: '14px', marginTop: '4px' }}>
            {t.globalDesc}
          </p>
        </div>
        <button onClick={() => refresh()} style={btnSecondaryStyle}>
          <RefreshCw size={16} /> {t.syncNow}
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: '16px', borderRadius: '12px', 
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: message.type === 'success' ? '#16a34a' : '#dc2626',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600'
        }}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* POS SETTINGS */}
        <SettingsCard 
          icon={<Wallet color="#d4af37" />} 
          title={t.posSales} 
          description={t.posSalesDesc}
          onSave={() => saveSettings('pos')}
          saving={saving}
          saveText={t.save}
        >
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.vatRate}</label>
            <input 
              type="number" 
              value={localSettings.pos.vat_rate} 
              onChange={e => handleUpdate('pos', 'vat_rate', parseFloat(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.currencySym}</label>
            <input 
              type="text" 
              value={localSettings.pos.currency} 
              onChange={e => handleUpdate('pos', 'currency', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.enableQr}</label>
            <Toggle 
              active={localSettings.pos.enable_qr} 
              onToggle={(v) => handleUpdate('pos', 'enable_qr', v)} 
            />
          </div>
        </SettingsCard>

        {/* ATTENDANCE SETTINGS */}
        <SettingsCard 
          icon={<MapPin color="#3b82f6" />} 
          title={t.attGps} 
          description={t.attGpsDesc}
          onSave={() => saveSettings('attendance')}
          saving={saving}
          saveText={t.save}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px' }}>
            <div style={fieldGroupStyleInline}>
              <label style={labelStyleSmall}>{t.lat}</label>
              <input 
                type="number" 
                value={localSettings.attendance.shop_lat} 
                onChange={e => handleUpdate('attendance', 'shop_lat', parseFloat(e.target.value))}
                style={inputStyleSmall}
              />
            </div>
            <div style={fieldGroupStyleInline}>
              <label style={labelStyleSmall}>{t.lng}</label>
              <input 
                type="number" 
                value={localSettings.attendance.shop_lng} 
                onChange={e => handleUpdate('attendance', 'shop_lng', parseFloat(e.target.value))}
                style={inputStyleSmall}
              />
            </div>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.radiusMode}</label>
            <input 
              type="number" 
              value={localSettings.attendance.allowed_radius_meters} 
              onChange={e => handleUpdate('attendance', 'allowed_radius_meters', parseFloat(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.reqPhoto}</label>
            <Toggle 
              active={localSettings.attendance.require_photo} 
              onToggle={(v) => handleUpdate('attendance', 'require_photo', v)} 
            />
          </div>
        </SettingsCard>

        {/* NOTIFICATIONS */}
        <SettingsCard 
          icon={<Bell color="#f59e0b" />} 
          title={t.notifications} 
          description={t.notifDesc}
          onSave={() => saveSettings('notifications')}
          saving={saving}
          saveText={t.save}
        >
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.lineToken}</label>
            <input 
              type="password" 
              value={localSettings.notifications.line_token} 
              onChange={e => handleUpdate('notifications', 'line_token', e.target.value)}
              placeholder={t.lineTokenHold}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.enableLine}</label>
            <Toggle 
              active={localSettings.notifications.line_enabled} 
              onToggle={(v) => handleUpdate('notifications', 'line_enabled', v)} 
            />
          </div>
        </SettingsCard>

        {/* RECEIPT & BRANDING */}
        <SettingsCard 
          icon={<Receipt color="#8b5cf6" />} 
          title={t.receiptBrand} 
          description={t.receiptBrandDesc}
          onSave={() => saveSettings('receipt')}
          saving={saving}
          saveText={t.save}
        >
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.shopName}</label>
            <input 
              type="text" 
              value={localSettings.receipt.header} 
              onChange={e => handleUpdate('receipt', 'header', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.receiptFoot}</label>
            <input 
              type="text" 
              value={localSettings.receipt.footer} 
              onChange={e => handleUpdate('receipt', 'footer', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>{t.promptpayId}</label>
            <input 
              type="text" 
              value={localSettings.receipt.promptpay_id} 
              onChange={e => handleUpdate('receipt', 'promptpay_id', e.target.value)}
              style={inputStyle}
            />
          </div>
        </SettingsCard>

      </div>

      <div style={{ 
        padding: '24px', background: 'rgba(212,175,55,0.05)', 
        borderRadius: '20px', border: '1px dashed var(--gold)',
        display: 'flex', alignItems: 'center', gap: '20px',
        flexWrap: 'wrap'
      }}>
        <Shield size={40} color="var(--gold)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h4 style={{ fontWeight: '800', color: 'var(--coffee-dark)' }}>{t.securityNotice}</h4>
          <p style={{ fontSize: '13px', color: 'var(--coffee-light)' }}>
            {t.securityDesc}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Internal Sub-components ───

function SettingsCard({ icon, title, description, children, onSave, saving, saveText = 'Save' }: any) {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f0e8df', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--coffee-dark)' }}>{title}</h3>
            <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{description}</p>
          </div>
        </div>
        <button onClick={onSave} disabled={saving} style={btnSaveStyle}>
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />} {saveText}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  )
}

function Toggle({ active, onToggle }: { active: boolean, onToggle: (v: boolean) => void }) {
  return (
    <div 
      onClick={() => onToggle(!active)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: active ? '#22c55e' : '#e5e7eb',
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{
        position: 'absolute', top: '2px', left: active ? '22px' : '2px',
        width: '20px', height: '20px', borderRadius: '50%',
        background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }} />
    </div>
  )
}

// ─── Styles ───

const fieldGroupStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #f9fafb',
  gap: '12px'
}

const fieldGroupStyleInline = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #f9fafb',
  gap: '8px'
}

const labelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: 'var(--coffee-medium)',
  whiteSpace: 'nowrap'
}

const labelStyleSmall = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--coffee-light)',
  whiteSpace: 'nowrap'
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '14px',
  textAlign: 'right' as const,
  width: '100%',
  maxWidth: '220px',
  outline: 'none',
  background: '#fafafa',
  minWidth: '0'
}

const inputStyleSmall = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
  textAlign: 'right' as const,
  width: '100%',
  outline: 'none',
  background: '#fafafa',
  minWidth: '0'
}

const btnSaveStyle = {
  padding: '8px 16px',
  borderRadius: '8px',
  background: 'var(--coffee-dark)',
  color: 'white',
  fontWeight: '700',
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: 'none',
  cursor: 'pointer'
}

const btnSecondaryStyle = {
  padding: '10px 18px',
  borderRadius: '12px',
  background: 'white',
  color: 'var(--coffee-dark)',
  fontWeight: '700',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #e5e7eb',
  cursor: 'pointer'
}
