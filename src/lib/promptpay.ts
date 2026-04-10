// PromptPay QR Code generator
// CRC16-CCITT implementation for PromptPay EMV payload

function crc16(str: string): string {
  let crc = 0xffff
  const bytes = Buffer.from(str, 'utf8')
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021
      } else {
        crc <<= 1
      }
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function pad(str: string): string {
  return str.length.toString().padStart(2, '0') + str
}

export function generatePromptPayPayload(
  phoneOrNationalId: string,
  amount?: number
): string {
  const isPhone = phoneOrNationalId.length <= 10

  // Normalize phone: 0812345678 -> 0066812345678
  let target = phoneOrNationalId
  if (isPhone) {
    target = '0066' + target.replace(/^0/, '')
  }

  const guidanceTag = isPhone ? '01' : '02'

  const merchantAccount =
    '0016A000000677010111' + pad(guidanceTag + pad(target))
  let payload = '000201' + pad(merchantAccount) + '5303764'

  if (amount !== undefined && amount > 0) {
    const amountStr = amount.toFixed(2)
    payload += '54' + pad(amountStr)
  }

  payload += '5802TH6304'
  const checksum = crc16(payload)
  payload += checksum

  return payload
}
