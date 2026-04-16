import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient, getGlobalSettings } from '@/lib/supabase'
import { sendLineNotify } from '@/lib/line'

// POST /api/checkin - with GPS + image support
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { employee_id, latitude, longitude, image_url } = body

    if (!employee_id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // ── Get Global Settings ────────────────────────────────────
    const settings = await getGlobalSettings()
    const SHOP_LAT = settings.attendance.shop_lat
    const SHOP_LNG = settings.attendance.shop_lng
    const ALLOWED_RADIUS_M = settings.attendance.allowed_radius_meters
    const LINE_ENABLED = settings.notifications.line_enabled
    const LINE_TOKEN = settings.notifications.line_token || process.env.LINE_CHANNEL_ACCESS_TOKEN

    // ── GPS distance validation ────────────────────────────────
    if (latitude !== undefined && longitude !== undefined) {
      const distM = haversineMeters(latitude, longitude, SHOP_LAT, SHOP_LNG)
      if (distM > ALLOWED_RADIUS_M) {
        return NextResponse.json({
          error: `คุณอยู่ห่างจากร้านประมาณ ${Math.round(distM)} ม. (ต้องอยู่ภายใน ${ALLOWED_RADIUS_M} ม.)`,
          distance: Math.round(distM),
        }, { status: 403 })
      }
    }

    const checkInData: Record<string, unknown> = {
      employee_id,
      check_in: new Date().toISOString(),
      status: 'working',
      latitude: latitude || null,
      longitude: longitude || null,
      image_url: image_url || null,
    }

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()

      // Check duplicate
      const { data: existing } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee_id)
        .eq('status', 'working')
        .gte('check_in', startOfDay)
        .lte('check_in', endOfDay)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'คุณลงเวลาเข้างานไปแล้ววันนี้', attendance: existing }, { status: 409 })
      }

      const { data: attendance, error } = await supabase
        .from('attendance')
        .insert(checkInData)
        .select('*, employees(name, role)')
        .single()

      if (error) throw error

      // LINE notification
      if (LINE_ENABLED && LINE_TOKEN) {
        await sendLineNotify(
          `✅ ${attendance.employees?.name} เข้างาน ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
          LINE_TOKEN
        )
      }

      return NextResponse.json({ success: true, attendance })
    } else {
      // Mock
      const attendance = {
        id: `att-${Math.random().toString(36).substr(2, 9)}`,
        ...checkInData,
        employees: { name: 'สมชาย ใจดี (Mock)', role: 'Barista' },
      }
      return NextResponse.json({ success: true, attendance })
    }
  } catch (error: unknown) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
  }
}

// ── Haversine distance ─────────────────────────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

