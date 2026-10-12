import React from 'react';
import ListingDetailClient from '../../../components/ListingDetailClient';

// Server-side fetching helper
async function getListingData(id) {
  try {
    const res = await fetch(`${(process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '')}/listings/${encodeURIComponent(id)}`, {
      cache: 'no-store' // Keep it fresh
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.listing;
  } catch (e) {
    console.error('Failed to fetch listing on server:', e);
    return null;
  }
}

// 1. Dynamic SEO Metadata Generation for Google Crawlers
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const listing = await getListingData(id);

  if (!listing) {
    return {
      title: 'Ad Details | Addsgo',
      description: 'View listing details on Addsgo India.'
    };
  }

  const locationCity = String(listing.location || 'India').split(',')[0];
  const shortDescription = String(listing.description || '').length > 155
    ? `${String(listing.description || '').substring(0, 152)}...`
    : listing.description;

  return {
    title: `${listing.title} for Sale in ${locationCity} | Addsgo`,
    description: `Buy ${listing.title} in ${listing.location} online. Price: Rs. ${listing.price.toLocaleString()}. ${shortDescription}`,
    openGraph: {
      title: `${listing.title} - Addsgo`,
      description: shortDescription,
      type: 'website',
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/listing/${id}`,
      images: [
        {
          url: listing.image_url && listing.image_url.startsWith('http')
            ? listing.image_url
            : `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}${listing.image_url || '/placeholder-classified.svg'}`,
          width: 800,
          height: 600,
          alt: listing.title,
        }
      ]
    }
  };
}

// 2. Server Component Page Route
export default async function Page({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const listing = await getListingData(id);

  if (!listing) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ color: 'var(--error)', marginBottom: '16px' }}>Ad Not Found</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>The listing you are trying to view does not exist or has been deleted.</p>
        <a href="/search" style={{ display: 'inline-block', backgroundColor: '#004bbf', color: 'white', padding: '10px 20px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
          Browse Other Listings
        </a>
      </div>
    );
  }

  return <ListingDetailClient initialListing={listing} />;
}
