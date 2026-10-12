import express from 'express';
import { query } from '../database.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const categories = await query.all(
      `SELECT c.*, parent.slug AS parent_slug
       FROM categories c
       LEFT JOIN categories parent ON parent.id = c.parent_id
       ORDER BY CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END, c.name COLLATE NOCASE`
    );
    return res.json({ categories });
  } catch (err) {
    console.error('Failed to load categories:', err);
    return res.status(500).json({ error: 'Unable to load categories right now' });
  }
});

export default router;
