import type { Promotion, PromotionApplyResult } from '@/types/advanced'

// ─── Pure promotion engine functions ──────────────────────────
// These are framework-agnostic and can be unit-tested independently.

interface CartItem {
  menu_item_id: string
  name: string
  price: number
  quantity: number
  category?: string
}

/**
 * Check if a promotion is currently valid (date + time + day).
 */
export function isPromotionActive(promo: Promotion, now = new Date()): boolean {
  if (!promo.active) return false

  // Date range
  if (promo.start_date && new Date(promo.start_date) > now) return false
  if (promo.end_date   && new Date(promo.end_date)   < now) return false

  // Usage limit
  if (promo.usage_limit !== null && promo.usage_limit !== undefined) {
    if (promo.usage_count >= promo.usage_limit) return false
  }

  // Happy hour check
  if (promo.type === 'happy_hour') {
    const dayOfWeek = now.getDay()
    if (!promo.happy_hour_days.includes(dayOfWeek)) return false

    const currentMins = now.getHours() * 60 + now.getMinutes()
    if (promo.happy_hour_start && promo.happy_hour_end) {
      const [sh, sm] = promo.happy_hour_start.split(':').map(Number)
      const [eh, em] = promo.happy_hour_end.split(':').map(Number)
      const startMins = sh * 60 + sm
      const endMins   = eh * 60 + em
      if (currentMins < startMins || currentMins > endMins) return false
    }
  }

  return true
}

/**
 * Check if a promotion applies to a given cart item.
 */
export function promotionAppliesTo(promo: Promotion, item: CartItem): boolean {
  if (promo.applies_to === 'all') return true
  if (promo.applies_to === 'category' && promo.target_category) {
    return item.category === promo.target_category
  }
  if (promo.applies_to === 'specific_items' && promo.items?.length) {
    return promo.items.some(pi => pi.id === item.menu_item_id)
  }
  return true
}

/**
 * Calculate the discount amount for a single promotion against a cart.
 */
export function calculateDiscount(
  promo: Promotion,
  cart: CartItem[],
  orderTotal: number
): { discountAmount: number; bogoFreeItems: string[] } {
  let discountAmount = 0
  const bogoFreeItems: string[] = []

  // Min order check
  if (orderTotal < promo.min_order_amount) {
    return { discountAmount: 0, bogoFreeItems: [] }
  }

  switch (promo.type) {
    case 'percentage':
    case 'happy_hour': {
      const eligible = cart.filter(i => promotionAppliesTo(promo, i))
      const eligibleTotal = eligible.reduce((s, i) => s + i.price * i.quantity, 0)
      discountAmount = (eligibleTotal * promo.value) / 100
      break
    }

    case 'fixed': {
      const eligible = cart.filter(i => promotionAppliesTo(promo, i))
      if (eligible.length > 0) {
        discountAmount = promo.value
      }
      break
    }

    case 'bogo': {
      // Find applicable items and give cheapest free
      const eligible = cart
        .filter(i => promotionAppliesTo(promo, i))
        .sort((a, b) => a.price - b.price)  // cheapest first (free item)

      if (eligible.length >= promo.bogo_buy_qty) {
        const freeCount = Math.floor(eligible.reduce((s, i) => s + i.quantity, 0) / (promo.bogo_buy_qty + promo.bogo_get_qty)) * promo.bogo_get_qty
        let remaining = freeCount
        for (const item of eligible) {
          const freeQty = Math.min(remaining, item.quantity)
          discountAmount += item.price * freeQty
          bogoFreeItems.push(item.menu_item_id)
          remaining -= freeQty
          if (remaining <= 0) break
        }
      }
      break
    }

    case 'tier_discount': {
      discountAmount = (orderTotal * promo.value) / 100
      break
    }
  }

  // Apply max discount cap
  if (promo.max_discount_amount !== null && promo.max_discount_amount !== undefined) {
    discountAmount = Math.min(discountAmount, promo.max_discount_amount)
  }

  return { discountAmount: Math.floor(discountAmount), bogoFreeItems }
}

/**
 * Main engine: evaluate all active promotions and return the best one.
 */
export function getApplicablePromotions(
  promotions: Promotion[],
  cart: CartItem[],
  orderTotal: number,
  now = new Date()
): PromotionApplyResult {
  const applicable: Promotion[] = []
  let bestPromo: Promotion | null = null
  let bestDiscount = 0
  const bestBogoItems: string[] = []

  for (const promo of promotions) {
    if (!isPromotionActive(promo, now)) continue
    if (cart.length === 0) continue

    const { discountAmount } = calculateDiscount(promo, cart, orderTotal)
    if (discountAmount > 0) {
      applicable.push(promo)
      if (discountAmount > bestDiscount) {
        bestDiscount = discountAmount
        bestPromo = promo
      }
    }
  }

  // Recalculate for best promo to get BOGO items
  let finalBogoItems: string[] = []
  if (bestPromo) {
    const { bogoFreeItems } = calculateDiscount(bestPromo, cart, orderTotal)
    finalBogoItems = bogoFreeItems
  }

  return {
    applicable,
    best: bestPromo,
    discount_amount: bestDiscount,
    final_total: Math.max(0, orderTotal - bestDiscount),
    bogo_free_items: finalBogoItems,
  }
}
