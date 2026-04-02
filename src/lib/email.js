import { Resend } from 'resend'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

export function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY)
}

function toAbsoluteUrl(href) {
  if (!href) return null
  if (/^https?:\/\//i.test(href)) return href

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || ''
  if (!appOrigin) return href

  return `${appOrigin}${href.startsWith('/') ? href : `/${href}`}`
}

export function buildNotificationEmail({
  body,
  buttonLabel = 'Hape ne platforme',
  footerSignature,
  href,
  preheader,
  recipientName,
  title,
}) {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body)
  const safeRecipientName = escapeHtml(recipientName || 'Qytetar')
  const safeFooter = escapeHtml(footerSignature || 'Shkodra.digital')
  const safePreheader = escapeHtml(preheader || body)
  const absoluteHref = toAbsoluteUrl(href)
  const safeHref = absoluteHref ? escapeHtml(absoluteHref) : null
  const safeButtonLabel = escapeHtml(buttonLabel)

  const html = `
    <!doctype html>
    <html lang="sq">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle}</title>
      </head>
      <body style="margin:0;background:#030712;padding:24px;font-family:Arial,sans-serif;color:#e2e8f0;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
        <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:#050914;">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);background:linear-gradient(135deg,#0f172a 0%,#082f49 45%,#064e3b 100%);">
            <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;">Shkodra.digital</div>
            <h1 style="margin:12px 0 0;font-size:28px;line-height:1.15;color:#ffffff;">${safeTitle}</h1>
          </div>
          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#cbd5e1;">Pershendetje ${safeRecipientName},</p>
            <p style="margin:0;font-size:15px;line-height:1.8;color:#e2e8f0;">${safeBody}</p>
            ${safeHref ? `
              <div style="margin-top:28px;">
                <a href="${safeHref}" style="display:inline-block;border-radius:16px;background:linear-gradient(90deg,#60a5fa 0%,#34d399 100%);padding:14px 20px;font-size:13px;font-weight:700;color:#020617;text-decoration:none;">
                  ${safeButtonLabel}
                </a>
              </div>
            ` : ''}
          </div>
          <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;line-height:1.7;color:#94a3b8;">
            ${safeFooter}
          </div>
        </div>
      </body>
    </html>
  `

  const text = `${title}\n\nPershendetje ${recipientName || 'Qytetar'},\n\n${body}${absoluteHref ? `\n\n${buttonLabel}: ${absoluteHref}` : ''}\n\n${footerSignature || 'Shkodra.digital'}`

  return { html, text }
}

export async function sendTransactionalEmail({
  from,
  html,
  replyTo,
  subject,
  text,
  to,
}) {
  const resend = getResendClient()

  if (!resend) {
    throw new Error('Resend API key mungon.')
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
    replyTo: replyTo || undefined,
  })

  if (error) {
    throw new Error(error.message || 'Dergimi i email-it deshtoi.')
  }

  return data
}
