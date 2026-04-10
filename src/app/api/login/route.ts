import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// Memory storage for mock mode
const mockEmployees = [
  { id: 'emp-1', name: 'สมชาย ใจดี (Mock)', role: 'Barista', pin_code: '1234' },
  { id: 'emp-2', name: 'สมหญิง รักงาน (Mock)', role: 'Manager', pin_code: '5678' }
]

// POST /api/login - Employee PIN login
export async function POST(req: NextRequest) {
  try {
    const { pin_code } = await req.json()

    if (!pin_code || pin_code.length !== 4) {
      return NextResponse.json({ error: 'Invalid PIN code' }, { status: 400 })
    }

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data: employee, error } = await supabase
        .from('employees')
        .select('id, name, role, created_at')
        .eq('pin_code', pin_code)
        .maybeSingle()

      if (error) throw error
      if (!employee) return NextResponse.json({ error: 'Invalid PIN code' }, { status: 401 })

      // Get active attendance
      const today = new Date()
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employee.id)
        .gte('check_in', startOfDay)
        .order('check_in', { ascending: false })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({ success: true, employee, attendance: attendance || null })
    } else {
      // Mock flow
      const employee = mockEmployees.find(e => e.pin_code === pin_code)
      if (!employee) return NextResponse.json({ error: 'Mock PIN invalid (Try 1234)' }, { status: 401 })

      return NextResponse.json({
        success: true,
        employee: { id: employee.id, name: employee.name, role: employee.role },
        attendance: null // Reset for mock simplicity
      })
    }
  } catch (error: unknown) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
