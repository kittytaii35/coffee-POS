import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { opening_cash, user_id } = await req.json()
    const supabase = createServerSupabaseClient()

    // Check if there's already an active shift
    const { data: active } = await supabase
      .from('shifts')
      .select('id')
      .eq('status', 'active')
      .single()

    if (active) {
      return NextResponse.json({ error: 'There is already an active shift. Please close it first.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shifts')
      .insert({
        opening_cash,
        user_id,
        status: 'active'
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ shift: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to start shift' }, { status: 500 })
  }
}
