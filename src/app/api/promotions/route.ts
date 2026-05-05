import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ promotions: mockPromotions() })
  }
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('promotions')
      .select('*, items:promotion_items(menu_item_id)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ promotions: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items: itemIds, ...promoData } = body
    if (!isSupabaseConfigured) return NextResponse.json({ success: true, promotion: { id: 'mock', ...promoData } })

    const supabase = createServerSupabaseClient()
    const { data: promo, error } = await supabase.from('promotions').insert(promoData).select().single()
    if (error) throw error

    // Link specific items if needed
    if (itemIds?.length && promo) {
      await supabase.from('promotion_items').insert(
        itemIds.map((mid: string) => ({ promotion_id: promo.id, menu_item_id: mid }))
      )
    }

    return NextResponse.json({ success: true, promotion: promo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function mockPromotions() {
  return [
    { id: '1', name: 'Happy Hour Morning', name_th: 'แฮปปี้ อาวร์ เช้า', type: 'happy_hour', value: 15, applies_to: 'all', happy_hour_start: '08:00', happy_hour_end: '10:00', happy_hour_days: [1,2,3,4,5], active: true, usage_count: 45, start_date: null, end_date: null, min_order_amount: 0 },
    { id: '2', name: 'Buy 2 Get 1 Free Coffee', name_th: 'ซื้อ 2 แถม 1', type: 'bogo', value: 0, applies_to: 'category', target_category: 'coffee', bogo_buy_qty: 2, bogo_get_qty: 1, active: true, usage_count: 12, usage_limit: 50, min_order_amount: 100 },
    { id: '3', name: 'Weekend Special', name_th: 'ส่วนลดวันหยุด', type: 'percentage', value: 10, applies_to: 'all', active: false, usage_count: 89, min_order_amount: 150 },
  ]
}
