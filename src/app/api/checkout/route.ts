import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient, getGlobalSettings } from '@/lib/supabase'
import { sendLineNotify } from '@/lib/line'

// POST /api/checkout
export async function POST(req: NextRequest) {
  try {
    const { employee_id } = await req.json()
    if (!employee_id) return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })

    if (isSupabaseConfigured) {
      const settings = await getGlobalSettings()
      const LINE_ENABLED = settings.notifications.line_enabled
      const LINE_TOKEN = settings.notifications.line_token || process.env.LINE_CHANNEL_ACCESS_TOKEN
      const supabase = createServerSupabaseClient()

      const { data: active } = await supabase
        .from('attendance')
        .select('*, employees(name, role)')
        .eq('employee_id', employee_id)
        .eq('status', 'working')
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!active) {
        return NextResponse.json({ error: 'ไม่พบการลงเวลาเข้างานที่ active อยู่' }, { status: 404 })
      }

      const checkOut = new Date()
      const checkIn = new Date(active.check_in)
      const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)

      const { data: attendance, error } = await supabase
        .from('attendance')
        .update({
          check_out: checkOut.toISOString(),
          work_hours: parseFloat(workHours.toFixed(2)),
          status: 'done',
        })
        .eq('id', active.id)
        .select('*, employees(name, role)')
        .single()

      if (error) throw error

      // LINE notification
      if (LINE_ENABLED && LINE_TOKEN) {
        const name = active.employees?.name || 'Unknown'
        const hrs = workHours.toFixed(1)
        const timeStr = checkOut.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        await sendLineNotify(`👋 ${name} ออกงาน ${timeStr} น. (ทำงาน ${hrs} ชม.)`, LINE_TOKEN)
      }

      return NextResponse.json({ success: true, attendance, work_hours: workHours.toFixed(2) })
    } else {
      // Mock
      return NextResponse.json({
        success: true,
        attendance: {
          id: 'att-mock-id',
          employee_id,
          check_in: new Date(Date.now() - 28800000).toISOString(),
          check_out: new Date().toISOString(),
          work_hours: 8.0,
          status: 'done',
          employees: { name: 'สมชาย ใจดี (Mock)', role: 'Barista' },
        },
        work_hours: 8.0,
      })
    }
  } catch (error: unknown) {
    console.error('Check-out error:', error)
    return NextResponse.json({ error: 'Check-out failed' }, { status: 500 })
  }
}

