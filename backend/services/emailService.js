import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

export async function sendEmail({ to, subject, html, text }) {
  const resend = getResendClient()
  if (!resend) {
    return {
      skipped: true,
      reason: 'RESEND_API_KEY non configuré',
    }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const response = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  })

  return { skipped: false, response }
}
