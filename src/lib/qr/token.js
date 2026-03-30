import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const QR_TTL_SECONDS = 60

/**
 * Returns a 32-byte key derived from the SUPABASE_QR_SECRET env var.
 * Pads or truncates to exactly 32 bytes.
 */
function getKey() {
  const secret = process.env.SUPABASE_QR_SECRET
  if (!secret) throw new Error('SUPABASE_QR_SECRET nuk është konfiguruar')
  // Use first 32 bytes of the secret (base64 decoded if it looks like base64)
  const raw = Buffer.from(secret, 'base64')
  return raw.subarray(0, 32)
}

/**
 * Generates an encrypted, time-limited QR payload for a given plate.
 *
 * @param {{ plate_id: string, plate_number: string }} plate
 * @returns {string} Base64url-encoded encrypted token
 */
export function generateQRToken(plate) {
  const now = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({
    plate_id: plate.plate_id,
    plate_number: plate.plate_number,
    issued_at: now,
    expires_at: now + QR_TTL_SECONDS,
    nonce: randomBytes(4).toString('hex'),
  })

  const key = getKey()
  const iv = randomBytes(12) // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(payload, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack: iv (12) + authTag (16) + ciphertext — all base64url encoded
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString('base64url')
}

/**
 * Decrypts and validates a QR token.
 * Throws a descriptive Albanian error on any failure.
 *
 * @param {string} token — Base64url-encoded token from QR scan
 * @returns {{ plate_id: string, plate_number: string, issued_at: number, expires_at: number }}
 */
export function validateQRToken(token) {
  let packed
  try {
    packed = Buffer.from(token, 'base64url')
  } catch {
    throw new Error('QR-ja është e pavlefshme')
  }

  if (packed.length < 29) throw new Error('QR-ja është e dëmtuar')

  const iv = packed.subarray(0, 12)
  const authTag = packed.subarray(12, 28)
  const ciphertext = packed.subarray(28)

  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let payload
  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    payload = JSON.parse(decrypted.toString('utf8'))
  } catch {
    throw new Error('QR-ja nuk mund të deshifrohet')
  }

  const now = Math.floor(Date.now() / 1000)
  if (now > payload.expires_at) {
    throw new Error('QR-ja ka skaduar. Qytetari duhet të gjenerojë një të re.')
  }

  if (!payload.plate_id || !payload.plate_number) {
    throw new Error('QR-ja përmban të dhëna të pakompletuara')
  }

  return payload
}
