// ============================================================
// Queen Coffee – AI Analytics Engine
// ============================================================

export interface OrderItem {
  name: string
  name_th?: string
  price: number
  quantity: number
  sweetness?: string
  toppings?: string[]
}

export interface Order {
  id: string
  customer_name: string
  line_user_id?: string
  items: OrderItem[]
  total: number
  status: string
  payment_type?: string
  paid: boolean
  created_at: string
}

// ─── Types ───────────────────────────────────────────────────
export interface MenuPerformance {
  name: string
  sold: number
  revenue: number
  status: 'hot' | 'normal' | 'slow' | 'cold'
}

export interface HourlyBucket {
  hour: number
  orders: number
  revenue: number
  label: string
}

export interface Insight {
  type: 'success' | 'warning' | 'danger' | 'info'
  icon: string
  title: string
  body: string
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  icon: string
  action: string
  reason: string
  color: string
}

export interface AnalyticsResult {
  totalOrders: number
  totalRevenue: number
  paidRevenue: number
  avgOrderValue: number
  topItems: MenuPerformance[]
  lowItems: MenuPerformance[]
  allItems: MenuPerformance[]
  hourly: HourlyBucket[]
  peakHour: number | null
  slowHour: number | null
  paymentBreakdown: Record<string, { count: number; revenue: number }>
  repeatCustomers: number
  newCustomers: number
  insights: Insight[]
  recommendations: Recommendation[]
}

