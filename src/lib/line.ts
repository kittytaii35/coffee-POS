/**
 * LINE Notify Utility for internal shop notifications
 */

export async function sendLineNotify(message: string, token: string) {
  if (!token) return { success: false, error: 'Token is required' }

  try {
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`
      },
      body: new URLSearchParams({
        message: message
      })
    })

    const data = await res.json()
    return { success: res.ok, data }
  } catch (error) {
    console.error('Error sending LINE Notify:', error)
    return { success: false, error }
  }
}

/**
 * LINE Messaging API utility for broadcast messages (Requires Channel Token)
 */
export async function sendLineBroadcast(text: string, token: string) {
  if (!token) return { success: false, error: 'Token is required' }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        messages: [{ type: 'text', text }]
      })
    })

    const data = await res.json()
    return { success: res.ok, data }
  } catch (error) {
    console.error('Error sending LINE Broadcast:', error)
    return { success: false, error }
  }
}

/**
 * LINE Messaging API utility for PUSH messages (To specific User ID)
 */
export async function sendLinePush(to: string, text: string, token: string) {
  if (!token || !to) return { success: false, error: 'Token and recipient (to) are required' }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }]
      })
    })

    const data = await res.json()
    return { success: res.ok, data }
  } catch (error) {
    console.error('Error sending LINE Push:', error)
    return { success: false, error }
  }
}

