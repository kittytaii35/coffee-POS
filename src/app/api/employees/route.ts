import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// Mock data for when Supabase is not configured
let mockEmployees = [
  { id: 'emp-1', name: 'สมชาย ใจดี', role: 'Barista', pin_code: '1234', created_at: new Date().toISOString() },
  { id: 'emp-2', name: 'สมหญิง รักงาน', role: 'Manager', pin_code: '5678', created_at: new Date().toISOString() },
]

// GET /api/employees — list all employees
export async function GET() {
  try {
    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, pin_code, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return NextResponse.json({ employees: data })
    }
    return NextResponse.json({ employees: mockEmployees })
  } catch (err) {
    console.error('GET employees error:', err)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

// POST /api/employees — create a new employee
export async function POST(req: NextRequest) {
  try {
    const { name, role, pin_code } = await req.json()
    if (!name || !role || !pin_code) {
      return NextResponse.json({ error: 'name, role and pin_code are required' }, { status: 400 })
    }
    if (pin_code.length !== 4 || !/^\d{4}$/.test(pin_code)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()

      // Check PIN collision
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('pin_code', pin_code)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'PIN code already in use by another employee' }, { status: 409 })
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({ name, role, pin_code })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, employee: data })
    }

    // Mock
    if (mockEmployees.some(e => e.pin_code === pin_code)) {
      return NextResponse.json({ error: 'PIN code already in use by another employee' }, { status: 409 })
    }
    const employee = {
      id: `emp-${Math.random().toString(36).substr(2, 9)}`,
      name, role, pin_code,
      created_at: new Date().toISOString(),
    }
    mockEmployees.push(employee)
    return NextResponse.json({ success: true, employee })
  } catch (err) {
    console.error('POST employee error:', err)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

// PATCH /api/employees — update employee
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, role, pin_code } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    if (pin_code && (pin_code.length !== 4 || !/^\d{4}$/.test(pin_code))) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()

      // Check PIN collision (excluding self)
      if (pin_code) {
        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('pin_code', pin_code)
          .neq('id', id)
          .maybeSingle()
        if (existing) {
          return NextResponse.json({ error: 'PIN code already in use by another employee' }, { status: 409 })
        }
      }

      const updates: any = {}
      if (name) updates.name = name
      if (role) updates.role = role
      if (pin_code) updates.pin_code = pin_code

      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, employee: data })
    }

    // Mock
    const idx = mockEmployees.findIndex(e => e.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    if (pin_code && mockEmployees.some((e, i) => e.pin_code === pin_code && i !== idx)) {
      return NextResponse.json({ error: 'PIN code already in use' }, { status: 409 })
    }
    if (name) mockEmployees[idx].name = name
    if (role) mockEmployees[idx].role = role
    if (pin_code) mockEmployees[idx].pin_code = pin_code
    return NextResponse.json({ success: true, employee: mockEmployees[idx] })
  } catch (err) {
    console.error('PATCH employee error:', err)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

// DELETE /api/employees?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Mock
    const before = mockEmployees.length
    mockEmployees = mockEmployees.filter(e => e.id !== id)
    if (mockEmployees.length === before) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE employee error:', err)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
