import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

// Memory storage for mock mode
let mockOrders: any[] = [
  {
    id: 'mock-1',
    customer_name: 'John Doe (Mock)',
    items: [{ name: 'Espresso', price: 55, quantity: 1 }],
    total: 55,
    status: 'pending',
    paid: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'mock-2',
    customer_name: 'Jane Smith (Mock)',
    items: [{ name: 'Caffè Latte', price: 75, quantity: 2 }],
    total: 150,
    status: 'making',
    paid: true,
    created_at: new Date().toISOString()
  }
]

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, line_user_id, items, total, payment_type } = body

    if (!customer_name || !items || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let order;

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name,
          line_user_id: line_user_id || null,
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

      // --- RECORD PAYMENT ---
      // If payment_type is provided, record it in the payments table
      if (payment_type) {
        await supabase
          .from('payments')
          .insert({
            order_id: order.id,
            payment_type: payment_type,
            amount: total
          })
      }
    } else {
      // Mock flow
      order = {
        id: `mock-${Math.random().toString(36).substr(2, 9)}`,
        customer_name,
        line_user_id,
        items,
        total,
        status: 'pending',
        payment_type,
        paid: false,
        created_at: new Date().toISOString()
      }
      mockOrders.unshift(order)
    }

    // Send LINE notices...

    return NextResponse.json({ success: true, order })
  } catch (error: unknown) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, paid, payment_type } = body
    if (!id) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })

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

      // If updating payment_type or marking as paid, ensure payment record exists
      if (payment_type || paid === true) {
        const pType = payment_type || data.payment_type || 'cash'
        // Upsert payment record
        await supabase
          .from('payments')
          .upsert({
            order_id: id,
            payment_type: pType,
            amount: data.total
          }, { onConflict: 'order_id' })
      }

      return NextResponse.json({ success: true, order: data })
    } else {
      const idx = mockOrders.findIndex(o => o.id === id)
      if (idx === -1) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      
      if (status) mockOrders[idx].status = status
      if (paid !== undefined) mockOrders[idx].paid = paid
      if (payment_type) mockOrders[idx].payment_type = payment_type

      return NextResponse.json({ success: true, order: mockOrders[idx] })
    }
  } catch (err) {
    console.error('Update order error:', err)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ orders: mockOrders })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const date = searchParams.get('date')

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    if (date) {
      const startOfDay = `${date}T00:00:00`
      const endOfDay = `${date}T23:59:59`
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    }

    const { data: orders, error } = await query.limit(100)

    if (error) throw error

    return NextResponse.json({ orders })
  } catch (error: unknown) {
    console.error('Get orders error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

async function sendLineNotification({
  message,
  broadcast,
}: {
  message: string
  broadcast?: boolean
}) {
  if (!broadcast) return
  await fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text: message }],
    }),
  })
}

async function sendLineMessageToUser(userId: string, message: string) {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: 'text', text: message }],
    }),
  })
}
