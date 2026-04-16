// ESC/POS receipt generator
// Returns raw bytes that can be sent to a Bluetooth printer via Web Bluetooth API

export interface ReceiptData {
  shopName: string
  orderId: string
  customerName: string
  items: Array<{
    name: string
    name_th?: string
    quantity: number
    price: number
  }>
  total: number
  paymentType: string
  timestamp: string
  qrCode?: string // Base64 data URL for QR code
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

/**
 * Browser / OS Print  — works with any USB or network printer installed on this PC.
 * Opens a styled popup that matches a standard 80 mm thermal receipt,
 * then calls window.print() so the OS print dialog appears.
 */
export function printReceiptBrowser(data: ReceiptData): { success: boolean; error?: string } {
  try {
    const itemRows = data.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:2px 0">
              <div style="font-weight:bold">${item.name}</div>
              ${item.name_th ? `<div style="font-size:13px; color:#333">${item.name_th}</div>` : ''}
            </td>
            <td style="text-align:center;padding:2px 4px">x${item.quantity}</td>
            <td style="text-align:right;padding:2px 0">฿${(item.price * item.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join('')

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt #${data.orderId.slice(-8).toUpperCase()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'Microsoft Sans Serif', 'Tahoma', sans-serif;
      font-size: 14px;
      width: 72mm; /* Standard printable width for 80mm rolls */
      margin: 0 auto;
      padding: 1mm 0;
      color: #000;
      line-height: 1.2;
    }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .large  { font-size: 22px; }
    .sep    { border-top: 1px dashed #000; margin: 4px 0; }
    table   { width: 100%; border-collapse: collapse; }
    td      { vertical-align: top; font-size: 14px; }
    .total-row td { font-weight: bold; font-size: 18px; border-top: 1px dashed #000; padding-top: 5px; }
    .qr-container { margin-top: 10px; text-align: center; }
    .qr-code { width: 160px; height: 160px; }
    .footer { margin-top: 8px; font-size: 12px; }
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { width: 72mm; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <div class="center bold large">${data.shopName}</div>
  <div class="center" style="font-size:10px;margin-bottom:2px">บิลใบเสร็จ / Receipt</div>
  <div class="sep"></div>
  <div style="font-size:10px">ออเดอร์: #${data.orderId.slice(-8).toUpperCase()}</div>
  <div style="font-size:10px">ลูกค้า: ${data.customerName}</div>
  <div style="font-size:10px">เวลา: ${data.timestamp}</div>
  <div class="sep" style="margin-bottom:2px"></div>
  <table>
    <thead>
      <tr class="bold">
        <td>รายการ</td>
        <td style="text-align:center">จำนวน</td>
        <td style="text-align:right">ราคา</td>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2">รวมทั้งหมด</td>
        <td style="text-align:right">฿${data.total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
  <div style="margin-top:4px; font-size:10px">ชำระโดย: ${data.paymentType.toUpperCase()}</div>

  ${data.qrCode ? `
  <div class="qr-container" style="margin-top: 4px;">
    <img src="${data.qrCode}" class="qr-code" style="width: 90px; height: 90px;" />
    <div style="font-size: 8px; margin-top: 2px; color: #666;">Scan to Verify / Pay</div>
  </div>
  ` : ''}
  <div class="sep"></div>
  <div class="center footer" style="margin-top: 2px;">
    <div>ขอบคุณที่ใช้บริการ / Thank you!</div>
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    // Create iframe with a reasonable size (some browsers block 0x0 or hidden from printing)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.width = '300px'
    iframe.style.height = '300px'
    iframe.style.left = '-1000px'
    iframe.style.top = '-1000px'
    iframe.style.opacity = '0'
    iframe.src = url
    
    document.body.appendChild(iframe)

    iframe.onload = () => {
      // Small buffer for rendering
      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus()
            iframe.contentWindow.print()
          }
        } catch (e) {
          console.error('Auto-print error:', e)
          // Final fallback: try window.open if iframe fails (unlikely in user-click context)
        }
        
        // Cleanup after window is likely done or canceled
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(url)
          }
        }, 60000)
      }, 500)
    }

    return { success: true }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Print failed'
    return { success: false, error: msg }
  }
}

