import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/kds — active orders for kitchen (queued + preparing + ready)
export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      const now = new Date()
      return NextResponse.json({
        orders: [
          {
            id: 'mock-1', order_id: 'QCF-0001', customer_name: 'คุณแจน',
            items: [{ name: 'Matcha Latte', quantity: 1, modifiers: [{ name: 'Sweetness', value: '50%', price_delta: 0 }] }],
            kds_status: 'queued', priority: 0,
            created_at: new Date(now.getTime() - 3 * 60000).toISOString(),
            total: 55,
          },
          {
            id: 'mock-2', order_id: 'QCF-0002', customer_name: 'คุณต้น',
            items: [{ name: 'Americano', quantity: 2 }, { name: 'Croissant', quantity: 1 }],
            kds_status: 'preparing', priority: 1,
            created_at: new Date(now.getTime() - 8 * 60000).toISOString(),
            kds_started_at: new Date(now.getTime() - 5 * 60000).toISOString(),
            total: 130,
          },
          {
            id: 'mock-3', order_id: 'QCF-0003', customer_name: 'Self Order',
            items: [{ name: 'Latte', quantity: 1 }],
            kds_status: 'ready', priority: 0,
            created_at: new Date(now.getTime() - 12 * 60000).toISOString(),
            kds_started_at: new Date(now.getTime() - 10 * 60000).toISOString(),
            kds_ready_at: new Date(now.getTime() - 2 * 60000).toISOString(),
            total: 60,
          },
        ]
      })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const includeServed = searchParams.get('include_served') === 'true'

    let query = supabase
      .from('orders')
      .select('id, order_id, customer_name, items, total, status, kds_status, kds_started_at, kds_ready_at, priority, created_at, member_id')
      .in('kds_status', includeServed
        ? ['queued', 'preparing', 'ready', 'served']
        : ['queued', 'preparing', 'ready'])
      .neq('status', 'cancelled')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    const { data: orders, error } = await query
    if (error) throw error

    return NextResponse.json({ orders: orders || [] })
  } catch (err) {
    console.error('KDS GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch KDS orders' }, { status: 500 })
  }
}
