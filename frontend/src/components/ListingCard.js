import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import styles from './ListingCard.module.css';
import { BACKEND_BASE_URL } from '../utils/api';

export default function ListingCard({ listing }) {
  const { user } = useAuth();
  const isOwner = Boolean(user && Number(user.id) === Number(listing.user_id));
  const listingHref = `/listing/${listing.id}`;

  // Safe JSON parse for category fields
  let specs = {};
  if (listing.category_fields) {
    try {
      specs = typeof listing.category_fields === 'string'
        ? JSON.parse(listing.category_fields)
        : listing.category_fields;
    } catch (e) {
      console.error('Failed to parse listing specs', e);
    }
  }

  // Format price
  const formatPrice = (val, catSlug) => {
    if (catSlug === 'jobs') {
      return `Rs. ${Number(val || 0).toLocaleString('en-IN')}/mo`;
    }
    return `Rs. ${Number(val || 0).toLocaleString('en-IN')}`;
  };

  // Get image URL
  const getImageUrl = (url) => {
    if (!url || url === '/placeholder-classified.svg') {
      return '/placeholder-classified.svg';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied === 'true') return;
    event.currentTarget.dataset.fallbackApplied = 'true';
    event.currentTarget.src = '/placeholder-classified.svg';
  };

  // Render spec tags based on category
  const renderSpecs = () => {
    const slug = listing.parent_category_slug || listing.category_slug;
    if (slug === 'motors') {
      return (
        <>
          {specs.year && <span className={styles.specBadge}>{specs.year}</span>}
          {specs.mileage !== undefined && (
            <span className={styles.specBadge}>{Number(specs.mileage).toLocaleString()} km</span>
          )}
          {specs.specs && <span className={styles.specBadge}>{specs.specs}</span>}
        </>
      );
    }
    if (slug === 'property-for-sale' || slug === 'property-for-rent') {
      return (
        <>
          {specs.bedrooms !== undefined && <span className={styles.specBadge}>{specs.bedrooms} Bed</span>}
          {specs.bathrooms !== undefined && <span className={styles.specBadge}>{specs.bathrooms} Bath</span>}
          {specs.size && <span className={styles.specBadge}>{specs.size} sqft</span>}
          {specs.type && <span className={styles.specBadge}>{specs.type}</span>}
        </>
      );
    }
    if (slug === 'jobs') {
      return (
        <>
          {specs.job_type && <span className={styles.specBadge}>{specs.job_type}</span>}
          {specs.experience && <span className={styles.specBadge}>{specs.experience} exp</span>}
        </>
      );
    }
    if (slug === 'classifieds') {
      return (
        <>
          {specs.condition && <span className={styles.specBadge}>{specs.condition}</span>}
          {specs.color && <span className={styles.specBadge}>{specs.color}</span>}
        </>
      );
    }
    return null;
  };

  // Format date
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <article className={styles.card}>
      <Link href={listingHref} className={styles.cardMain} aria-label={`View ${listing.title}`}>
        <div className={styles.imageWrapper}>
          <img
            src={getImageUrl(listing.image_url || listing.images_urls?.[0])}
            alt={listing.title}
            className={styles.image}
            loading="lazy"
            onError={handleImageError}
          />
          <span className={styles.categoryBadge}>
            {listing.category_name}
          </span>
        </div>

        <div className={styles.content}>
          <div className={styles.price}>
            {formatPrice(listing.price, listing.category_slug)}
          </div>
          <h3 className={styles.title} title={listing.title}>
            {listing.title}
          </h3>

          <div className={styles.specs}>
            {renderSpecs()}
          </div>

          <div className={styles.footer}>
            <span className={styles.location} title={listing.location}>
              📍 {String(listing.location || 'India').split(',')[0]}
            </span>
            <span className={styles.date}>
              {formatDate(listing.created_at)}
            </span>
          </div>
        </div>
      </Link>

      <div className={styles.cardActions}>
        {isOwner ? (
          <Link href="/chat" className={styles.chatCta}>
            <span aria-hidden="true">💬</span> View buyer messages
          </Link>
        ) : (
          <Link href={`${listingHref}#seller-contact`} className={styles.chatCta}>
            <span aria-hidden="true">💬</span> Chat with seller
          </Link>
        )}
      </div>
    </article>
  );
}
