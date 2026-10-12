import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import categoryRoutes from './routes/categories.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedFrontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Permit server-to-server/CLI requests without an Origin header.
    if (!origin || allowedFrontendOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('This origin is not allowed by the API CORS configuration'));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve placeholder images for initial mock seed listings
app.get('/placeholder_car.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_g63.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1520050206274-a1ae446cb3cc?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_apartment.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_jvc.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_job.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_phone.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=600&q=80'));
app.get('/placeholder_classifieds.jpg', (req, res) => res.redirect('https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'));

// Friendly root route to redirect backend URL visitors to the frontend
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; text-align: center; padding: 50px; color: #1e293b;">
      <h1 style="color: #004bbf;">Addsgo Backend API Running</h1>
      <p style="font-size: 1.1rem; margin: 20px 0;">The Addsgo API is running. Open the configured frontend URL to use the classifieds website:</p>
      <a href="http://localhost:3000" style="display: inline-block; background: #004bbf; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to http://localhost:3000</a>
    </div>
  `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);

// Convert upload/CORS/unexpected errors into a predictable JSON response.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Each image must be 5 MB or smaller' });
  }
  if (err && err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'You can upload a maximum of 5 images per ad' });
  }
  if (err && /Only image files are allowed/.test(err.message || '')) {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }
  if (err && /CORS configuration/.test(err.message || '')) {
    return res.status(403).json({ error: 'This website is not allowed to access the API' });
  }
  console.error('Unhandled API error:', err);
  return res.status(500).json({ error: 'Unexpected server error' });
});

// Start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Express server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
