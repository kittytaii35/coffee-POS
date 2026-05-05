import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/expenses
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ expenses: mockExpenses(), total: 12500 })
  }
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const endDate   = searchParams.get('end')   || new Date().toISOString().split('T')[0]
    const categoryId = searchParams.get('category_id')

    let query = supabase
      .from('expenses')
      .select('*, category:expense_categories(id,name,name_th,icon,color)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query
    if (error) throw error

    const total = data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
    return NextResponse.json({ expenses: data || [], total })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!isSupabaseConfigured) return NextResponse.json({ success: true, expense: { id: 'mock', ...body } })
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.from('expenses').insert(body).select('*, category:expense_categories(*)').single()
    if (error) throw error
    return NextResponse.json({ success: true, expense: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function mockExpenses() {
  return [
    { id: '1', category: { name: 'Rent', name_th: 'ค่าเช่า', icon: '🏠', color: '#ef4444' }, amount: 8000, description: 'ค่าเช่าร้านเดือน พ.ค.', expense_date: '2026-05-01', payment_method: 'transfer' },
    { id: '2', category: { name: 'Utilities', name_th: 'ค่าน้ำ/ไฟ', icon: '⚡', color: '#f59e0b' }, amount: 2500, description: 'ค่าไฟ', expense_date: '2026-05-03', payment_method: 'cash' },
    { id: '3', category: { name: 'Materials', name_th: 'วัตถุดิบ', icon: '🛒', color: '#22c55e' }, amount: 2000, description: 'ซื้อกาแฟ + นม', expense_date: '2026-05-04', payment_method: 'cash' },
  ]
}
