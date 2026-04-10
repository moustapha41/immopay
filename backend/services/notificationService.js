import { Notification, Settings } from '../models/index.js'
import { sendEmail } from './emailService.js'

function isEmailEnabled(settings, key) {
  return Boolean(settings?.notifications?.[key]?.email)
}

export async function createInAppNotification(payload) {
  return Notification.create({
    type: payload.type || 'system',
    title: payload.title,
    message: payload.message,
    channel: 'in_app',
    status: 'sent',
    metadata: payload.metadata || {},
  })
}

export async function sendEventEmail({ settings, key, to, subject, html, text, metadata = {} }) {
  if (!to) return { skipped: true, reason: 'Aucun destinataire' }
  if (!isEmailEnabled(settings, key)) {
    return { skipped: true, reason: `Email désactivé pour ${key}` }
  }

  const result = await sendEmail({ to, subject, html, text })
  await Notification.create({
    type: key,
    title: subject,
    message: text || subject,
    channel: 'email',
    status: result.skipped ? 'skipped' : 'sent',
    metadata: {
      ...metadata,
      to,
      provider: 'resend',
      reason: result.reason || null,
    },
  })

  return result
}

export async function getOrCreateSettings() {
  let settings = await Settings.findOne()
  if (!settings) settings = await Settings.create({})
  return settings
}
