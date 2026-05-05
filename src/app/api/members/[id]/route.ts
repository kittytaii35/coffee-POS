import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, phone, points, line_id } = body

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()

      const updatePayload: Record<string, unknown> = {}
      if (name !== undefined) updatePayload.name = name
      if (phone !== undefined) updatePayload.phone = phone
      if (points !== undefined) updatePayload.points = Math.max(0, Number(points))
      if (line_id !== undefined) updatePayload.line_id = line_id || null

      const { data, error } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, member: data })
    }

    // Mock mode
    return NextResponse.json({ success: true, member: { id, ...body } })
  } catch (error: unknown) {
    console.error('PUT member error:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('members')
        .select('*, point_transactions(*)')
        .eq('id', id)
        .single()

      if (error) throw error
      return NextResponse.json({ member: data })
    }

    return NextResponse.json({ member: { id, name: 'Mock Member', phone: '0800000000', points: 0, total_spent: 0 } })
  } catch (error: unknown) {
    console.error('GET member error:', error)
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.from('members').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('DELETE member error:', error)
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
