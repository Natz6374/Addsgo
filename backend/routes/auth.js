import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dubizzle_super_secret_key_123';

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await query.get(
      'SELECT id, email, full_name, phone, role, subscription_end_date, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, fullName, phone } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }

  try {
    // Check if user already exists
    const existing = await query.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const result = await query.run(
      'INSERT INTO users (email, password_hash, full_name, phone) VALUES (?, ?, ?, ?)',
      [email, passwordHash, fullName, phone || '']
    );

    // Generate JWT
    const token = jwt.sign({ id: result.id, email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: result.id,
        email,
        full_name: fullName,
        phone: phone || '',
        role: 'user',
        subscription_end_date: null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check user
    const user = await query.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    if (user.role === 'banned') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    // Generate JWT

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        subscription_end_date: user.subscription_end_date
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/upgrade - Upgrade subscription
router.put('/upgrade', authenticateToken, async (req, res) => {
  try {
    await query.run(
      "UPDATE users SET subscription_end_date = datetime('now', '+30 days') WHERE id = ?",
      [req.user.id]
    );
    res.json({ message: 'Account upgraded to Premium Tier successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
