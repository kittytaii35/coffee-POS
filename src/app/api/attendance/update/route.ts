import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, check_in, check_out, status, note } = body

    if (!id) {
      return NextResponse.json({ error: 'Attendance ID is required' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true })
    }

    const supabase = createServerSupabaseClient()

    // 1. Fetch current record to calculate hours if needed
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // 2. Prepare updates
    const updates: any = {}
    if (check_in) updates.check_in = check_in
    if (check_out !== undefined) updates.check_out = check_out
    if (status) updates.status = status
    if (note) updates.force_checkout_note = note

    // 3. Calculate work hours if we have both in and out
    const finalIn = check_in || record.check_in
    const finalOut = check_out !== undefined ? check_out : record.check_out

    if (finalIn && finalOut) {
      const inMs = new Date(finalIn).getTime()
      const outMs = new Date(finalOut).getTime()
      if (outMs > inMs) {
        updates.work_hours = parseFloat(((outMs - inMs) / 3600000).toFixed(2))
      } else {
        updates.work_hours = 0
      }
    } else {
      updates.work_hours = null
    }

    // 4. Perform update
    const { data: updated, error: updateError } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      attendance: updated
    })
  } catch (error: any) {
    console.error('Update attendance error:', error)
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 })
  }
}
