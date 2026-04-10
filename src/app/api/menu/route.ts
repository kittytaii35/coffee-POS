import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const [catsRes, prodsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*, categories(label, label_th)')
    ])

    if (catsRes.error) throw catsRes.error
    if (prodsRes.error) throw prodsRes.error

    return NextResponse.json({
      categories: catsRes.data,
      products: prodsRes.data
    })
  } catch (err) {
    console.error('Menu GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await req.json()
    const { action, table, data } = body

    if (!table || !data) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })

    if (action === 'upsert') {
      const onConflict = table === 'categories' ? 'id' : (table === 'products' ? 'product_id' : 'id')
      const { error } = await supabase
        .from(table)
        .upsert(data, { onConflict })
      if (error) throw error
    } else if (action === 'delete') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', data.id)
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Menu POST error:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