// ─── Helpers ─────────────────────────────────────────────────
function hourLabel(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:00 ${suffix}`
}

// ─── Main Analytics Function ──────────────────────────────────
export function analyzeOrders(orders: Order[]): AnalyticsResult {
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const paidRevenue = orders.filter(o => o.paid).reduce((s, o) => s + o.total, 0)
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  // ── Menu Performance ──────────────────────────────────────
  const itemMap: Record<string, { sold: number; revenue: number }> = {}
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.name
      if (!itemMap[key]) itemMap[key] = { sold: 0, revenue: 0 }
      itemMap[key].sold += item.quantity
      itemMap[key].revenue += item.price * item.quantity
    }
  }

  const sortedItems = Object.entries(itemMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.sold - a.sold)

  const maxSold = sortedItems[0]?.sold ?? 0

  const allItems: MenuPerformance[] = sortedItems.map(item => {
    let status: MenuPerformance['status'] = 'normal'
    if (item.sold >= maxSold * 0.6) status = 'hot'
    else if (item.sold <= 1) status = 'cold'
    else if (item.sold < maxSold * 0.2) status = 'slow'
    return { name: item.name, sold: item.sold, revenue: item.revenue, status }
  })

  const topItems = allItems.filter(i => i.status === 'hot').slice(0, 5)
  const lowItems = allItems.filter(i => i.status === 'cold' || i.status === 'slow')

  // ── Hourly Distribution ───────────────────────────────────
  const hourMap: Record<number, { orders: number; revenue: number }> = {}
  for (let h = 7; h <= 22; h++) hourMap[h] = { orders: 0, revenue: 0 }

  for (const order of orders) {
    const h = new Date(order.created_at).getHours()
    if (!hourMap[h]) hourMap[h] = { orders: 0, revenue: 0 }
    hourMap[h].orders++
    hourMap[h].revenue += order.total
  }

  const hourly: HourlyBucket[] = Object.entries(hourMap)
    .map(([h, data]) => ({ hour: +h, ...data, label: hourLabel(+h) }))
    .sort((a, b) => a.hour - b.hour)

  const peakBucket = hourly.reduce((best, h) => h.orders > best.orders ? h : best, hourly[0] ?? { hour: -1, orders: 0, revenue: 0, label: '' })
  const slowBucket = hourly.filter(h => h.orders > 0).reduce((w, h) => h.orders < w.orders ? h : w, peakBucket)

  const peakHour = peakBucket.orders > 0 ? peakBucket.hour : null
  const slowHour = slowBucket.orders < peakBucket.orders && slowBucket.hour !== peakBucket.hour ? slowBucket.hour : null

  // ── Payment Breakdown ─────────────────────────────────────
  const paymentBreakdown: Record<string, { count: number; revenue: number }> = {}
  for (const order of orders) {
    const pt = order.payment_type || 'unknown'
    if (!paymentBreakdown[pt]) paymentBreakdown[pt] = { count: 0, revenue: 0 }
    paymentBreakdown[pt].count++
    if (order.paid) paymentBreakdown[pt].revenue += order.total
  }

  // ── Customer Behavior ─────────────────────────────────────
  const customerCount: Record<string, number> = {}
  for (const order of orders) {
    const key = order.line_user_id || order.customer_name
    customerCount[key] = (customerCount[key] || 0) + 1
  }
  const repeatCustomers = Object.values(customerCount).filter(c => c > 1).length
  const newCustomers = Object.values(customerCount).filter(c => c === 1).length

  // ── Insights (Auto-generated) ─────────────────────────────
  const insights: Insight[] = []

  if (peakHour !== null) {
    insights.push({
      type: 'info',
      icon: '⏰',
      title: `ชั่วโมงยอดนิยม: ${hourLabel(peakHour)}`,
      body: `มีออเดอร์สูงสุดในช่วง ${hourLabel(peakHour)} (${peakBucket.orders} ออเดอร์)`
    })
  }

  if (topItems.length > 0) {
    insights.push({
      type: 'success',
      icon: '🔥',
      title: `เมนูขายดี: ${topItems[0].name}`,
      body: `ขายได้ ${topItems[0].sold} แก้ว รายได้ ฿${topItems[0].revenue} — เมนูที่ลูกค้าชื่นชอบที่สุด`
    })
  }

  if (lowItems.length > 0) {
    insights.push({
      type: 'warning',
      icon: '❄️',
      title: `เมนูช้า: ${lowItems[0].name}`,
      body: `ขายได้เพียง ${lowItems[0].sold} แก้ว ควรพิจารณาโปรโมชั่นหรือลดราคาชั่วคราว`
    })
  }

  const repeatPct = totalOrders > 0 ? Math.round((repeatCustomers / (repeatCustomers + newCustomers)) * 100) : 0
  if (repeatCustomers + newCustomers > 0) {
    insights.push({
      type: repeatPct >= 40 ? 'success' : 'info',
      icon: '👥',
      title: `ลูกค้าประจำ ${repeatPct}%`,
      body: `ลูกค้ากลับมาซื้อซ้ำ ${repeatCustomers} คน, ลูกค้าใหม่ ${newCustomers} คน`
    })
  }

  if (avgOrderValue > 0) {
    insights.push({
      type: avgOrderValue >= 80 ? 'success' : 'info',
      icon: '💰',
      title: `ค่าเฉลี่ยต่อออเดอร์: ฿${avgOrderValue}`,
      body: `รายได้รวม ฿${totalRevenue} จาก ${totalOrders} ออเดอร์`
    })
  }

  if (slowHour !== null) {
    insights.push({
      type: 'warning',
      icon: '📉',
      title: `ช่วงเวลาเงียบ: ${hourLabel(slowHour)}`,
      body: `ออเดอร์น้อยที่สุดในช่วง ${hourLabel(slowHour)} ลองจัดโปรโมชั่นช่วงนี้`
    })
  }

  // ── Recommendations (Rule-based AI) ───────────────────────
  const recommendations: Recommendation[] = []

  // Recommend promoting top items
  if (topItems.length > 0) {
    recommendations.push({
      priority: 'high',
      icon: '📢',
      action: `โปรโมต "${topItems[0].name}"`,
      reason: `ขายดีที่สุด ${topItems[0].sold} แก้ว — ดันยอดด้วย LINE/สื่อโซเชียล`,
      color: '#22c55e'
    })
  }

  // Discount slow items
  if (lowItems.length > 0) {
    recommendations.push({
      priority: 'high',
      icon: '🏷️',
      action: `ลดราคา "${lowItems[0].name}"`,
      reason: `ขายได้เพียง ${lowItems[0].sold} แก้ว ลองลด 10–15% เพื่อกระตุ้นยอด`,
      color: '#f59e0b'
    })
  }

  // Staff at peak hour
  if (peakHour !== null && peakBucket.orders >= 5) {
    recommendations.push({
      priority: 'high',
      icon: '👨‍🍳',
      action: `เพิ่มพนักงานช่วง ${hourLabel(peakHour)}`,
      reason: `ออเดอร์สูงสุด ${peakBucket.orders} ออเดอร์ในชั่วโมงนี้ — ระวังงานตกค้าง`,
      color: '#ef4444'
    })
  }

  // Happy hour at slow period
  if (slowHour !== null) {
    recommendations.push({
      priority: 'medium',
      icon: '🎉',
      action: `จัด Happy Hour ช่วง ${hourLabel(slowHour)}`,
      reason: `ช่วงเวลาที่เงียบที่สุด ลองดึงลูกค้าด้วยส่วนลด หรือ buy 1 get 1`,
      color: '#a78bfa'
    })
  }

  // Loyalty if repeat customers low
  if (repeatPct < 30 && totalOrders > 5) {
    recommendations.push({
      priority: 'medium',
      icon: '💎',
      action: 'สร้าง Loyalty Program',
      reason: `ลูกค้าประจำเพียง ${repeatPct}% — ลองทำ Stamp Card หรือสิทธิพิเศษสำหรับสมาชิก LINE`,
      color: '#06b6d4'
    })
  }

  // Upsell toppings
  if (avgOrderValue < 60) {
    recommendations.push({
      priority: 'low',
      icon: '🧋',
      action: 'แนะนำ Add-ons เพิ่มเติม',
      reason: `ค่าเฉลี่ยออเดอร์ ฿${avgOrderValue} ยังต่ำ ลองโปรโมต Topping หรือ Upsell ไซส์ใหญ่`,
      color: '#f97316'
    })
  }

  return {
    totalOrders,
    totalRevenue,
    paidRevenue,
    avgOrderValue,
    topItems,
    lowItems,
    allItems,
    hourly,
    peakHour,
    slowHour,
    paymentBreakdown,
    repeatCustomers,
    newCustomers,
    insights,
    recommendations,
  }
}
