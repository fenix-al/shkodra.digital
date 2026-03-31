'use client'

export default function VerifyTimestamp() {
  const d = new Date()
  const dd  = String(d.getDate()).padStart(2, '0')
  const mm  = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh  = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss  = String(d.getSeconds()).padStart(2, '0')

  return (
    <p className="text-center text-[10px] text-slate-600 font-mono">
      Verifikuar: {dd}.{mm}.{yyyy} {hh}:{min}:{ss}
    </p>
  )
}
