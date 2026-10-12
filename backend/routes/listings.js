import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();
const DEFAULT_LISTING_IMAGE = '/placeholder-classified.svg';

// Ensure uploaded images have a predictable, durable path.
const uploadDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
    cb(null, `listing-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

function normaliseListingImages(item) {
  let urls = [];
  if (Array.isArray(item.images_urls)) {
    urls = item.images_urls;
  } else if (typeof item.images_urls === 'string' && item.images_urls.trim()) {
    try {
      const parsed = JSON.parse(item.images_urls);
      urls = Array.isArray(parsed) ? parsed : [item.images_urls];
    } catch {
      urls = [item.images_urls];
    }
  }

  urls = urls.filter((url) => typeof url === 'string' && url.trim());
  item.images_urls = urls.length ? urls : [DEFAULT_LISTING_IMAGE];
  item.image_url = item.images_urls[0];
  return item;
}

function parseCategoryFields(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const result = JSON.parse(raw);
    return result && typeof result === 'object' && !Array.isArray(result) ? result : {};
  } catch {
    return {};
  }
}

// GET /api/listings - Search/filter public listings, or fetch the signed-in user's own ads.
router.get(
  '/',
  (req, res, next) => (req.query.user_id ? authenticateToken(req, res, next) : next()),
  async (req, res) => {
    try {
      // Expire ads only when an expiry date exists.
      await query.run(
        "UPDATE listings SET status = 'expired' WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at < datetime('now')"
      );

      const {
        q, category, minPrice, maxPrice, location, user_id,
        make, yearMin, yearMax, mileageMax, bedrooms, bathrooms, propType, jobType,
      } = req.query;

      if (user_id) {
        const requestedUserId = Number(user_id);
        if (!Number.isInteger(requestedUserId) || requestedUserId < 1) {
          return res.status(400).json({ error: 'Invalid user id' });
        }
        if (requestedUserId !== Number(req.user.id) && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'You can only view your own listings' });
        }
      }

      let sql = `
        SELECT l.*, c.name AS category_name, c.slug AS category_slug,
               COALESCE(parent.slug, c.slug) AS parent_category_slug,
               u.full_name AS seller_name
        FROM listings l
        JOIN categories c ON l.category_id = c.id
        LEFT JOIN categories parent ON parent.id = c.parent_id
        JOIN users u ON l.user_id = u.id
        WHERE 1 = 1
      `;
      const params = [];

      if (q && String(q).trim()) {
        sql += ` AND (l.title LIKE ? OR l.description LIKE ?)`;
        const term = `%${String(q).trim()}%`;
        params.push(term, term);
      }

      if (category) {
        const aliases = {
          motor: 'motors',
          'property-rent': 'property-for-rent',
          'property-sale': 'property-for-sale',
        };
        const slug = String(category).trim().toLowerCase();
        const normalisedSlug = aliases[slug] || slug;
        const selected = await query.get(
          'SELECT id FROM categories WHERE lower(slug) = ?',
          [normalisedSlug]
        );

        if (!selected) return res.json({ listings: [] });

        // CTE covers the parent and all nested sub-categories, not just one level.
        const tree = await query.all(
          `WITH RECURSIVE category_tree(id) AS (
             SELECT id FROM categories WHERE id = ?
             UNION ALL
             SELECT child.id FROM categories child
             JOIN category_tree parent ON child.parent_id = parent.id
           )
           SELECT id FROM category_tree`,
          [selected.id]
        );
        const categoryIds = tree.map((row) => row.id);
        if (!categoryIds.length) return res.json({ listings: [] });
        sql += ` AND l.category_id IN (${categoryIds.map(() => '?').join(',')})`;
        params.push(...categoryIds);
      }

      if (minPrice !== undefined && minPrice !== '') {
        const value = Number(minPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ error: 'Minimum price must be a valid non-negative number' });
        }
        sql += ` AND l.price >= ?`;
        params.push(value);
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        const value = Number(maxPrice);
        if (!Number.isFinite(value) || value < 0) {
          return res.status(400).json({ error: 'Maximum price must be a valid non-negative number' });
        }
        sql += ` AND l.price <= ?`;
        params.push(value);
      }

      if (location && String(location).trim()) {
        sql += ` AND l.location LIKE ?`;
        params.push(`%${String(location).trim()}%`);
      }

      if (user_id) {
        sql += ` AND l.user_id = ?`;
        params.push(Number(user_id));
      } else {
        sql += ` AND l.status = 'approved' AND (l.expires_at IS NULL OR l.expires_at > datetime('now'))`;
      }

      let listings = await query.all(sql, params);

      if (make || yearMin || yearMax || mileageMax || bedrooms || bathrooms || propType || jobType) {
        listings = listings.filter((item) => {
          const fields = parseCategoryFields(item.category_fields);
          if (make && String(fields.make || '').toLowerCase() !== String(make).toLowerCase()) return false;
          if (yearMin && Number(fields.year || 0) < Number(yearMin)) return false;
          if (yearMax && Number(fields.year || 0) > Number(yearMax)) return false;
          if (mileageMax && Number(fields.mileage || 0) > Number(mileageMax)) return false;
          if (bedrooms && Number(fields.bedrooms || 0) !== Number(bedrooms)) return false;
          if (bathrooms && Number(fields.bathrooms || 0) !== Number(bathrooms)) return false;
          if (propType && String(fields.type || '').toLowerCase() !== String(propType).toLowerCase()) return false;
          if (jobType && String(fields.job_type || '').toLowerCase() !== String(jobType).toLowerCase()) return false;
          return true;
        });
      }

      listings = listings.map(normaliseListingImages);
      listings.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return res.json({ listings });
    } catch (err) {
      console.error('Failed to retrieve listings:', err);
      return res.status(500).json({ error: 'Unable to load listings right now' });
    }
  }
);

// GET /api/listings/:id - Get one listing and seller contact information.
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid listing id' });
  }

  try {
    const listing = await query.get(
      `SELECT l.*, c.name AS category_name, c.slug AS category_slug,
              COALESCE(parent.slug, c.slug) AS parent_category_slug,
              u.full_name AS seller_name, u.phone AS seller_phone, u.email AS seller_email
       FROM listings l
       JOIN categories c ON l.category_id = c.id
       LEFT JOIN categories parent ON parent.id = c.parent_id
       JOIN users u ON l.user_id = u.id
       WHERE l.id = ?`,
      [id]
    );

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    await query.run('UPDATE listings SET views = COALESCE(views, 0) + 1 WHERE id = ?', [id]);
    listing.views = Number(listing.views || 0) + 1;
    normaliseListingImages(listing);
    return res.json({ listing });
  } catch (err) {
    console.error('Failed to retrieve listing:', err);
    return res.status(500).json({ error: 'Unable to load this listing right now' });
  }
});

// POST /api/listings - Create a listing.
router.post('/', authenticateToken, upload.array('images', 5), async (req, res) => {
  const { title, description, price, location, category_slug, phone_visible, category_fields } = req.body;
  const numericPrice = Number(price);

  if (
    !String(title || '').trim() ||
    !String(description || '').trim() ||
    price === undefined || price === '' ||
    !Number.isFinite(numericPrice) || numericPrice < 0 ||
    !String(location || '').trim() ||
    !String(category_slug || '').trim()
  ) {
    return res.status(400).json({
      error: 'Please provide a title, description, valid price, location, and category',
    });
  }

  try {
    const userDetails = await query.get(
      'SELECT role, subscription_end_date FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!userDetails) return res.status(404).json({ error: 'User not found' });
    if (userDetails.role === 'banned') {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    if (userDetails.role !== 'admin') {
      const activeSub = userDetails.subscription_end_date &&
        new Date(userDetails.subscription_end_date) > new Date();
      if (!activeSub) {
        const postCount = await query.get(
          "SELECT COUNT(*) AS count FROM listings WHERE user_id = ? AND status IN ('approved', 'pending') AND (expires_at IS NULL OR expires_at > datetime('now'))",
          [req.user.id]
        );
        if (Number(postCount.count) >= 3) {
          return res.status(403).json({
            error: 'You have reached the limit of 3 active ads. Upgrade your plan to post more.',
            quotaExhausted: true,
          });
        }
      }
    }

    const slug = String(category_slug).trim().toLowerCase();
    const categoryRow = await query.get(
      'SELECT id, slug FROM categories WHERE lower(slug) = ?',
      [slug]
    );
    if (!categoryRow) {
      return res.status(400).json({ error: 'Invalid category. Please choose a category from the list.' });
    }

    let images = (req.files || []).map((file) => `/uploads/${file.filename}`);
    if (!images.length) images = [DEFAULT_LISTING_IMAGE];

    let categoryFieldsJson = '{}';
    if (category_fields) {
      try {
        const parsed = typeof category_fields === 'string' ? JSON.parse(category_fields) : category_fields;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return res.status(400).json({ error: 'Invalid category specifications' });
        }
        categoryFieldsJson = JSON.stringify(parsed);
      } catch {
        return res.status(400).json({ error: 'Invalid category specifications JSON' });
      }
    }

    const phoneIsVisible = phone_visible === 'true' || phone_visible === '1' ? 1 : 0;
    // Instant publishing is the default. Set REQUIRE_LISTING_APPROVAL=true to re-enable moderation.
    const requiresApproval = process.env.REQUIRE_LISTING_APPROVAL === 'true';
    const status = requiresApproval ? 'pending' : 'approved';

    const result = await query.run(
      `INSERT INTO listings
        (user_id, category_id, title, description, price, location, images_urls,
         phone_visible, status, expires_at, category_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'), ?)`,
      [
        req.user.id,
        categoryRow.id,
        String(title).trim(),
        String(description).trim(),
        numericPrice,
        String(location).trim(),
        JSON.stringify(images),
        phoneIsVisible,
        status,
        categoryFieldsJson,
      ]
    );

    return res.status(201).json({
      message: status === 'approved'
        ? 'Your ad is live and visible in its category.'
        : 'Your ad was submitted and is awaiting administrator approval.',
      listingId: result.id,
      status,
    });
  } catch (err) {
    console.error('Failed to create listing:', err);
    return res.status(500).json({ error: 'Unable to publish this ad right now' });
  }
});

// DELETE /api/listings/:id - Delete one of the current user's listings.
router.delete('/:id', authenticateToken, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid listing id' });
  }

  try {
    const listing = await query.get('SELECT user_id FROM listings WHERE id = ?', [id]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (Number(listing.user_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own listing' });
    }

    await query.run('DELETE FROM listings WHERE id = ?', [id]);
    return res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Failed to delete listing:', err);
    return res.status(500).json({ error: 'Unable to delete this listing right now' });
  }
});

export default router;
