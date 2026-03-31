import { createHmac, timingSafeEqual } from 'crypto'

/**
 * QR Token — Static HMAC-SHA256
 *
 * Format: `<plate_id>.<HMAC-SHA256(plate_id, QR_SECRET) as hex>`
 *
 * Design rationale:
 * - The QR is printed on the car windscreen — it cannot have a TTL.
 * - Security comes from two layers:
 *   1. HMAC signature → proves the QR was issued by this system, not forged.
 *   2. `authorized_plates.status = 'approved'` DB check → suspending a plate
 *      instantly revokes access without reprinting the sticker.
 * - `timingSafeEqual` prevents timing-based signature extraction attacks.
 *
 * @param {{ plate_id: string }} plate
 * @returns {string} QR payload string — safe to encode as QR code
 */
export function generateQRToken({ plate_id }) {
  const secret = process.env.SUPABASE_QR_SECRET
  if (!secret) throw new Error('SUPABASE_QR_SECRET nuk është konfiguruar')

  const sig = createHmac('sha256', secret).update(plate_id).digest('hex')
  return `${plate_id}.${sig}`
}

/**
 * Validates a QR token scanned by the police scanner.
 * Throws a descriptive Albanian error on any failure.
 *
 * @param {string} token — raw string decoded from the QR code
 * @returns {{ plate_id: string }}
 */
export function validateQRToken(token) {
  const secret = process.env.SUPABASE_QR_SECRET
  if (!secret) throw new Error('SUPABASE_QR_SECRET nuk është konfiguruar')

  if (!token || typeof token !== 'string') throw new Error('QR-ja është e pavlefshme.')

  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) throw new Error('QR-ja është e pavlefshme.')

  const plate_id = token.slice(0, dotIndex)
  const receivedSig = token.slice(dotIndex + 1)

  if (!plate_id || !receivedSig) throw new Error('QR-ja është e dëmtuar.')

  // Recompute expected signature
  const expectedSig = createHmac('sha256', secret).update(plate_id).digest('hex')

  // Constant-time comparison — prevents timing attacks
  const a = Buffer.from(receivedSig, 'hex')
  const b = Buffer.from(expectedSig, 'hex')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('QR-ja nuk është e vlefshme për këtë sistem.')
  }

  return { plate_id }
}
