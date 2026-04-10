'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase, GlobalSettings } from '@/lib/supabase'

interface SettingsContextType {
  settings: GlobalSettings
  loading: boolean
  refresh: () => Promise<void>
  updateSetting: (key: keyof GlobalSettings, value: any) => Promise<void>
}

const defaultSettings: GlobalSettings = {
  pos: { vat_rate: 7, service_charge: 0, enable_qr: true, currency: '฿', shop_id: 'default' },
  attendance: { shop_lat: 13.7563, shop_lng: 100.5018, allowed_radius_meters: 100, require_photo: true, auto_checkout_hour: 22 },
  notifications: { line_enabled: false, line_token: '', notify_on_order: true, notify_on_attendance: true },
  receipt: { header: 'Queen Coffee', footer: 'Thank you!', show_qr: true, promptpay_id: '0812345678' }
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (data.settings) setSettings(data.settings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()

    // Real-time updates
    const channel = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        refresh()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh])

  const updateSetting = async (key: keyof GlobalSettings, value: any) => {
    // Send to API
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    })
    if (!res.ok) alert('Failed to update settings')
    // Realtime will trigger refresh()
  }

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
