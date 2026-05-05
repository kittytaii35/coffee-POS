import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/profit?period=month|week|today
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 6)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    const startStr = startDate.toISOString().split('T')[0]
    const endStr   = now.toISOString().split('T')[0]

    if (!isSupabaseConfigured) {
      return NextResponse.json(getMockProfit(period))
    }

    const supabase = createServerSupabaseClient()

    const [
      { data: orders },
      { data: expenses },
      { data: stockOut },
      { data: daily }
    ] = await Promise.all([
      // Revenue from completed orders
      supabase
        .from('orders')
        .select('total, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', now.toISOString()),

      // Expenses in period
      supabase
        .from('expenses')
        .select('amount, expense_date, category:expense_categories(name, name_th, icon, color)')
        .gte('expense_date', startStr)
        .lte('expense_date', endStr),

      // COGS from stock_movements (order_deduct type)
      supabase
        .from('stock_movements')
        .select('qty_change, cost_per_unit')
        .eq('movement_type', 'out')
        .eq('reason', 'order_deduct')
        .gte('created_at', startDate.toISOString()),

      // Daily breakdown from v_daily_profit view
      supabase
        .from('v_daily_profit')
        .select('*')
        .gte('report_date', startStr)
        .lte('report_date', endStr)
        .order('report_date', { ascending: true })
    ])

    const revenue  = orders?.reduce((s, o) => s + Number(o.total), 0) ?? 0
    const cogs     = stockOut?.reduce((s, m) => s + (Math.abs(m.qty_change) * (m.cost_per_unit || 0)), 0) ?? 0
    const totalExp = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
    const grossProfit = revenue - cogs
    const netProfit   = grossProfit - totalExp
    const marginPct   = revenue > 0 ? (netProfit / revenue) * 100 : 0

    // Expenses by category
    const byCategory: Record<string, { name: string; name_th: string; icon: string; color: string; total: number }> = {}
    expenses?.forEach(e => {
      const cat = (e.category as any)
      if (!cat) return
      if (!byCategory[cat.name]) byCategory[cat.name] = { ...cat, total: 0 }
      byCategory[cat.name].total += Number(e.amount)
    })

    return NextResponse.json({
      period, revenue, cogs, gross_profit: grossProfit,
      expenses: totalExp, net_profit: netProfit, margin_pct: marginPct,
      daily_data: daily || [],
      expenses_by_category: Object.values(byCategory),
    })
  } catch (err) {
    console.error('Profit API error:', err)
    return NextResponse.json({ error: 'Failed to calculate profit' }, { status: 500 })
  }
}

function getMockProfit(period: string) {
  const revenue = period === 'today' ? 3240 : period === 'week' ? 22680 : 89500
  const cogs    = revenue * 0.30
  const expenses = period === 'today' ? 400 : period === 'week' ? 2800 : 12500
  const netProfit = revenue - cogs - expenses
  return {
    period, revenue, cogs,
    gross_profit: revenue - cogs, expenses,
    net_profit: netProfit,
    margin_pct: (netProfit / revenue) * 100,
    daily_data: Array.from({ length: 7 }, (_, i) => ({
      report_date: new Date(Date.now() - (6-i)*86400000).toISOString().split('T')[0],
      revenue: 2000 + Math.random() * 3000,
      expenses: 400 + Math.random() * 600,
      net_profit: 1200 + Math.random() * 1500,
      order_count: 20 + Math.floor(Math.random() * 30),
    })),
    expenses_by_category: [
      { name: 'Rent', name_th: 'ค่าเช่า', icon: '🏠', color: '#ef4444', total: 8000 },
      { name: 'Utilities', name_th: 'ค่าน้ำ/ไฟ', icon: '⚡', color: '#f59e0b', total: 2500 },
      { name: 'Materials', name_th: 'วัตถุดิบ', icon: '🛒', color: '#22c55e', total: 2000 },
    ],
  }
}
