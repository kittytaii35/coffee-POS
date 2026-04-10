import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { actual_cash } = await req.json()
    const supabase = createServerSupabaseClient()

    // 1. Get active shift
    const { data: shift, error: shiftErr } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'active')
      .single()

    if (shiftErr || !shift) {
      return NextResponse.json({ error: 'No active shift found.' }, { status: 400 })
    }

    // 2. Compute expected cash ( opening_cash + sum of cash sales since start_time )
    const end_time = new Date().toISOString()
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('total, payment_type')
      .gte('created_at', shift.start_time)
      .eq('status', 'done')
      // .lte('created_at', end_time)  // implicitly bounded by now

    if (ordersErr) throw ordersErr

    const cashSales = orders
      .filter(o => o.payment_type === 'cash')
      .reduce((sum, o) => sum + (o.total || 0), 0)

    const expected_cash = shift.opening_cash + cashSales
    const difference = actual_cash - expected_cash

    // 3. Update shift to closed
    const { data: closedShift, error: updateErr } = await supabase
      .from('shifts')
      .update({
        closing_cash: actual_cash,
        expected_cash,
        difference,
        end_time,
        status: 'closed'
      })
      .eq('id', shift.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ shift: closedShift })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to end shift' }, { status: 500 })
  }
}
