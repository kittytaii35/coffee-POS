import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, createServerSupabaseClient } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status, payment_type, paid } = await req.json()

    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (payment_type) updateData.payment_type = payment_type
      if (paid !== undefined) updateData.paid = paid

      const { data: order, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      if (status === 'done' && order.line_user_id) {
        await sendLineMessageToUser(order.line_user_id, `☕ Your order is ready!`)
      }
      return NextResponse.json({ success: true, order })
    } else {
      // Mock flow
      return NextResponse.json({
        success: true,
        order: { id, status, payment_type, paid, updated_at: new Date() }
      })
    }
  } catch (error: unknown) {
    console.error('Update order error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (isSupabaseConfigured) {
      const supabase = createServerSupabaseClient()
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', id).single()
      if (error) throw error
      return NextResponse.json({ order })
    } else {
      // Mock flow
      return NextResponse.json({
        order: { id, customer_name: 'Mock Customer', total: 100, status: 'pending' }
      })
    }
  } catch (error: unknown) {
    console.error('Get order error:', error)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
}

async function sendLineMessageToUser(userId: string, message: string) {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) return
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
