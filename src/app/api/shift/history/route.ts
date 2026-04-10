import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('shifts')
      .select('*, employees(name)')
      .order('start_time', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('Falling back to mock shift history due to error:', error.message)
      return NextResponse.json({ history: [] })
    }
    return NextResponse.json({ history: data })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch shift history' }, { status: 500 })
  }
}
