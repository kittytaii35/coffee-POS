import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient, getGlobalSettings } from '@/lib/supabase'
import { sendLineNotify, sendLinePush } from '@/lib/line'

// ── Memory storage for mock mode ──────────────────────────────
let mockOrders: any[] = [
  {
    id: 'mock-1',
    customer_name: 'John Doe (Mock)',
    items: [{ name: 'Espresso', price: 55, quantity: 1 }],
    total: 55,
    status: 'pending',
    paid: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-2',
    customer_name: 'Jane Smith (Mock)',
    items: [{ name: 'Caffè Latte', price: 75, quantity: 2 }],
    total: 150,
    status: 'making',
    paid: true,
    created_at: new Date().toISOString(),
  },
]

// ── LINE Notification Helper ──────────────────────────────────
async function sendNotification(text: string) {
  try {
    const settings = await getGlobalSettings()
    if (settings.notifications.line_enabled && settings.notifications.line_token) {
      await sendLineNotify(text, settings.notifications.line_token)
    }
  } catch { /* silent – LINE is optional */ }
}


// ── POST — Create Order ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, line_user_id, items, total, payment_type } = body

    if (!customer_name || !items || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let order: any
    const supabase = createServerSupabaseClient()

    // Generate human-readable order_id
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const countRes = await supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0])
    const count = (countRes.count || 0) + 1
    const readableOrderId = `QCF-${dateStr}-${String(count).padStart(4, '0')}`

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          order_id: readableOrderId,
          customer_name,
          customer_line_id: line_user_id || null, // existing line_user_id mapping
          items,
          total,
          status: 'pending',
          payment_type: payment_type || null,
          paid: false,
        })
        .select()
        .single()

      if (error) throw error
      order = data

      // Record payment if provided
      if (payment_type) {
        await supabase.from('payments').insert({
          order_id: order.id,
          payment_type,
          amount: total,
        })
      }
    } else {
      // Mock flow
      order = {
        id: `mock-${Math.random().toString(36).substr(2, 9)}`,
        order_id: readableOrderId,
        customer_name,
        customer_line_id: line_user_id,
        items,
        total,
        status: 'pending',
        payment_type,
        paid: false,
        created_at: new Date().toISOString(),
      }
      mockOrders.unshift(order)
    }

    // ── LINE: แจ้งเตือนร้าน (Notify) ───────────────────────────
    const orderIdShort = order.order_id || order.id.slice(-8).toUpperCase()
    const itemLines = (items as any[])
      .map((i: any) => `  • ${i.name} x${i.quantity}${i.sweetness ? ` (หวาน ${i.sweetness}%)` : ''}`)
      .join('\n')
    
    // Notify Shop (Group/Admin)
    const shopMsg = `🛎️ ออเดอร์ใหม่ ${orderIdShort}\n👤 ${customer_name}\n\n${itemLines}\n\n💰 รวม ฿${total}`
    await sendNotification(shopMsg)

    // ── LINE: แจ้งออเดอร์ให้ลูกค้า (Push Message via OA) ─────────
    const settings = await getGlobalSettings()
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    
    if (line_user_id && channelToken) {
       const customerMsg = `☕ รับออเดอร์เรียบร้อยแล้ว!\n\nออเดอร์เลขที่: ${orderIdShort}\nยอดรวม: ฿${total}\n\nติดตามสถานะออเดอร์ได้ที่:\n${process.env.NEXT_PUBLIC_APP_URL}/track/${order.id}`
       await sendLinePush(line_user_id, customerMsg, channelToken)
    }


    return NextResponse.json({ success: true, order })
  } catch (error: unknown) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

// ── PATCH — Update Order Status / Payment ─────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, paid, payment_type } = body
    if (!id) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

    let updatedOrder: any

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()

      const updateData: any = {}
      if (status) updateData.status = status
      if (paid !== undefined) updateData.paid = paid
      if (payment_type) updateData.payment_type = payment_type

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Upsert payment record when paying
      if (payment_type || paid === true) {
        const pType = payment_type || data.payment_type || 'cash'
        await supabase
          .from('payments')
          .upsert({ order_id: id, payment_type: pType, amount: data.total }, { onConflict: 'order_id' })
      }

      updatedOrder = data
    } else {
      const idx = mockOrders.findIndex((o) => o.id === id)
      if (idx === -1) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

      if (status) mockOrders[idx].status = status
      if (paid !== undefined) mockOrders[idx].paid = paid
      if (payment_type) mockOrders[idx].payment_type = payment_type

      updatedOrder = mockOrders[idx]
    }

    // ── LINE: แจ้งเปลี่ยนสถานะ ─────────────────────────────
    if (status === 'preparing' || status === 'ready') {
      const orderIdShort = (updatedOrder?.order_id || updatedOrder?.id || id).slice(-8).toUpperCase()
      const customerName = updatedOrder?.customer_name || ''
      const statusLabel: Record<string, string> = {
        preparing: '👨‍🍳 กำลังทำ',
        ready: '✅ พร้อมรับแล้ว!',
      }
      const msg = `${statusLabel[status]}\nออเดอร์ ${orderIdShort}${customerName ? ` · ${customerName}` : ''}`
      await sendNotification(msg)

      // Notify Customer via Push (if LINE ID exists)
      const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
      const customerLineId = updatedOrder?.customer_line_id
      if (customerLineId && channelToken) {
         let customerStatusMsg = ''
         if (status === 'preparing') customerStatusMsg = `☕ ออเดอร์ ${orderIdShort} ของคุณกำลังเริ่มปรุงแล้วค่ะ`
         if (status === 'ready') customerStatusMsg = `✅ ออเดอร์ ${orderIdShort} เสร็จเรียบร้อยแล้วค่ะ! เชิญมารับได้ที่เคาน์เตอร์นะคะ`
         
         if (customerStatusMsg) {
            await sendLinePush(customerLineId, customerStatusMsg, channelToken)
         }
      }
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (err) {
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// ── GET — Fetch Orders ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ orders: mockOrders })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    if (date) {
      query = query
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
    }

    const { data: orders, error } = await query.limit(100)
    if (error) throw error

    return NextResponse.json({ orders })
  } catch (error: unknown) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
