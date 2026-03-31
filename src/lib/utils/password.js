/** Generates a readable random password e.g. "Kx7mP2qR" */
export function generateRandomPassword() {
  const lower  = 'abcdefghijkmnopqrstuvwxyz'
  const upper  = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const digits = '23456789'
  const all    = lower + upper + digits
  let pass = upper[Math.floor(Math.random() * upper.length)]
           + digits[Math.floor(Math.random() * digits.length)]
  for (let i = 0; i < 6; i++) pass += all[Math.floor(Math.random() * all.length)]
  return pass.split('').sort(() => Math.random() - 0.5).join('')
}
