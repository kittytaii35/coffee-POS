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

export type OrderStatus = 'pending' | 'making' | 'done' | 'cancelled'
export type PaymentType = 'cash' | 'transfer' | 'promptpay'
export type AttendanceStatus = 'working' | 'done'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  sweetness?: string
  toppings?: string[]
  notes?: string
}

export interface Order {
  id: string
  customer_name: string
  line_user_id?: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  payment_type?: PaymentType
  paid: boolean
  created_at: string
}

export interface Employee {
  id: string
  name: string
  role: string
  pin_code: string
  created_at: string
}

export interface Attendance {
  id: string
  employee_id: string
  check_in: string
  check_out?: string
  work_hours?: number
  status: AttendanceStatus
  created_at: string
  employees?: Employee
}

export interface MenuItem {
  id: string
  name: string
  name_th: string
  price: number
  category: string
  description?: string
  image?: string
  available: boolean
  sweetness_options: boolean
  toppings: string[]
}

export interface Shift {
  id: string
  user_id: string
  opening_cash: number
  closing_cash?: number
  expected_cash?: number
  difference?: number
  start_time: string
  end_time?: string
  status: 'active' | 'closed'
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  payment_type: 'cash' | 'transfer' | 'qr'
  amount: number
  created_at: string
}
// --- GLOBAL SETTINGS ---
export interface GlobalSettings {
  pos: {
    vat_rate: number
    service_charge: number
    enable_qr: boolean
    currency: string
    shop_id: string
  }
  attendance: {
    shop_lat: number
    shop_lng: number
    allowed_radius_meters: number
    require_photo: boolean
    auto_checkout_hour: number
  }
  notifications: {
    line_enabled: boolean
    line_token: string
    notify_on_order: boolean
    notify_on_attendance: boolean
  }
  receipt: {
    header: string
    footer: string
    show_qr: boolean
    promptpay_id: string
  }
}

/**
 * Server-side loader for global settings
 * Usage: const settings = await getGlobalSettings()
 */
export async function getGlobalSettings(): Promise<GlobalSettings> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from('settings').select('key, value')
  
  // Default values if DB is empty or fails
  const defaults: GlobalSettings = {
    pos: { vat_rate: 7, service_charge: 0, enable_qr: true, currency: '฿', shop_id: 'default' },
    attendance: { shop_lat: 13.7563, shop_lng: 100.5018, allowed_radius_meters: 100, require_photo: true, auto_checkout_hour: 22 },
    notifications: { line_enabled: false, line_token: '', notify_on_order: true, notify_on_attendance: true },
    receipt: { header: 'Queen Coffee', footer: 'Thank you!', show_qr: true, promptpay_id: '0812345678' }
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
