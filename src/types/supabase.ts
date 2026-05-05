// ============================================================
// Queen Coffee POS — Supabase TypeScript Types
// ============================================================

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type PaymentType = 'cash' | 'transfer' | 'promptpay'
export type PointTxType = 'earn' | 'redeem' | 'adjust' | 'void'

// ─── Modifier / Add-on ─────────────────────────────────────────
/**
 * A single modifier applied to an order item.
 * Stored inside the JSONB `modifiers` array on each OrderItem.
 *
 * Examples:
 *   { name: 'Sweetness', value: '50%',  price_delta: 0 }
 *   { name: 'Extra Shot', value: 'Yes', price_delta: 15 }
 *   { name: 'Milk Type',  value: 'Oat', price_delta: 10 }
 */
export interface ItemModifier {
  /** Display name of the modifier group, e.g. "Sweetness", "Extra Shot" */
  name: string
  /** Selected option value, e.g. "50%", "Yes", "Oat Milk" */
  value: string
  /** Additional cost for this modifier (0 if free) */
  price_delta: number
}

// ─── Order Item (stored in orders.items JSONB array) ───────────
export interface OrderItem {
  id: string
  name: string
  name_th?: string
  price: number
  quantity: number
  /** @deprecated Use modifiers array instead */
  sweetness?: string
  /** @deprecated Use modifiers array instead */
  toppings?: string[]
  notes?: string
  /** Structured modifiers – Extra Shot, Oat Milk, Sweetness level, etc. */
  modifiers?: ItemModifier[]
}

// ─── Order ─────────────────────────────────────────────────────
export interface Order {
  id: string
  order_id?: string
  customer_name: string
  customer_line_id?: string
  member_id?: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  payment_type?: PaymentType
  paid: boolean
  points_earned: number
  points_redeemed: number
  discount_amount: number
  created_at: string
  updated_at?: string
}

// ─── Member ────────────────────────────────────────────────────
export interface Member {
  id: string
  name: string
  phone: string
  line_id?: string
  points: number
  total_spent: number
  created_at: string
  last_visited?: string
}

// ─── Point Transaction ─────────────────────────────────────────
export interface PointTransaction {
  id: string
  member_id: string
  order_id?: string
  delta: number
  type: PointTxType
  note?: string
  created_at: string
}

// ─── Employee ──────────────────────────────────────────────────
export interface Employee {
  id: string
  name: string
  role: string
  pin_code: string
  created_at: string
}

// ─── Attendance ────────────────────────────────────────────────
export type AttendanceStatus = 'working' | 'done'

export interface Attendance {
  id: string
  employee_id: string
  check_in: string
  check_out?: string
  work_hours?: number
  status: AttendanceStatus
  latitude?: number
  longitude?: number
  image_url?: string
  created_at: string
  employees?: Employee
}

// ─── Menu Item ────────────────────────────────────────────────
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

// ─── Shift ───────────────────────────────────────────────────
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

// ─── Global Settings ─────────────────────────────────────────
export interface GlobalSettings {
  pos: {
    vat_rate: number
    service_charge: number
    enable_qr: boolean
    currency: string
    shop_id: string
    /** Points per THB spent  (default: 1/50 → 50 THB = 1 pt) */
    thb_per_point: number
    /** THB value of 1 redeemed point  (default: 1) */
    point_value_thb: number
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
