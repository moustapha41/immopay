import { Notification } from '../models/index.js'

export async function getAll(req, res) {
  try {
    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
    })
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function markAsRead(req, res) {
  try {
    const notification = await Notification.findByPk(req.params.id)
    if (!notification) return res.status(404).json({ error: 'Notification introuvable.' })
    await notification.update({ readAt: new Date() })
    res.json(notification)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function markAllAsRead(req, res) {
  try {
    await Notification.update(
      { readAt: new Date() },
      { where: { readAt: null } },
    )
    res.json({ message: 'Toutes les notifications ont été marquées comme lues.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
