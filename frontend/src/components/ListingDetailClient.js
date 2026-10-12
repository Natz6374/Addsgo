'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { api, BACKEND_BASE_URL } from '../utils/api';
import styles from '../app/listing/[id]/page.module.css';

export default function ListingDetailClient({ initialListing }) {
  const router = useRouter();
  const { user } = useAuth();

  const [listing] = useState(initialListing);
  const [showPhone, setShowPhone] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = listing.images_urls && listing.images_urls.length > 0
    ? listing.images_urls
    : [listing.image_url || '/placeholder_classifieds.jpg'];

  const prevImage = (e) => {
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = (e) => {
    e.preventDefault();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Chat messaging form state
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Parse specifications
  let specs = {};
  if (listing.category_fields) {
    try {
      specs = typeof listing.category_fields === 'string'
        ? JSON.parse(listing.category_fields)
        : listing.category_fields;
    } catch (e) {
      console.error(e);
    }
  }

  // Prepend backend domain for images if relative
  const getImageUrl = (url) => {
    if (!url || url === '/placeholder-classified.svg') {
      return '/placeholder-classified.svg';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleImageError = (event) => {
    if (event.currentTarget.getAttribute('src') !== '/placeholder-classified.svg') {
      event.currentTarget.setAttribute('src', '/placeholder-classified.svg');
    }
  };

  const categoryGroupSlug = listing.parent_category_slug || listing.category_slug;
  const isOwner = Boolean(user && Number(user.id) === Number(listing.user_id));

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?redirect=/listing/${listing.id}`);
      return;
    }
    if (!messageText.trim()) return;

    try {
      setSendingMsg(true);
      await api.sendMessage(listing.id, listing.user_id, messageText.trim());
      // Redirect to the chat inbox interface
      router.push(`/chat?listing_id=${listing.id}&other_user_id=${listing.user_id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  // Specs rendering helper
  const renderSpecsList = () => {
    const slug = categoryGroupSlug;
    const items = [];

    if (slug === 'motors') {
      if (specs.make) items.push({ label: 'Make', val: specs.make });
      if (specs.model) items.push({ label: 'Model', val: specs.model });
      if (specs.year) items.push({ label: 'Year', val: specs.year });
      if (specs.mileage !== undefined) items.push({ label: 'Mileage', val: `${Number(specs.mileage).toLocaleString()} km` });
      if (specs.color) items.push({ label: 'Color', val: specs.color });
      if (specs.specs) items.push({ label: 'Specs', val: specs.specs });
    } else if (slug === 'property-for-sale' || slug === 'property-for-rent' || slug === 'rooms-for-rent') {
      if (specs.bedrooms !== undefined) items.push({ label: 'Bedrooms', val: specs.bedrooms });
      if (specs.bathrooms !== undefined) items.push({ label: 'Bathrooms', val: specs.bathrooms });
      if (specs.size) items.push({ label: 'Size', val: `${specs.size} sqft` });
      if (specs.type) items.push({ label: 'Property Type', val: specs.type });
      if (specs.furnishing) items.push({ label: 'Furnishing', val: specs.furnishing });
    } else if (slug === 'jobs') {
      if (specs.job_type) items.push({ label: 'Job Type', val: specs.job_type });
      if (specs.experience) items.push({ label: 'Experience', val: specs.experience });
      if (specs.salary_range) items.push({ label: 'Salary Range', val: specs.salary_range });
      if (specs.company) items.push({ label: 'Company', val: specs.company });
    } else if (slug === 'classifieds') {
      if (specs.condition) items.push({ label: 'Condition', val: specs.condition });
      if (specs.color) items.push({ label: 'Color', val: specs.color });
    }

    if (items.length === 0) return null;

    return (
      <div className={styles.infoCard}>
        <h3 className={styles.specsTitle}>Specifications</h3>
        <div className={styles.specsGrid}>
          {items.map((it, idx) => (
            <div key={idx} className={styles.specItem}>
              <span className={styles.specLabel}>{it.label}</span>
              <span className={styles.specValue}>{it.val}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <div className="container">
        <Link href="/search" className={styles.backLink}>
          &larr; Back to Listings
        </Link>

        <div className={styles.layout}>
          {/* Main Info Column */}
          <div>
            {/* Image Box */}
            <div className={styles.mainImageWrapper} style={{ position: 'relative' }}>
              <img
                src={getImageUrl(images[currentImgIndex])}
                alt={listing.title}
                className={styles.mainImage}
                onError={handleImageError}
              />
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      zIndex: 5,
                      outline: 'none',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    &#10094;
                  </button>
                  <button
                    onClick={nextImage}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      zIndex: 5,
                      outline: 'none',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    &#10095;
                  </button>
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    zIndex: 5
                  }}>
                    {currentImgIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Price & Title Card */}
            <div className={styles.infoCard}>
              <div className={styles.headerRow}>
                <div className={styles.price}>
                  Rs. {Number(listing.price || 0).toLocaleString('en-IN')}
                  {categoryGroupSlug === 'jobs' && <span style={{ fontSize: '1rem', color: 'var(--text-light)', fontWeight: 'normal' }}> / month</span>}
                </div>
                <div className={styles.viewsBadge}>
                  👁️ {listing.views} views
                </div>
              </div>
              <h1 className={styles.title}>{listing.title}</h1>

              <div className={styles.meta}>
                <span>📍 {listing.location}</span>
                <span>📅 Listed: {formatDate(listing.created_at)}</span>
                <span>🏷️ Category: {listing.category_name}</span>
              </div>
            </div>

            {/* Spec Card */}
            {renderSpecsList()}

            {/* Description Card */}
            <div className={styles.infoCard}>
              <h3 className={styles.specsTitle}>Description</h3>
              <p className={styles.descriptionText}>{listing.description}</p>
            </div>
          </div>

          {/* Seller / Sidebar Column */}
          <aside>
            <div className={styles.sellerCard}>
              <h3 className={styles.sellerTitle}>Seller Information</h3>

              <div className={styles.sellerProfile}>
                <div className={styles.avatar}>
                  {listing.seller_name ? listing.seller_name[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <div className={styles.sellerName}>{listing.seller_name}</div>
                  <div className={styles.sellerMeta}>Verified Addsgo Seller</div>
                </div>
              </div>

              {/* Phone Button */}
              {Number(listing.phone_visible) === 1 ? (
                <button
                  onClick={() => setShowPhone(!showPhone)}
                  className={`${styles.actionBtn} ${styles.phoneBtn}`}
                >
                  📞 {showPhone ? listing.seller_phone : 'Show Phone Number'}
                </button>
              ) : (
                <button className={styles.actionBtn} disabled style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-light)', cursor: 'not-allowed' }}>
                  🚫 Phone Number Hidden
                </button>
              )}

              {/* Keep messaging visible for buyers and give sellers a direct route to replies. */}
              {isOwner ? (
                <div className={styles.myAdNotice}>
                  <p>This is your listing. Buyers can message you about this ad.</p>
                  <Link href="/chat" className={styles.ownerChatBtn}>
                    💬 View Buyer Messages
                  </Link>
                  <Link href="/profile" className={styles.manageAdLink}>
                    Manage this ad
                  </Link>
                </div>
              ) : (
                <div className={`${styles.chatBox} ${styles.sellerContactAnchor}`} id="seller-contact" tabIndex={-1}>
                  <h4 className={styles.chatBoxTitle}>💬 Chat with the Seller</h4>
                  <p className={styles.chatHelpText}>Ask a question, check availability, or discuss the price directly with the seller.</p>
                  {user ? (
                    <form onSubmit={handleSendMessage}>
                      <textarea
                        className={styles.chatTextarea}
                        placeholder="Hi! Is this item still available? Can we negotiate on the price?"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        required
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !messageText.trim()}
                        className={styles.sendBtn}
                      >
                        {sendingMsg ? 'Sending...' : 'Send Message'}
                      </button>
                    </form>
                  ) : (
                    <div className={styles.loginNotice}>
                      Please <Link href={`/login?redirect=/listing/${listing.id}`}>login</Link> to message the seller.
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
