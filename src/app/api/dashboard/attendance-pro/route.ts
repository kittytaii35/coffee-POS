import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({
        summary: { totalStaffToday: 2, workingNow: 1, totalHoursToday: 8.5, lateCount: 1 },
        liveStaff: [{
          id: 'mock-1', employee_id: 'emp-1', check_in: new Date(Date.now() - 3600000).toISOString(),
          status: 'working', employees: { id: 'emp-1', name: 'สมชาย ใจดี', role: 'Barista' }
        }],
        alerts: [
          { type: 'danger', message: 'สมชาย ลืมลงเวลาออกเมื่อวาน', id: '1' },
          { type: 'warning', message: 'นารี เข้างานสาย (09:45 น.)', id: '2' }
        ],
        history: []
      })
    }

    const supabase = createServerSupabaseClient()
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Fetch this month's data to calculate robust charts and tables
    const { data: records, error } = await supabase
      .from('attendance')
      .select('*, employees(id, name, role)')
      .gte('check_in', monthStart)
      .order('check_in', { ascending: false })

    if (error) throw error

    // Process
    const liveStaff = records?.filter(r => r.status === 'working') || []
    const todayRecords = records?.filter(r => r.check_in >= todayStart) || []
    
    // Summary computations
    const totalStaffToday = new Set(todayRecords.map(r => r.employee_id)).size
    const workingNow = liveStaff.length
    const totalHoursToday = parseFloat(todayRecords.reduce((acc, r) => acc + (r.work_hours || 0), 0).toFixed(2))

    // Late detection (after 09:15 AM)
    const lateArrivals = todayRecords.filter(r => {
      const d = new Date(r.check_in)
      return (d.getHours() * 60 + d.getMinutes()) > (9 * 60 + 15)
    })

    // Alerts
    const alerts: { type: string, message: string, id: string }[] = []
    
    const missingCheckouts = liveStaff.filter(r => r.check_in < todayStart)
    missingCheckouts.forEach(m => {
      alerts.push({ type: 'danger', message: `${m.employees?.name} ลืมลงเวลาออกเมื่อวาน! (ระบบยังขึ้นว่ากำลังทำงาน)`, id: `missing-${m.id}` })
    })

    lateArrivals.forEach(l => {
      alerts.push({ type: 'warning', message: `${l.employees?.name} เข้างานสาย (${new Date(l.check_in).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`, id: `late-${l.id}` })
    })

    if (workingNow === 0 && todayRecords.length > 0) {
      alerts.push({ type: 'info', message: 'ตอนนี้ไม่มีพนักงานอยู่ที่ร้าน', id: 'empty' })
    }

    return NextResponse.json({
      summary: {
        totalStaffToday,
        workingNow,
        totalHoursToday,
        lateCount: lateArrivals.length
      },
      liveStaff,
      alerts,
      history: records || []
    })

  } catch (err) {
    console.error('API Error:', err)
    return NextResponse.json({ error: 'Failed to fetch PRO Dashboard data' }, { status: 500 })
  }
}
