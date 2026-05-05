import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ingredients: mockIngredients() })
  }
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const lowStock = searchParams.get('low_stock') === 'true'
    const category = searchParams.get('category')

    let query = supabase.from('ingredients').select('*').eq('active', true).order('name')
    if (lowStock) query = query.lte('stock_qty', supabase.rpc as any) // handled client-side
    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error

    const items = data || []
    const alerts = lowStock ? items.filter((i: any) => i.stock_qty <= i.low_stock_threshold) : items
    return NextResponse.json({ ingredients: lowStock ? alerts : items })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!isSupabaseConfigured) return NextResponse.json({ success: true, ingredient: { id: 'mock', ...body } })
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('ingredients').insert(body).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, ingredient: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function mockIngredients() {
  return [
    { id: '1', name: 'Coffee Beans (Arabica)', name_th: 'เมล็ดกาแฟอาราบิก้า', unit: 'g', stock_qty: 2500, low_stock_threshold: 500, cost_per_unit: 0.8, category: 'beans', active: true },
    { id: '2', name: 'Fresh Milk', name_th: 'นมสด', unit: 'ml', stock_qty: 8000, low_stock_threshold: 2000, cost_per_unit: 0.045, category: 'milk', active: true },
    { id: '3', name: 'Oat Milk', name_th: 'นมโอ๊ต', unit: 'ml', stock_qty: 400, low_stock_threshold: 500, cost_per_unit: 0.12, category: 'milk', active: true },
    { id: '4', name: 'Caramel Syrup', name_th: 'น้ำเชื่อมคาราเมล', unit: 'ml', stock_qty: 750, low_stock_threshold: 200, cost_per_unit: 0.09, category: 'syrup', active: true },
    { id: '5', name: 'Matcha Powder', name_th: 'ผงมัทฉะ', unit: 'g', stock_qty: 300, low_stock_threshold: 100, cost_per_unit: 1.2, category: 'other', active: true },
    { id: '6', name: 'Paper Cup 12oz', name_th: 'แก้วกระดาษ 12oz', unit: 'piece', stock_qty: 85, low_stock_threshold: 100, cost_per_unit: 3.5, category: 'cup', active: true },
  ]
}
