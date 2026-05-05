import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('ingredients').update(body).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ success: true, ingredient: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('ingredients').update({ active: false }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isSupabaseConfigured) return NextResponse.json({ movements: [] })
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('ingredient_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({ movements: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
