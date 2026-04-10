import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

function generateJWT(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

export async function register(req, res) {
  try {
    const { firstName, lastName, email, phone, password } = req.body
    const existing = await User.findOne({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé.' })

    const user = await User.create({ firstName, lastName, email, phone, password })
    const token = generateJWT(user)
    res.status(201).json({ token, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })

    const valid = await user.comparePassword(password)
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect.' })

    const token = generateJWT(user)
    res.json({ token, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export async function getMe(req, res) {
  try {
    const user = await User.findByPk(req.userId)
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé.' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
