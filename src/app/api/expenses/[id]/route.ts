import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('expenses').update(body).eq('id', id).select('*, category:expense_categories(*)').single()
    if (error) throw error
    return NextResponse.json({ success: true, expense: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!isSupabaseConfigured) return NextResponse.json({ success: true })
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
