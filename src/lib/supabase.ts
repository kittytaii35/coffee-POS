import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your_supabase_url') &&
  !supabaseUrl.includes('placeholder')
)

// Helper to create client with safe URL
const safeCreateClient = (url: string, key: string) => {
  if (!url || !url.startsWith('http')) {
    // Return a dummy client or handles missing configuration
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }
  return createClient(url, key)
}

export const supabase = safeCreateClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role (API routes only)
export const createServerSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return safeCreateClient(url, serviceRoleKey)
}

// ── Re-export all domain types from the centralized types file ──
export type {
  OrderStatus, PaymentType, AttendanceStatus, PointTxType,
  ItemModifier, OrderItem, Order,
  Member, PointTransaction,
  Employee, Attendance,
  MenuItem, Shift, GlobalSettings,
} from '@/types/supabase'

// Legacy Payment interface (kept for backward compatibility)
export interface Payment {
  id: string
  order_id: string
  payment_type: 'cash' | 'transfer' | 'qr'
  amount: number
  created_at: string
}
// ─── getGlobalSettings ─────────────────────────────────────────
import type { GlobalSettings } from '@/types/supabase'

/**
 * Server-side loader for global settings.
 * Usage: const settings = await getGlobalSettings()
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from('settings').select('key, value')

  // Default values if DB is empty or fails
  const defaults: GlobalSettings = {
    pos: {
      vat_rate: 7, service_charge: 0, enable_qr: true,
      currency: '฿', shop_id: 'default',
      thb_per_point: 50, point_value_thb: 1,
    },
    attendance: { shop_lat: 13.7563, shop_lng: 100.5018, allowed_radius_meters: 100, require_photo: true, auto_checkout_hour: 22 },
    notifications: { line_enabled: false, line_token: '', notify_on_order: true, notify_on_attendance: true },
    receipt: { header: 'Queen Coffee', footer: 'Thank you!', show_qr: true, promptpay_id: '0812345678' },
  }

  if (error || !data) return defaults

  const settings: any = { ...defaults }
  data.forEach((item: any) => {
    if (settings[item.key]) {
      settings[item.key] = { ...settings[item.key], ...item.value }
    }
  })

  return settings as GlobalSettings
}
