'use server'

import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'
import type { OrderItem } from '@/types/supabase'

// ─── Constants ────────────────────────────────────────────────
const THB_PER_POINT = 50  // 50 THB = 1 point
const POINT_VALUE_THB = 1 // 1 point = 1 THB discount

// ─── Helpers ─────────────────────────────────────────────────
function calcPointsEarned(totalAmount: number): number {
  return Math.floor(totalAmount / THB_PER_POINT)
}

function calcRedemptionDiscount(pointsToRedeem: number): number {
  return pointsToRedeem * POINT_VALUE_THB
}

// ============================================================
// ACTION 1: Process Payment & Award Points
// Call this when setting an order to 'completed'
// ============================================================
export interface ProcessPaymentInput {
  orderId: string
  memberId?: string | null
  totalAmount: number
  paymentType: 'cash' | 'transfer' | 'promptpay'
  pointsRedeemed?: number
}

export interface ProcessPaymentResult {
  success: boolean
  pointsEarned: number
  newMemberPoints?: number
  discountApplied: number
  error?: string
}

export async function processPaymentAction(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResult> {
  if (!isSupabaseConfigured) {
    // Mock mode – return a simulated result
    const earned = calcPointsEarned(input.totalAmount)
    return { success: true, pointsEarned: earned, discountApplied: 0 }
  }

  const supabase = createServerSupabaseClient()

  try {
    const redeemed = input.pointsRedeemed ?? 0
    const discountApplied = calcRedemptionDiscount(redeemed)
    const effectiveTotal = Math.max(0, input.totalAmount - discountApplied)
    const pointsEarned = calcPointsEarned(effectiveTotal)

    // ── 1. Update order to completed ──────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        paid: true,
        payment_type: input.paymentType,
        points_earned: pointsEarned,
        points_redeemed: redeemed,
        discount_amount: discountApplied,
      })
      .eq('id', input.orderId)
      .select()
      .single()

    if (orderError) throw orderError

    // ── 2. Handle member points (if linked) ───────────────
    let newMemberPoints: number | undefined

    if (input.memberId) {
      // 2a. Deduct redeemed points first
      if (redeemed > 0) {
        const { error: deductError } = await supabase.rpc('adjust_member_points', {
          p_member_id: input.memberId,
          p_delta: -redeemed,
        })
        if (deductError) throw deductError

        await supabase.from('point_transactions').insert({
          member_id: input.memberId,
          order_id: input.orderId,
          delta: -redeemed,
          type: 'redeem',
          note: `Redeemed ${redeemed} pts for ฿${discountApplied} discount on order ${order.order_id ?? input.orderId}`,
        })
      }

      // 2b. Award earned points
      // NOTE: The DB trigger `trg_award_points` handles this automatically.
      // We just read back the updated total for the response.
      const { data: member } = await supabase
        .from('members')
        .select('points')
        .eq('id', input.memberId)
        .single()

      newMemberPoints = member?.points
    }

    return { success: true, pointsEarned, newMemberPoints, discountApplied }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[processPaymentAction] error:', message)
    return { success: false, pointsEarned: 0, discountApplied: 0, error: message }
  }
}

// ============================================================
// ACTION 2: Redeem Points (preview/validate before checkout)
// ============================================================
export interface RedeemPreviewInput {
  memberId: string
  pointsToRedeem: number
  orderTotal: number
}

export interface RedeemPreviewResult {
  valid: boolean
  discountAmount: number
  finalTotal: number
  remainingPoints: number
  error?: string
}

export async function previewRedemptionAction(
  input: RedeemPreviewInput
): Promise<RedeemPreviewResult> {
  if (!isSupabaseConfigured) {
    const discount = calcRedemptionDiscount(input.pointsToRedeem)
    return {
      valid: true,
      discountAmount: discount,
      finalTotal: Math.max(0, input.orderTotal - discount),
      remainingPoints: 0,
    }
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data: member, error } = await supabase
      .from('members')
      .select('points')
      .eq('id', input.memberId)
      .single()

    if (error || !member) {
      return { valid: false, discountAmount: 0, finalTotal: input.orderTotal, remainingPoints: 0, error: 'Member not found' }
    }

    if (input.pointsToRedeem > member.points) {
      return {
        valid: false,
        discountAmount: 0,
        finalTotal: input.orderTotal,
        remainingPoints: member.points,
        error: `Insufficient points. Available: ${member.points}`,
      }
    }

    const discount = calcRedemptionDiscount(input.pointsToRedeem)
    const finalTotal = Math.max(0, input.orderTotal - discount)

    return {
      valid: true,
      discountAmount: discount,
      finalTotal,
      remainingPoints: member.points - input.pointsToRedeem,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { valid: false, discountAmount: 0, finalTotal: input.orderTotal, remainingPoints: 0, error: message }
  }
}

// ============================================================
// ACTION 3: Cancel Order (Void) with Point Rollback
// ============================================================
export interface CancelOrderInput {
  orderId: string
  reason?: string
}

export interface CancelOrderResult {
  success: boolean
  pointsDeducted: number
  error?: string
}

export async function cancelOrderAction(
  input: CancelOrderInput
): Promise<CancelOrderResult> {
  if (!isSupabaseConfigured) {
    return { success: true, pointsDeducted: 0 }
  }

  const supabase = createServerSupabaseClient()

  try {
    // ── 1. Fetch current order state ──────────────────────
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_id, status, member_id, points_earned, total, items')
      .eq('id', input.orderId)
      .single()

    if (fetchError || !order) throw fetchError ?? new Error('Order not found')
    if (order.status === 'cancelled') {
      return { success: false, pointsDeducted: 0, error: 'Order is already cancelled' }
    }

    // ── 2. Mark order cancelled ───────────────────────────
    // The DB trigger `trg_rollback_cancel` will automatically:
    //   • Deduct points_earned from the member
    //   • Insert a void transaction in point_transactions
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', input.orderId)

    if (updateError) throw updateError

    // ── 3. Inventory rollback (application-level) ─────────
    // If you maintain a `stock` / `inventory` table, implement here.
    // The block below is a template – adapt column names to your schema.
    /*
    const items = (order.items ?? []) as OrderItem[]
    for (const item of items) {
      if (!item.id) continue
      await supabase.rpc('increment_stock', {
        p_product_id: item.id,
        p_qty: item.quantity,
      })
    }
    */

    return {
      success: true,
      pointsDeducted: order.points_earned ?? 0,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cancelOrderAction] error:', message)
    return { success: false, pointsDeducted: 0, error: message }
  }
}

// ============================================================
// ACTION 4: Manual Point Adjustment (Admin)
// ============================================================
export interface AdjustPointsInput {
  memberId: string
  delta: number    // positive = add, negative = deduct
  note: string
}

export async function adjustMemberPointsAction(
  input: AdjustPointsInput
): Promise<{ success: boolean; newPoints?: number; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: true, newPoints: Math.max(0, input.delta) }
  }

  const supabase = createServerSupabaseClient()

  try {
    // Fetch current points to prevent going negative
    const { data: member, error: fetchErr } = await supabase
      .from('members')
      .select('points')
      .eq('id', input.memberId)
      .single()

    if (fetchErr || !member) throw fetchErr ?? new Error('Member not found')

    const newPoints = Math.max(0, member.points + input.delta)

    const { error: updateErr } = await supabase
      .from('members')
      .update({ points: newPoints })
      .eq('id', input.memberId)

    if (updateErr) throw updateErr

    await supabase.from('point_transactions').insert({
      member_id: input.memberId,
      delta: input.delta,
      type: 'adjust',
      note: input.note,
    })

    return { success: true, newPoints }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
