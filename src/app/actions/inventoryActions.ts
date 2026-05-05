'use server'

import { createServerSupabaseClient } from '@/lib/supabase'
import type { LowStockAlert } from '@/types/advanced'

/**
 * Deducts ingredient stock based on BOM when an order is completed.
 * Called from processPaymentAction after order is set to 'completed'.
 */
export async function deductStockForOrder(orderId: string): Promise<void> {
  const supabase = createServerSupabaseClient()

  // Get order items
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('items')
    .eq('id', orderId)
    .single()

  if (orderErr || !order) return

  const items = order.items as { id?: string; quantity: number }[]
  if (!items?.length) return

  for (const item of items) {
    if (!item.id) continue

    // Lookup BOM for this menu item
    const { data: bom } = await supabase
      .from('recipe_items')
      .select('ingredient_id, qty_per_serve, ingredients(id, stock_qty, name, cost_per_unit)')
      .eq('menu_item_id', item.id)

    if (!bom?.length) continue

    for (const recipeItem of bom) {
      const ingredient = (recipeItem as any).ingredients
      if (!ingredient) continue

      const totalQty  = recipeItem.qty_per_serve * item.quantity
      const qtyBefore = ingredient.stock_qty
      const qtyAfter  = Math.max(0, qtyBefore - totalQty)

      // Update stock
      await supabase
        .from('ingredients')
        .update({ stock_qty: qtyAfter })
        .eq('id', recipeItem.ingredient_id)

      // Log movement
      await supabase.from('stock_movements').insert({
        ingredient_id:  recipeItem.ingredient_id,
        movement_type:  'out',
        qty_change:     -totalQty,
        qty_before:     qtyBefore,
        qty_after:      qtyAfter,
        reason:         'order_deduct',
        order_id:       orderId,
        cost_per_unit:  ingredient.cost_per_unit || null,
      })
    }
  }
}

/**
 * Returns ingredients where stock_qty <= low_stock_threshold
 */
export async function getLowStockAlerts(): Promise<LowStockAlert[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .eq('active', true)
    .lte('stock_qty', 'low_stock_threshold') // column comparison — needs raw query
    // Workaround: fetch all active and filter client-side (replace with RPC in prod)

  const { data: all } = await supabase.from('ingredients').select('*').eq('active', true)

  const alerts: LowStockAlert[] = (all || [])
    .filter((i: any) => i.stock_qty <= i.low_stock_threshold)
    .map((i: any) => ({
      ingredient: i,
      current: i.stock_qty,
      threshold: i.low_stock_threshold,
      deficit: i.low_stock_threshold - i.stock_qty,
    }))

  return alerts
}

/**
 * Stock adjustment (waste, correction)
 */
export async function adjustStockAction(params: {
  ingredientId: string
  qtyChange: number
  reason: 'adjust' | 'waste'
  employeeId?: string
  note?: string
}) {
  const supabase = createServerSupabaseClient()

  const { data: ingredient, error } = await supabase
    .from('ingredients')
    .select('stock_qty')
    .eq('id', params.ingredientId)
    .single()

  if (error || !ingredient) throw new Error('ไม่พบวัตถุดิบ')

  const qtyBefore = ingredient.stock_qty
  const qtyAfter  = Math.max(0, qtyBefore + params.qtyChange)

  await supabase.from('ingredients').update({ stock_qty: qtyAfter }).eq('id', params.ingredientId)

  await supabase.from('stock_movements').insert({
    ingredient_id:  params.ingredientId,
    movement_type:  params.reason,
    qty_change:     params.qtyChange,
    qty_before:     qtyBefore,
    qty_after:      qtyAfter,
    reason:         params.note || params.reason,
    employee_id:    params.employeeId || null,
  })

  return { qtyBefore, qtyAfter }
}
