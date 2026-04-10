import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// GET /api/attendance/history?employee_id=xxx&limit=30
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const limit = parseInt(searchParams.get('limit') || '30')

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id required' }, { status: 400 })
    }

    if (!isSupabaseConfigured) {
      // Mock history
      const now = new Date()
      const mock = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        d.setHours(8, 30 + Math.floor(Math.random() * 30), 0, 0)
        const checkIn = d.toISOString()
        const checkOut = new Date(d.getTime() + (8 + Math.random()) * 3600000).toISOString()
        const workHours = parseFloat(((new Date(checkOut).getTime() - d.getTime()) / 3600000).toFixed(2))
        return {
          id: `mock-${i}`,
          employee_id: employeeId,
          check_in: checkIn,
          check_out: checkOut,
          work_hours: workHours,
          status: 'done',
          latitude: null,
          longitude: null,
          image_url: null,
        }
      })
      return NextResponse.json({ history: mock })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('check_in', { ascending: false })
      .limit(limit)

    if (error) throw error
    return NextResponse.json({ history: data || [] })
  } catch (err) {
    console.error('History error:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
