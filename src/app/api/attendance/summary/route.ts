import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// GET /api/attendance/summary?employee_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id required' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        today: 0,
        weekly: 32.5,
        monthly: 128.0,
      })
    }

    const supabase = createServerSupabaseClient()
    const now = new Date()

    // Today range
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

    // Week range (Mon–Sun)
    const dayOfWeek  = now.getDay() === 0 ? 7 : now.getDay()
    const weekStart  = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek + 1)
    weekStart.setHours(0, 0, 0, 0)

    // Month range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [todayRes, weekRes, monthRes] = await Promise.all([
      supabase.from('attendance').select('work_hours').eq('employee_id', employeeId).gte('check_in', todayStart).lte('check_in', todayEnd),
      supabase.from('attendance').select('work_hours').eq('employee_id', employeeId).gte('check_in', weekStart.toISOString()),
      supabase.from('attendance').select('work_hours').eq('employee_id', employeeId).gte('check_in', monthStart),
    ])

    const sum = (rows: { work_hours: number | null }[]) =>
      rows.reduce((acc, r) => acc + (r.work_hours || 0), 0)

    return NextResponse.json({
      today: parseFloat(sum(todayRes.data || []).toFixed(2)),
      weekly: parseFloat(sum(weekRes.data || []).toFixed(2)),
      monthly: parseFloat(sum(monthRes.data || []).toFixed(2)),
    })
  } catch (err) {
    console.error('Summary error:', err)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
