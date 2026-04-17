import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// Memory storage for mock mode
let mockMembers: any[] = [
  { id: 'mem-1', name: 'John Guest', phone: '0812345678', points: 120, total_spent: 850, created_at: new Date().toISOString() }
]

export async function GET(req: NextRequest) {
  try {
    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ members: data })
    }
    return NextResponse.json({ members: mockMembers })
  } catch (error: unknown) {
    console.error('GET members error:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, line_id, points } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('members')
        .insert({ name, phone, line_id, points: points || 0, total_spent: 0 })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, member: data })
    }

    const newMember = {
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      name, phone, line_id,
      points: points || 0,
      total_spent: 0,
      created_at: new Date().toISOString()
    }
    mockMembers.unshift(newMember)
    return NextResponse.json({ success: true, member: newMember })
  } catch (error: unknown) {
    console.error('POST members error:', error)
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}
