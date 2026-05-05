import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// POST /api/stock/stock-in — receive stock from supplier
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ingredient_id, qty, cost_per_unit, reason = 'stock_in', employee_id } = body

    if (!ingredient_id || !qty || qty <= 0) {
      return NextResponse.json({ error: 'ingredient_id และ qty (> 0) จำเป็น' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, new_stock: qty })
    }

    const supabase = createServerSupabaseClient()

    // Get current stock
    const { data: ingredient, error: fetchErr } = await supabase
      .from('ingredients')
      .select('stock_qty, name')
      .eq('id', ingredient_id)
      .single()

    if (fetchErr || !ingredient) {
      return NextResponse.json({ error: 'ไม่พบวัตถุดิบ' }, { status: 404 })
    }

    const qtyBefore = ingredient.stock_qty
    const qtyAfter  = qtyBefore + qty

    // Update stock
    const { error: updateErr } = await supabase
      .from('ingredients')
      .update({ stock_qty: qtyAfter })
      .eq('id', ingredient_id)

    if (updateErr) throw updateErr

    // Log movement
    await supabase.from('stock_movements').insert({
      ingredient_id,
      movement_type: 'in',
      qty_change: qty,
      qty_before: qtyBefore,
      qty_after: qtyAfter,
      reason,
      cost_per_unit: cost_per_unit || null,
      employee_id: employee_id || null,
    })

    return NextResponse.json({ success: true, ingredient_name: ingredient.name, qty_before: qtyBefore, qty_after: qtyAfter })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
