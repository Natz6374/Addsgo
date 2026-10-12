import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper functions to wrap sqlite3 with Promises
export const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Safely add columns when upgrading an existing database without deleting user data.
async function ensureColumn(table, column, definition) {
  const columns = await query.all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await query.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Database migration: added ${table}.${column}`);
  }
}

// Initialize or migrate tables, then seed sample data only on a genuinely new database.
export async function initDatabase() {
  const tableCheck = await query.get(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  const isFreshDatabase = !tableCheck;

  console.log(
    isFreshDatabase
      ? 'First run detected. Creating tables and seeding sample data...'
      : 'Existing database detected. Applying safe schema/category migrations...'
  );

  // 1. Users Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user', -- user / admin
      subscription_end_date DATETIME DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Categories Table (Added parent_id for cascading categories)
  await query.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER DEFAULT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      FOREIGN KEY(parent_id) REFERENCES categories(id)
    )
  `);

  // 3. Listings Table (Updated images_urls, status, rejection_reason, is_featured, expires_at)
  await query.run(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      location TEXT NOT NULL,
      images_urls TEXT, -- JSON string representing array of image URLs
      phone_visible INTEGER DEFAULT 1,
      views INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending', -- pending, approved, rejected, expired
      rejection_reason TEXT DEFAULT NULL,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      category_fields TEXT, -- JSON string representing custom dynamic specs
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  // 4. Messages Table
  await query.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(listing_id) REFERENCES listings(id),
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    )
  `);

  // Keep existing installations compatible with newer API queries.
  const requiredColumns = {
    users: {
      email: 'TEXT',
      password_hash: 'TEXT',
      full_name: 'TEXT',
      phone: 'TEXT',
      role: "TEXT DEFAULT 'user'",
      subscription_end_date: 'DATETIME',
      created_at: 'DATETIME'
    },
    categories: {
      parent_id: 'INTEGER DEFAULT NULL',
      name: 'TEXT',
      slug: 'TEXT',
      icon: 'TEXT'
    },
    listings: {
      user_id: 'INTEGER',
      category_id: 'INTEGER',
      title: 'TEXT',
      description: 'TEXT',
      price: 'REAL DEFAULT 0',
      location: 'TEXT',
      images_urls: 'TEXT',
      phone_visible: 'INTEGER DEFAULT 1',
      views: 'INTEGER DEFAULT 0',
      status: 'TEXT',
      rejection_reason: 'TEXT',
      is_featured: 'INTEGER DEFAULT 0',
      created_at: 'DATETIME',
      expires_at: 'DATETIME',
      category_fields: 'TEXT'
    },
    messages: {
      listing_id: 'INTEGER',
      sender_id: 'INTEGER',
      receiver_id: 'INTEGER',
      content: 'TEXT',
      created_at: 'DATETIME'
    }
  };

  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const [column, definition] of Object.entries(columns)) {
      await ensureColumn(table, column, definition);
    }
  }

  await query.run("UPDATE listings SET created_at = COALESCE(created_at, datetime('now'))");
  await query.run("UPDATE listings SET status = 'approved' WHERE status IS NULL OR status = ''");

  // Seed top-level categories
  const topCategories = [
    { name: 'Motor', slug: 'motors', icon: '🚗' },
    { name: 'Property for rent', slug: 'property-for-rent', icon: '🏢' },
    { name: 'Property for sale', slug: 'property-for-sale', icon: '🏠' },
    { name: 'Rooms for rent', slug: 'rooms-for-rent', icon: '🛏️' },
    { name: 'Jobs', slug: 'jobs', icon: '💼' },
    { name: 'Classifieds', slug: 'classifieds', icon: '📦' }
  ];

  for (const cat of topCategories) {
    const existing = await query.get('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
    if (existing) {
      await query.run(
        'UPDATE categories SET name = ?, icon = ?, parent_id = NULL WHERE id = ?',
        [cat.name, cat.icon, existing.id]
      );
    } else {
      await query.run(
        'INSERT INTO categories (name, slug, icon, parent_id) VALUES (?, ?, ?, NULL)',
        [cat.name, cat.slug, cat.icon]
      );
    }
  }

  // Get parent IDs for sub-categories
  const seededTopCats = await query.all('SELECT * FROM categories WHERE parent_id IS NULL');
  const getParentId = (slug) => seededTopCats.find(c => c.slug === slug)?.id;

  // Seed sub-categories
  const subCategories = [
    { name: 'Cars', slug: 'cars', parent_slug: 'motors' },
    { name: 'Motorcycles', slug: 'motorcycles', parent_slug: 'motors' },
    { name: 'Accessories', slug: 'motor-accessories', parent_slug: 'motors' },
    { name: 'Apartments', slug: 'rent-apartments', parent_slug: 'property-for-rent' },
    { name: 'Houses', slug: 'rent-houses', parent_slug: 'property-for-rent' },
    { name: 'Apartments', slug: 'sale-apartments', parent_slug: 'property-for-sale' },
    { name: 'Houses', slug: 'sale-houses', parent_slug: 'property-for-sale' },
    { name: 'Commercial', slug: 'sale-commercial', parent_slug: 'property-for-sale' },
    { name: 'Shared Room', slug: 'shared-room', parent_slug: 'rooms-for-rent' },
    { name: 'Private Room', slug: 'private-room', parent_slug: 'rooms-for-rent' },
    { name: 'IT', slug: 'jobs-it', parent_slug: 'jobs' },
    { name: 'Sales', slug: 'jobs-sales', parent_slug: 'jobs' },
    { name: 'Marketing', slug: 'jobs-marketing', parent_slug: 'jobs' },
    { name: 'Phones', slug: 'classifieds-phones', parent_slug: 'classifieds' },
    { name: 'Computers', slug: 'classifieds-computers', parent_slug: 'classifieds' },
    { name: 'Furniture', slug: 'classifieds-furniture', parent_slug: 'classifieds' }
  ];

  for (const sub of subCategories) {
    const parentId = getParentId(sub.parent_slug);
    const existing = await query.get('SELECT id FROM categories WHERE slug = ?', [sub.slug]);
    if (existing) {
      await query.run(
        'UPDATE categories SET name = ?, parent_id = ? WHERE id = ?',
        [sub.name, parentId, existing.id]
      );
    } else {
      await query.run(
        'INSERT INTO categories (name, slug, icon, parent_id) VALUES (?, ?, NULL, ?)',
        [sub.name, sub.slug, parentId]
      );
    }
  }
  console.log('Categories & sub-categories seeded.');

  if (isFreshDatabase) {
  // Seed mock users (john@example.com is admin, sarah@example.com is standard user)
  const salt = await bcrypt.genSalt(10);
  const hash1 = await bcrypt.hash('password123', salt);
  const hash2 = await bcrypt.hash('password123', salt);

  let mockUserId1, mockUserId2;
  const user1 = await query.run(
    "INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, 'admin')",
    ['john@example.com', hash1, 'John Doe (Admin)', '+91 98765 43210']
  );
  mockUserId1 = user1.id;

  const user2 = await query.run(
    "INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, 'user')",
    ['sarah@example.com', hash2, 'Sarah Smith', '+91 99999 88888']
  );
  mockUserId2 = user2.id;
  console.log('Mock users seeded.');

  // Fetch sub-categories to assign listings directly to them
  const subCats = await query.all('SELECT * FROM categories WHERE parent_id IS NOT NULL');
  const getSubCatId = (slug) => subCats.find(c => c.slug === slug)?.id;

  const mockListings = [
    {
      user_id: mockUserId1,
      category_id: getSubCatId('cars'),
      title: 'Toyota Camry 2021 SE Petrol',
      description: 'Excellent condition, single owner, Indian specifications, showroom maintained. Very clean interior and exterior. Price slightly negotiable.',
      price: 2850000,
      location: 'Bandra West, Mumbai',
      images_urls: JSON.stringify(['/placeholder_car.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        make: 'Toyota',
        model: 'Camry',
        year: 2021,
        mileage: 32000,
        color: 'White',
        specs: 'Indian'
      })
    },
    {
      user_id: mockUserId2,
      category_id: getSubCatId('cars'),
      title: 'Mercedes-Benz G63 AMG 2023',
      description: 'Mint condition, matte black G63 AMG. Top-end options, under warranty. Clean history, no accidents.',
      price: 24500000,
      location: 'Connaught Place, Delhi',
      images_urls: JSON.stringify(['/placeholder_g63.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        make: 'Mercedes-Benz',
        model: 'G-Class',
        year: 2023,
        mileage: 4500,
        color: 'Black',
        specs: 'Indian'
      })
    },
    {
      user_id: mockUserId2,
      category_id: getSubCatId('sale-apartments'),
      title: 'Luxury 3 BHK Apartment in Hiranandani',
      description: 'Stunning high-floor apartment, fully furnished. Ready to move in. Premium society with luxury amenities including club house, swimming pool, and gym.',
      price: 45000000,
      location: 'Powai, Mumbai',
      images_urls: JSON.stringify(['/placeholder_apartment.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        bedrooms: 3,
        bathrooms: 3,
        size: 1650,
        type: 'Apartment',
        furnishing: 'Furnished'
      })
    },
    {
      user_id: mockUserId1,
      category_id: getSubCatId('rent-apartments'),
      title: 'Spacious 2 BHK Apartment for Rent',
      description: 'Spacious 2 BHK flat with balcony. Semi-furnished, modular kitchen, power backup, security, and lift access. Near metro station.',
      price: 42000,
      location: 'Indiranagar, Bangalore',
      images_urls: JSON.stringify(['/placeholder_jvc.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        bedrooms: 2,
        bathrooms: 2,
        size: 1100,
        type: 'Apartment',
        furnishing: 'Semi-Furnished'
      })
    },
    {
      user_id: mockUserId2,
      category_id: getSubCatId('shared-room'),
      title: 'Fully Furnished Single Room in Shared Flat',
      description: 'Spacious single room for rent in a 3 BHK shared apartment. Comes with double bed, wardrobe, AC, and attached bathroom. Kitchen, washing machine, and Wi-Fi are shared.',
      price: 15000,
      location: 'Gachibowli, Hyderabad',
      images_urls: JSON.stringify(['/placeholder_jvc.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        bedrooms: 1,
        bathrooms: 1,
        size: 250,
        type: 'Shared Room',
        furnishing: 'Furnished'
      })
    },
    {
      user_id: mockUserId2,
      category_id: getSubCatId('jobs-it'),
      title: 'Senior Frontend Engineer (React / Next.js)',
      description: 'We are looking for a Senior React/Next.js developer with 5+ years of experience to join our growing tech team in Bangalore. Hybrid workspace.',
      price: 180000,
      location: 'Whitefield, Bangalore',
      images_urls: JSON.stringify(['/placeholder_job.jpg']),
      phone_visible: 0,
      status: 'approved',
      category_fields: JSON.stringify({
        job_type: 'Full-Time',
        experience: '5+ Years',
        salary_range: '1,50,000 - 2,00,000 INR',
        company: 'Tech Solutions Private Limited'
      })
    },
    {
      user_id: mockUserId1,
      category_id: getSubCatId('classifieds-phones'),
      title: 'iPhone 15 Pro Max - 256GB - Blue Titanium',
      description: 'Selling my iPhone 15 Pro Max in pristine condition. 98% battery health. Comes with original box and bill. No scratches or issues.',
      price: 115000,
      location: 'T. Nagar, Chennai',
      images_urls: JSON.stringify(['/placeholder_phone.jpg']),
      phone_visible: 1,
      status: 'approved',
      category_fields: JSON.stringify({
        condition: 'Like New',
        color: 'Blue'
      })
    },
    // Seed one PENDING ad to test moderation queue
    {
      user_id: mockUserId2,
      category_id: getSubCatId('classifieds-computers'),
      title: 'MacBook Pro M2 Max - 32GB RAM - 1TB SSD',
      description: 'MacBook Pro M2 Max, Space Grey. Mint condition. 95% battery health. Comes with charger and box. Under Apple Care.',
      price: 210000,
      location: 'Koregaon Park, Pune',
      images_urls: JSON.stringify(['/placeholder_classifieds.jpg']),
      phone_visible: 1,
      status: 'pending',
      category_fields: JSON.stringify({
        condition: 'Excellent',
        color: 'Space Grey'
      })
    }
  ];

  for (const listing of mockListings) {
    await query.run(
      `INSERT INTO listings (user_id, category_id, title, description, price, location, images_urls, phone_visible, status, expires_at, category_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'), ?)`,
      [
        listing.user_id,
        listing.category_id,
        listing.title,
        listing.description,
        listing.price,
        listing.location,
        listing.images_urls,
        listing.phone_visible,
        listing.status,
        listing.category_fields
      ]
    );
  }
  console.log('Mock listings seeded.');

  // Clear and re-seed messages
  const carListing = await query.get('SELECT id FROM listings LIMIT 1');
  if (carListing && mockUserId1 && mockUserId2) {
    await query.run(
      'INSERT INTO messages (listing_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)',
      [carListing.id, mockUserId2, mockUserId1, 'Hi, is the Toyota Camry still available?']
    );
    await query.run(
      'INSERT INTO messages (listing_id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)',
      [carListing.id, mockUserId1, mockUserId2, 'Hi Sarah, yes it is. Would you like to check it out?']
    );
    console.log('Mock messages seeded.');
  }
  }
}