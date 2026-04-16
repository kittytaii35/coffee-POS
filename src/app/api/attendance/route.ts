import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

// GET /api/attendance - Get attendance records
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)

    const period = searchParams.get('period') || 'daily'
    const employeeId = searchParams.get('employee_id')
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

    let startDate: string
    let endDate: string
    const date = new Date(dateStr)

    if (period === 'daily') {
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
      endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString()
    } else if (period === 'weekly') {
      const dayOfWeek = date.getDay()
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - dayOfWeek)
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      startDate = startOfWeek.toISOString()
      endDate = endOfWeek.toISOString()
    } else {
      // monthly
      startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString()
    }

    let query = supabase
      .from('attendance')
      .select('*, employees(id, name, role)')
      .gte('check_in', startDate)
      .lte('check_in', endDate)
      .order('check_in', { ascending: false })

    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data: records, error } = await query

    if (error) throw error

    // Calculate summary per employee
    const nowTs = Date.now()
    const summary: Record<string, { name: string; role: string; totalHours: number; sessions: number }> = {}
    records?.forEach((r) => {
      const emp = r.employees as { id?: string; name: string; role: string } | null
      if (!emp) return
      const empId = r.employee_id
      if (!summary[empId]) {
        summary[empId] = { name: emp.name, role: emp.role, totalHours: 0, sessions: 0 }
      }
      
      let sessionHours = r.work_hours || 0
      // Calculate live hours if still working
      if (!r.check_out && r.check_in) {
        const start = new Date(r.check_in).getTime()
        sessionHours = Math.max(0, (nowTs - start) / (1000 * 60 * 60))
      }
      
      summary[empId].totalHours += sessionHours
      summary[empId].sessions += 1
    })

    return NextResponse.json({ records, summary })
  } catch (error: unknown) {
    console.error('Get attendance error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}
