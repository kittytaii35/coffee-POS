import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { items: itemIds, ...promoData } = body
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('promotions').update(promoData).eq('id', id).select().single()
    if (error) throw error

    if (promoData.applies_to === 'specific_items' && itemIds) {
      await supabase.from('promotion_items').delete().eq('promotion_id', id)
      if (itemIds.length > 0) {
        await supabase.from('promotion_items').insert(
          itemIds.map((mid: string) => ({ promotion_id: id, menu_item_id: mid }))
        )
      }
    }

    return NextResponse.json({ success: true, promotion: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isSupabaseConfigured) return NextResponse.json({ promotion: null })
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from('promotions').select('*, items:promotion_items(menu_item_id)').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ promotion: data })
}
