import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getGlobalSettings } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const settings = await getGlobalSettings()
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  try {
    const { key, value } = await req.json()
    if (!key || !value) return NextResponse.json({ error: 'Missing setting key or value' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Settings UPDATE error:', err)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
