'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../utils/api';
import ListingCard from '../../components/ListingCard';
import styles from './page.module.css';

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract filters from the URL
  const category = searchParams.get('category') || '';
  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // Fetch categories once on component mount for the sidebar dropdown
  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch(err => console.error("Error loading categories:", err));
  }, []);

  // Fetch listings whenever any filter in the URL changes
  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (category) params.category = category;
        if (query) params.q = query;
        if (location) params.location = location;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;

        const data = await api.getListings(params);
        setListings(data);
      } catch (err) {
        console.error("Error fetching listings:", err);
        setError('Failed to load listings. Make sure the backend is active.');
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [category, query, location, minPrice, maxPrice]);

  // Get only parent categories for the sidebar dropdown
  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <div className={styles.container}>
      <div className="container">
        {/* Search Header */}
        <div className={styles.searchHeader}>
          <h1>Search Results</h1>
          {query && <p>Showing results for &quot;{query}&quot;</p>}
        </div>

        <div className={styles.layout}>
          {/* Sidebar Filters */}
          <aside className={styles.sidebar}>
            <h3>Filter Results</h3>

            {/* Category Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Category</label>
              <select
                className={styles.select}
                value={category}
                onChange={(e) => {
                  const params = new URLSearchParams(searchParams);
                  if (e.target.value) params.set('category', e.target.value);
                  else params.delete('category');
                  router.push(`/search?${params.toString()}`);
                }}
              >
                <option value="">All Categories</option>
                {parentCategories.map(cat => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Price Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Price (INR)</label>
              <div className={styles.rangeInputs}>
                <input
                  className={styles.rangeInput}
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) params.set('minPrice', e.target.value);
                    else params.delete('minPrice');
                    router.push(`/search?${params.toString()}`);
                  }}
                />
                <input
                  className={styles.rangeInput}
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) params.set('maxPrice', e.target.value);
                    else params.delete('maxPrice');
                    router.push(`/search?${params.toString()}`);
                  }}
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <button
              className={styles.clearBtn}
              onClick={() => router.push('/search')}
            >
              Clear All Filters
            </button>
          </aside>

          {/* Results Grid */}
          <main className={styles.results}>
            <div className={styles.resultsHeader}>
              <span>Showing {listings.length} listings found</span>
            </div>

            {loading ? (
              <div className={styles.loading}>Loading listings...</div>
            ) : error ? (
              <div className={styles.error} style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>
                {error}
              </div>
            ) : listings.length === 0 ? (
              <div className={styles.noResults}>
                <p>No listings found matching your criteria.</p>
                <button onClick={() => router.push('/search')}>Clear Filters</button>
              </div>
            ) : (
              <div className={styles.grid}>
                {listings.map((item) => (
                  <ListingCard key={item.id} listing={item} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading search...</div>}>
      <SearchResults />
    </Suspense>
  );
}