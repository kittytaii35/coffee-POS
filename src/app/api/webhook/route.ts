import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import crypto from 'crypto'

// LINE Webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-line-signature') || ''

    // Verify signature
    const channelSecret = process.env.LINE_CHANNEL_SECRET!
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const parsed = JSON.parse(body)
    const events = parsed.events || []

    const supabase = createServerSupabaseClient()

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId
        const text = event.message.text.toLowerCase().trim()

        // Handle order status check
        if (text.startsWith('order ') || text.startsWith('#')) {
          const orderId = text.replace(/^(order\s+|#)/, '').toUpperCase()
          const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .ilike('id', `%${orderId}%`)
            .limit(1)

          if (orders && orders.length > 0) {
            const order = orders[0]
            const statusEmoji: Record<string, string> = {
              pending: '⏳',
              making: '👨‍🍳',
              done: '✅',
            }
            await sendReply(event.replyToken, {
              type: 'text',
              text: `${statusEmoji[order.status] || '📋'} Order #${order.id.slice(-8).toUpperCase()}\nStatus: ${order.status.toUpperCase()}\nTotal: ฿${order.total}`,
            })
          } else {
            await sendReply(event.replyToken, {
              type: 'text',
              text: 'Order not found. Please check your order number.',
            })
          }
        } else if (text === 'help') {
          await sendReply(event.replyToken, {
            type: 'text',
            text: '☕ Coffee Shop Bot\n\nCommands:\n• "order #XXXXXXXX" - Check order status\n• "help" - Show this message\n\nYou can also order via our LIFF app!',
          })
        } else {
          // Save LINE user ID association (for future notifications)
          await sendReply(event.replyToken, {
            type: 'text',
            text: '☕ Welcome to our Coffee Shop!\nType "help" for available commands or order via our app.',
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

async function sendReply(replyToken: string, message: object) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [message] }),
  })
}
