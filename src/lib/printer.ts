// ESC/POS receipt generator
// Returns raw bytes that can be sent to a Bluetooth printer via Web Bluetooth API

export interface ReceiptData {
  shopName: string
  orderId: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  paymentType: string
  timestamp: string
}

// ESC/POS commands
const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a
const CR = 0x0d

const COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  FONT_DOUBLE: [GS, 0x21, 0x11],
  FONT_NORMAL: [GS, 0x21, 0x00],
  CUT: [GS, 0x56, 0x41, 0x10], // partial cut
  FEED_3: [ESC, 0x64, 0x03],
}

function textToBytes(text: string): number[] {
  const encoder = new TextEncoder()
  return Array.from(encoder.encode(text))
}

function line(text: string): number[] {
  return [...textToBytes(text), LF]
}

function emptyLine(): number[] {
  return [LF]
}

function separator(char = '-', width = 32): number[] {
  return line(char.repeat(width))
}

function formatPrice(price: number): string {
  return price.toFixed(2)
}

function padRight(str: string, length: number): string {
  return str.slice(0, length).padEnd(length)
}

function padLeft(str: string, length: number): string {
  return str.slice(0, length).padStart(length)
}

export function generateReceipt(data: ReceiptData): Uint8Array {
  const bytes: number[] = []

  const push = (...cmds: number[][]) => {
    cmds.forEach((cmd) => bytes.push(...cmd))
  }

  // Initialize
  push(COMMANDS.INIT)

  // Shop Name (centered, double size)
  push(COMMANDS.ALIGN_CENTER, COMMANDS.FONT_DOUBLE, COMMANDS.BOLD_ON)
  push(line(data.shopName))
  push(COMMANDS.FONT_NORMAL, COMMANDS.BOLD_OFF)

  push(line('Coffee Shop'))
  push(emptyLine())

  // Order info
  push(COMMANDS.ALIGN_LEFT)
  push(line(`Order: #${data.orderId.slice(-8).toUpperCase()}`))
  push(line(`Customer: ${data.customerName}`))
  push(line(`Time: ${data.timestamp}`))
  push(separator())

  // Items header
  push(COMMANDS.BOLD_ON)
  push(line('Item                 Qty  Price'))
  push(COMMANDS.BOLD_OFF)
  push(separator())

  // Items
  data.items.forEach((item) => {
    const nameCol = padRight(item.name, 21)
    const qtyCol = padLeft(item.quantity.toString(), 3)
    const priceCol = padLeft(formatPrice(item.price * item.quantity), 7)
    push(line(`${nameCol}${qtyCol}${priceCol}`))
  })

  push(separator())

  // Total
  push(COMMANDS.BOLD_ON)
  const totalLabel = 'TOTAL'
  const totalPrice = `THB ${formatPrice(data.total)}`
  const totalLine =
    padRight(totalLabel, 32 - totalPrice.length) + totalPrice
  push(line(totalLine))
  push(COMMANDS.BOLD_OFF)

  // Payment
  push(emptyLine())
  push(line(`Payment: ${data.paymentType.toUpperCase()}`))
  push(emptyLine())

  // Footer
  push(COMMANDS.ALIGN_CENTER)
  push(line('Thank you!'))
  push(line('Please come again :)'))
  push(emptyLine())

  // Feed and cut
  push(COMMANDS.FEED_3)
  push(COMMANDS.CUT)

  return new Uint8Array(bytes)
}

// Web Bluetooth printing
export async function printReceiptBluetooth(
  data: ReceiptData
): Promise<{ success: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any
    if (!nav.bluetooth) {
      return { success: false, error: 'Web Bluetooth not supported in this browser' }
    }

    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    })

    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(
      '000018f0-0000-1000-8000-00805f9b34fb'
    )
    const characteristic = await service.getCharacteristic(
      '00002af1-0000-1000-8000-00805f9b34fb'
    )

    const receiptBytes = generateReceipt(data)

    // Send in chunks of 512 bytes
    const chunkSize = 512
    for (let i = 0; i < receiptBytes.length; i += chunkSize) {
      const chunk = receiptBytes.slice(i, i + chunkSize)
      await characteristic.writeValue(chunk)
    }

    device.gatt.disconnect()
    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Print failed'
    return { success: false, error: msg }
  }
}
