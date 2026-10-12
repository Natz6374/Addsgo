'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import styles from './Header.module.css';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [location, setLocation] = useState('Mumbai');

  const handlePostAdClick = () => {
    if (!user) {
      router.push('/login?redirect=/post-ad');
    } else {
      router.push('/post-ad');
    }
  };


  const [categories, setCategories] = useState([
    { name: 'Motor', slug: 'motors', showBadge: true },
    { name: 'Property for rent', slug: 'property-for-rent', showBadge: true },
    { name: 'Property for sale', slug: 'property-for-sale' },
    { name: 'Rooms for rent', slug: 'rooms-for-rent' },
    { name: 'Jobs', slug: 'jobs' },
    { name: 'Classifieds', slug: 'classifieds' }
  ]);

  useEffect(() => {
    api.getCategories()
      .then(data => {
        const parents = data.filter(c => !c.parent_id);
        if (parents.length > 0) {
          const mapped = parents.map(p => ({
            ...p,
            showBadge: p.slug === 'motors' || p.slug === 'property-for-rent'
          }));
          setCategories(mapped);
        }
      })
      .catch(err => console.error('Error loading sub-navbar categories:', err));
  }, []);


  return (
    <header className={styles.header}>
      {/* Main Navigation Bar */}
      <div className={styles.navBar}>
        {/* Left Side: Logo & Location Select */}
        <div className={styles.leftSection}>
          <Link href="/" className={styles.logo}>
            Addsgo<span className={styles.logoDot}>.</span>
          </Link>
          
          <div className={styles.locationWrapper}>
            <select 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              className={styles.locationSelect}
            >
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Kolkata">Kolkata</option>
              <option value="Pune">Pune</option>
            </select>
          </div>
        </div>

        {/* Right Side Icons & CTA */}
        <div className={styles.rightSection}>
          {/* Notifications */}
          <div className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            <span>Notifications</span>
          </div>

          {/* My Searches */}
          <div className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>My Searches</span>
          </div>

          {/* Favorites */}
          <div className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <span>Favorites</span>
          </div>

          {/* Chats */}
          <Link href="/chat" className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.084.29.125.597.125.908v3.067c0 1.693-.972 3.223-2.508 3.96l-.827.397L17 20.25l-3.411-1.365-.827-.397a6.223 6.223 0 0 1-2.508-3.96v-3.067c0-.311.042-.619.125-.908m9.176 0A8.967 8.967 0 0 0 12 3.75a8.967 8.967 0 0 0-8.25 4.761m16.5 0A8.966 8.966 0 0 1 12 13.25a8.966 8.966 0 0 1-8.25-4.989m0 0A8.967 8.967 0 0 1 12 3.75a8.967 8.967 0 0 1 8.25 4.761" />
            </svg>
            <span>Chats</span>
          </Link>

          {/* My Ads */}
          <Link href="/profile" className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z" />
            </svg>
            <span>My Ads</span>
          </Link>

          {/* Bookings */}
          <div className={styles.iconLink}>
            <svg className={styles.iconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            <span>Bookings</span>
          </div>

          {/* Account control: never show a placeholder/mock user when logged out. */}
          {loading ? (
            <span className={styles.profileLoading} aria-label="Loading account" />
          ) : user ? (
            <div className={styles.userProfile}>
              <div className={styles.avatar} aria-hidden="true">
                {(user.full_name || 'User').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'U'}
              </div>
              <span className={styles.profileName}>
                {(user.full_name || user.name || 'User').trim().split(/\s+/)[0]}
                {(user.full_name || user.name || '').trim().split(/\s+/).length > 1 ? '...' : ''}
              </span>
              <svg style={{ width: '12px', height: '12px', marginLeft: '2px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>

              <div className={styles.dropdown}>
                {user.role === 'admin' && (
                  <Link href="/admin-portal" className={styles.dropdownItem} style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    Admin Portal
                  </Link>
                )}
                <Link href="/profile" className={styles.dropdownItem}>
                  My Ads
                </Link>
                <Link href="/chat" className={styles.dropdownItem}>
                  Messages
                </Link>
                <div className={styles.divider}></div>
                <button type="button" onClick={logout} className={styles.dropdownItem} style={{ color: 'var(--error)' }}>
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className={styles.loginLink}>
              Login
            </Link>
          )}

          {/* Place Ad Button */}
          <button onClick={handlePostAdClick} className={styles.postAdBtn}>
            Place Your Ad
          </button>
        </div>
      </div>

      {/* Sub-Navigation Categories Bar (Exactly like Screenshot, with NEW badges) */}
      <nav className={styles.subNavbar}>
        <div className={styles.subNavbarContent}>
          {categories.map((cat) => (
            <Link href={`/search?category=${cat.slug}`} key={cat.slug} className={styles.subLink}>
              {cat.name} {cat.showBadge && <span className={styles.newBadge}>NEW</span>}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}