import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// PATCH /api/kds/[orderId]/status — advance KDS status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const { kds_status } = await req.json()

    const validStatuses = ['queued', 'preparing', 'ready', 'served']
    if (!validStatuses.includes(kds_status)) {
      return NextResponse.json({ error: 'Invalid kds_status' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, kds_status })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('orders')
      .update({ kds_status })
      .eq('id', orderId)
      .select('id, order_id, kds_status, kds_started_at, kds_ready_at')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, order: data })
  } catch (err) {
    console.error('KDS PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update KDS status' }, { status: 500 })
  }
}
