import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to verify admin role
async function requireAdmin(req, res, next) {
  try {
    const user = await query.get('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin role required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Server error during authorization' });
  }
}

// All admin routes require token authentication and admin check
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/listings/pending - List all pending listings
router.get('/listings/pending', async (req, res) => {
  try {
    const listings = await query.all(
      `SELECT l.*, c.name as category_name, u.full_name as seller_name, u.email as seller_email
       FROM listings l
       JOIN categories c ON l.category_id = c.id
       JOIN users u ON l.user_id = u.id
       WHERE l.status = 'pending'
       ORDER BY l.created_at DESC`
    );

    // Map image parsing
    const mapped = listings.map(item => {
      if (item.images_urls) {
        try {
          const urls = JSON.parse(item.images_urls);
          item.images_urls = urls;
          item.image_url = urls[0] || '/placeholder_classifieds.jpg';
        } catch (e) {
          item.images_urls = [item.images_urls];
          item.image_url = item.images_urls[0];
        }
      }
      return item;
    });

    res.json({ listings: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/listings/:id/approve - Approve a listing
router.patch('/listings/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const listing = await query.get('SELECT id FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Set status to approved, and reset expires_at to 30 days from approval time
    await query.run(
      `UPDATE listings
       SET status = 'approved', expires_at = datetime('now', '+30 days'), rejection_reason = NULL
       WHERE id = ?`,
      [id]
    );

    res.json({ message: 'Listing approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/listings/:id/reject - Reject a listing with reason
router.patch('/listings/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const listing = await query.get('SELECT id FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await query.run(
      `UPDATE listings
       SET status = 'rejected', rejection_reason = ?
       WHERE id = ?`,
      [reason, id]
    );

    res.json({ message: 'Listing rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users - Get all users registry
router.get('/users', async (req, res) => {
  try {
    const users = await query.all(
      `SELECT id, email, full_name, phone, role, subscription_end_date, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/toggle-ban - Toggle user ban status
router.patch('/users/:id/toggle-ban', async (req, res) => {
  const { id } = req.params;
  try {
    // Prevent banning yourself
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot ban or suspend your own admin account.' });
    }

    const user = await query.get('SELECT role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newRole = user.role === 'banned' ? 'user' : 'banned';
    await query.run('UPDATE users SET role = ? WHERE id = ?', [newRole, id]);

    res.json({ message: `User status updated to ${newRole}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/listings/:id/takedown - Emergency takedown / deletion
router.delete('/listings/:id/takedown', async (req, res) => {
  const { id } = req.params;
  try {
    const listing = await query.get('SELECT id FROM listings WHERE id = ?', [id]);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await query.run('DELETE FROM listings WHERE id = ?', [id]);
    res.json({ message: 'Listing removed successfully by admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
