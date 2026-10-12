import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function listingImage(imagesValue) {
  if (Array.isArray(imagesValue)) {
    return imagesValue.find((value) => typeof value === 'string' && value.trim()) || '/placeholder-classified.svg';
  }
  if (typeof imagesValue === 'string' && imagesValue.trim()) {
    try {
      const parsed = JSON.parse(imagesValue);
      if (Array.isArray(parsed)) {
        return parsed.find((value) => typeof value === 'string' && value.trim()) || '/placeholder-classified.svg';
      }
    } catch {
      // Older records may store one URL rather than a JSON array.
      return imagesValue;
    }
  }
  return '/placeholder-classified.svg';
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/messages/chats - One inbox row per listing and other participant.
router.get('/chats', authenticateToken, async (req, res) => {
  const userId = Number(req.user.id);

  try {
    // listings stores images_urls (JSON), not an image_url database column.
    const messages = await query.all(
      `SELECT m.*,
              l.title AS listing_title, l.price AS listing_price,
              l.images_urls AS listing_images,
              u_send.full_name AS sender_name,
              u_recv.full_name AS receiver_name
       FROM messages m
       JOIN listings l ON m.listing_id = l.id
       JOIN users u_send ON m.sender_id = u_send.id
       JOIN users u_recv ON m.receiver_id = u_recv.id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.created_at ASC, m.id ASC`,
      [userId, userId]
    );

    const chatMap = new Map();
    for (const msg of messages) {
      const senderId = Number(msg.sender_id);
      const receiverId = Number(msg.receiver_id);
      const otherUserId = senderId === userId ? receiverId : senderId;
      const otherUserName = senderId === userId ? msg.receiver_name : msg.sender_name;
      const key = `${msg.listing_id}-${otherUserId}`;

      chatMap.set(key, {
        listing_id: Number(msg.listing_id),
        listing_title: msg.listing_title,
        listing_price: Number(msg.listing_price || 0),
        listing_image: listingImage(msg.listing_images),
        other_user_id: otherUserId,
        other_user_name: otherUserName || 'Addsgo user',
        last_message: msg.content,
        last_message_time: msg.created_at,
      });
    }

    const chats = Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0)
    );
    return res.json({ chats });
  } catch (err) {
    console.error('Failed to load chat inbox:', err);
    return res.status(500).json({ error: 'Unable to load your conversations right now' });
  }
});

// GET /api/messages/:listingId/:otherUserId - Load a conversation between two participants.
router.get('/:listingId/:otherUserId', authenticateToken, async (req, res) => {
  const userId = Number(req.user.id);
  const listingId = validId(req.params.listingId);
  const otherUserId = validId(req.params.otherUserId);

  if (!listingId || !otherUserId || otherUserId === userId) {
    return res.status(400).json({ error: 'Invalid listing or conversation participant' });
  }

  try {
    const listing = await query.get('SELECT id, user_id FROM listings WHERE id = ?', [listingId]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const hasThread = await query.get(
      `SELECT id FROM messages
       WHERE listing_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       LIMIT 1`,
      [listingId, userId, otherUserId, otherUserId, userId]
    );

    // A buyer may open a conversation with the real seller; all other threads must already exist.
    if (!hasThread && Number(listing.user_id) !== userId && Number(listing.user_id) !== otherUserId) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    // Calculate direction on the server using the authenticated session. This avoids
    // the two clients independently guessing message ownership from cached user state.
    const messages = await query.all(
      `SELECT m.*, u.full_name AS sender_name,
              CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END AS is_mine
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.listing_id = ?
         AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
       ORDER BY m.created_at ASC, m.id ASC`,
      [userId, listingId, userId, otherUserId, otherUserId, userId]
    );

    return res.json({ messages });
  } catch (err) {
    console.error('Failed to load conversation:', err);
    return res.status(500).json({ error: 'Unable to load this conversation right now' });
  }
});

// POST /api/messages - Send a message in a buyer/seller conversation.
router.post('/', authenticateToken, async (req, res) => {
  const senderId = Number(req.user.id);
  const listingId = validId(req.body.listing_id);
  const receiverId = validId(req.body.receiver_id);
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

  if (!listingId || !receiverId || receiverId === senderId || !content) {
    return res.status(400).json({ error: 'A listing, a different recipient, and a message are required' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ error: 'Messages must be 5,000 characters or fewer' });
  }

  try {
    const listing = await query.get('SELECT id, user_id, title FROM listings WHERE id = ?', [listingId]);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const receiver = await query.get('SELECT id FROM users WHERE id = ?', [receiverId]);
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });

    const ownerId = Number(listing.user_id);
    if (senderId !== ownerId) {
      // Buyers can start a conversation only with the listing's actual seller.
      if (receiverId !== ownerId) {
        return res.status(403).json({ error: 'Messages about this ad must be sent to its seller' });
      }
    } else {
      // Sellers can reply only to a buyer who has already contacted them about this ad.
      const priorContact = await query.get(
        `SELECT id FROM messages
         WHERE listing_id = ?
           AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
         LIMIT 1`,
        [listingId, receiverId, senderId, senderId, receiverId]
      );
      if (!priorContact) {
        return res.status(403).json({ error: 'The buyer must contact you before you can reply' });
      }
    }

    const result = await query.run(
      `INSERT INTO messages (listing_id, sender_id, receiver_id, content)
       VALUES (?, ?, ?, ?)`,
      [listingId, senderId, receiverId, content]
    );

    const message = await query.get(
      `SELECT m.*, u.full_name AS sender_name,
              CASE WHEN m.sender_id = ? THEN 1 ELSE 0 END AS is_mine
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [senderId, result.id]
    );
    return res.status(201).json({ message });
  } catch (err) {
    console.error('Failed to send message:', err);
    return res.status(500).json({ error: 'Unable to send your message right now' });
  }
});

export default router;
