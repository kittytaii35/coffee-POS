import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('shifts')
      .select('*, employees(name)')
      .eq('status', 'active')
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('Falling back to mock shift current due to error:', error.message)
      return NextResponse.json({ current: null })
    }
    return NextResponse.json({ current: data || null })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch current shift' }, { status: 500 })
  }
}
