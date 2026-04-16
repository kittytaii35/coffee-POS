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
  promptPayId: string,
  amount?: number
): string {
  // Tag 00 - Payload Format Indicator (01)
  const format = '000201'
  // Tag 01 - Point of Initiation Method (11 = Static, 12 = Dynamic/amount)
  const poi = (amount !== undefined && amount > 0) ? '010212' : '010211'

  // Normalize ID (Phone -> 13 chars, National ID -> 13 chars, eWallet -> 15 chars)
  let refId = promptPayId.replace(/[^0-9]/g, '')
  let botType = '01' // Phone
  
  if (refId.length >= 15) {
    botType = '03' // E-Wallet
  } else if (refId.length === 13) {
    botType = '02' // National ID
  } else {
    // Phone
    refId = '0066' + refId.replace(/^0/, '') // e.g. 0066812345678
  }

  // Tag 29 - Merchant Account Info
  const botId = '0016A000000677010111'
  const subTag = botType + pad(refId)
  const tag29Data = botId + subTag
  const tag29 = '29' + pad(tag29Data)

  // Tag 58 - Country
  const country = '5802TH'
  // Tag 53 - Currency (THB = 764)
  const currency = '5303764'

  let payload = format + poi + tag29 + country + currency

  // Tag 54 - Transaction Amount
  if (amount !== undefined && amount > 0) {
    const amtStr = amount.toFixed(2)
    payload += '54' + pad(amtStr)
  }

  // Tag 63 - Checksum (4 chars string appended after 6304)
  payload += '6304'
  const checksum = crc16(payload)

  return payload + checksum
}
