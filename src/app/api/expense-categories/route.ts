import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ categories: [] })
  }
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('expense_categories').select('*').order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ categories: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, category: { id: Date.now().toString(), ...body } })
    }
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('expense_categories').insert(body).select('*').single()
    if (error) throw error
    return NextResponse.json({ success: true, category: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
