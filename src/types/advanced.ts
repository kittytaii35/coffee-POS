// ============================================================
// types/advanced.ts — Queen Coffee Phase 2 TypeScript Types
// All interfaces mirror the Supabase schema in migration 005
// ============================================================

import type { Order, Member, MenuItem } from './supabase'

// ─── EPIC 1: INVENTORY & STOCK ────────────────────────────────

export type IngredientCategory = 'beans' | 'milk' | 'syrup' | 'cup' | 'topping' | 'other'
export type MovementType = 'in' | 'out' | 'adjust' | 'waste'

export interface Ingredient {
  id: string
  name: string
  name_th?: string
  unit: string                 // 'g' | 'ml' | 'piece'
  stock_qty: number
  low_stock_threshold: number
  cost_per_unit: number        // THB per unit
  category?: IngredientCategory
  supplier?: string
  image_url?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface RecipeItem {
  id: string
  menu_item_id: string
  ingredient_id: string
  qty_per_serve: number
  created_at: string
  // Joins
  ingredient?: Ingredient
  menu_item?: MenuItem
}

export interface StockMovement {
  id: string
  ingredient_id: string
  movement_type: MovementType
  qty_change: number
  qty_before: number
  qty_after: number
  reason?: string              // 'order_deduct' | 'stock_in' | 'waste' | 'manual'
  order_id?: string
  employee_id?: string
  cost_per_unit?: number
  created_at: string
  // Joins
  ingredient?: Pick<Ingredient, 'id' | 'name' | 'name_th' | 'unit'>
}

// Low-stock alert derived from Ingredient
export interface LowStockAlert {
  ingredient: Ingredient
  current: number
  threshold: number
  deficit: number
}


// ─── EPIC 2: CRM & LOYALTY TIERS ─────────────────────────────

export interface MemberTier {
  id: string
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | string
  name_th?: string
  min_points: number
  point_multiplier: number     // e.g. 1.5 = earn 1.5x points
  discount_pct: number         // permanent tier discount %
  free_drink_every?: number    // free drink every N orders
  badge_color: string
  badge_icon: string
  created_at: string
}

// Extended member with tier info
export interface MemberExtended extends Member {
  tier_id?: string
  lifetime_points: number
  visit_count: number
  favorite_menu_id?: string
  notes?: string
  birthday?: string
  // Joins
  tier?: MemberTier
  favorite_menu?: Pick<MenuItem, 'id' | 'name' | 'name_th'>
}

// Purchase history for CRM analytics
export interface MemberPurchaseHistory {
  member_id: string
  total_orders: number
  total_spent: number
  avg_order_value: number
  favorite_items: Array<{ menu_item_id: string; name: string; count: number }>
  last_visit: string
  monthly_trend: Array<{ month: string; spent: number; visits: number }>
}


// ─── EPIC 3: PROMOTION & DISCOUNT ENGINE ──────────────────────

export type PromotionType = 'percentage' | 'fixed' | 'bogo' | 'happy_hour' | 'tier_discount'
export type PromotionScope = 'all' | 'specific_items' | 'category'

export interface Promotion {
  id: string
  name: string
  name_th?: string
  type: PromotionType
  value: number                // % or THB amount
  min_order_amount: number
  max_discount_amount?: number
  applies_to: PromotionScope
  target_category?: string
  happy_hour_start?: string    // 'HH:MM'
  happy_hour_end?: string
  happy_hour_days: number[]    // [0..6]
  bogo_buy_qty: number
  bogo_get_qty: number
  start_date?: string
  end_date?: string
  usage_limit?: number
  usage_count: number
  per_member_limit: number
  requires_tier_id?: string
  active: boolean
  created_at: string
  updated_at: string
  // Joins
  items?: MenuItem[]           // for specific_items scope
  requires_tier?: MemberTier
}

export interface PromotionItem {
  id: string
  promotion_id: string
  menu_item_id: string
  menu_item?: MenuItem
}

export interface OrderPromotion {
  id: string
  order_id: string
  promotion_id: string
  discount_amount: number
  applied_at: string
  promotion?: Promotion
}

// Result from promotion engine calculation
export interface PromotionApplyResult {
  applicable: Promotion[]
  best: Promotion | null
  discount_amount: number
  final_total: number
  bogo_free_items: string[]    // menu_item_ids that are free (BOGO)
}


// ─── EPIC 4: KITCHEN DISPLAY SYSTEM (KDS) ────────────────────

export type KdsStatus = 'queued' | 'preparing' | 'ready' | 'served'

// KDS-enriched order (extends the base Order with kds fields)
export interface KdsOrder extends Order {
  kds_status: KdsStatus
  kds_started_at?: string
  kds_ready_at?: string
  priority: number
  // Derived
  wait_minutes?: number        // minutes since order was placed
  prep_minutes?: number        // minutes since started preparing
}

export interface KdsStation {
  id: string
  name: string
  categories?: string[]        // which menu categories appear here
  active: boolean
  created_at: string
}

// Kanban column definition used by the KDS UI
export interface KdsColumn {
  id: KdsStatus
  label: string
  label_th: string
  color: string
  orders: KdsOrder[]
}


// ─── EPIC 5: EXPENSE TRACKING & NET PROFIT ────────────────────

export interface ExpenseCategory {
  id: string
  name: string
  name_th?: string
  icon: string
  color: string
  created_at: string
}

export interface Expense {
  id: string
  category_id?: string
  amount: number
  description?: string
  expense_date: string         // YYYY-MM-DD
  payment_method: 'cash' | 'transfer' | 'credit_card'
  receipt_url?: string
  employee_id?: string
  is_recurring: boolean
  recur_period?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  created_at: string
  // Joins
  category?: ExpenseCategory
}

// v_daily_profit view row
export interface DailyProfit {
  report_date: string          // YYYY-MM-DD
  revenue: number
  expenses: number
  net_profit: number
  order_count: number
}

// Dashboard summary
export interface NetProfitSummary {
  period: 'today' | 'week' | 'month'
  revenue: number
  cogs: number                 // Cost of Goods Sold (from stock movements)
  gross_profit: number         // revenue - cogs
  expenses: number
  net_profit: number
  margin_pct: number           // net_profit / revenue * 100
  daily_data: DailyProfit[]
}
