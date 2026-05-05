import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// POST /api/attendance/force-checkout
// ให้ Manager กด check-out แทนพนักงานที่ลืมกดออก
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { attendance_id, check_out_time, note } = body

    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id is required' }, { status: 400 })
    }

    // Default check-out = now if not specified
    const checkOutAt = check_out_time
      ? new Date(check_out_time).toISOString()
      : new Date().toISOString()

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, work_hours: 8.0 })
    }

    const supabase = createServerSupabaseClient()

    // Fetch the attendance record
    const { data: record, error: fetchError } = await supabase
      .from('attendance')
      .select('*, employees(name)')
      .eq('id', attendance_id)
      .single()

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    if (record.status !== 'working') {
      return NextResponse.json({ error: 'พนักงานคนนี้ไม่ได้อยู่ในสถานะ "กำลังทำงาน"' }, { status: 400 })
    }

    // Calculate work hours
    const checkInMs = new Date(record.check_in).getTime()
    const checkOutMs = new Date(checkOutAt).getTime()

    if (checkOutMs <= checkInMs) {
      return NextResponse.json({ error: 'เวลาออกงานต้องหลังจากเวลาเข้างาน' }, { status: 400 })
    }

    const workHours = parseFloat(((checkOutMs - checkInMs) / 3600000).toFixed(2))

    // Update the record
    const { data: updated, error: updateError } = await supabase
      .from('attendance')
      .update({
        check_out: checkOutAt,
        work_hours: workHours,
        status: 'done',
        force_checkout_note: note || 'Manager force checkout',
      })
      .eq('id', attendance_id)
      .select('*, employees(name)')
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      attendance: updated,
      work_hours: workHours,
      employee_name: record.employees?.name,
    })
  } catch (error: unknown) {
    console.error('Force checkout error:', error)
    return NextResponse.json({ error: 'Force checkout failed' }, { status: 500 })
  }
}
