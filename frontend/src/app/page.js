'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../utils/api';
import ListingCard from '../components/ListingCard';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Hero Search Tab State
  const [activeTab, setActiveTab] = useState('Motor');

  // Dashboard Trending Ads Tab State
  const [dashboardTab, setDashboardTab] = useState('motors');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const searchTabs = [
    { name: 'Motor', slug: 'motors' },
    { name: 'Property for rent', slug: 'property-for-rent' },
    { name: 'Property for sale', slug: 'property-for-sale' },
    { name: 'Rooms for rent', slug: 'rooms-for-rent' },
    { name: 'Jobs', slug: 'jobs' },
    { name: 'Classifieds', slug: 'classifieds' }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch categories once
        const catsData = await api.getCategories();
        setCategories(catsData);

        // Fetch listings based on the active dashboard tab
        const listingsData = await api.getListings({ category: dashboardTab });
        setListings(listingsData.slice(0, 8)); // Show top 8
      } catch (err) {
        console.error('Error fetching home data:', err);
        setError('Could not load content. Please make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dashboardTab]); // Re-fetch when dashboardTab changes

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const currentTab = searchTabs.find(t => t.name === activeTab);
    const categoryQuery = currentTab && currentTab.slug ? `category=${currentTab.slug}` : '';
    const textQuery = searchQuery.trim() ? `q=${encodeURIComponent(searchQuery.trim())}` : '';
    const queries = [categoryQuery, textQuery].filter(Boolean).join('&');
    router.push(queries ? `/search?${queries}` : '/search');
  };

  return (
    <div className={styles.mainContainer}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>The best place to buy your house, sell your car or find a job in India</h1>

          <div className={styles.searchConsole}>
            <div className={styles.searchTabsRow}>
              {searchTabs.map((tab) => (
                <button
                  key={tab.name}
                  type="button"
                  onClick={() => setActiveTab(tab.name)}
                  className={`${styles.searchTab} ${activeTab === tab.name ? styles.activeSearchTab : ''}`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder={`Search for ${activeTab.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
                <svg className={styles.searchGlassIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <button type="submit" className={styles.searchButton}>Search</button>
            </form>
          </div>
        </div>
      </section>

      {/* Promos Section */}
      <section className={styles.promoSection}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner 1 */}
            <div className={styles.wideBanner}>
              <div className={styles.bannerContent}>
                <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=150&q=80" alt="Property value" className={styles.bannerImage} />
                <div className={styles.bannerText}>
                  <h3>Know Your Property Value Instantly with TruEstimate™</h3>
                  <p>Generate a TruEstimate™ report with reliable property valuations and insights.</p>
                </div>
              </div>
              <button className={styles.bannerBtn}>Get Your TruEstimate™ &rarr;</button>
            </div>

            {/* Banner 2 */}
            <div className={`${styles.wideBanner} ${styles.sellRentBanner}`}>
              <div className={styles.bannerContent}>
                <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80" alt="Sell your home" className={styles.bannerImage} />
                <div className={styles.bannerText}>
                  <h3>Looking to sell or rent your home?</h3>
                  <p>Reach more buyers or renters through an expert agent.</p>
                </div>
              </div>
              <button className={styles.bannerBtnOutline}>Get started now &rarr;</button>
            </div>

            {/* Banner 3 */}
            <div className={styles.gridPromo}>
              <div className={styles.promoCard}>
                <div className={styles.promoCardContent}>
                  <div>
                    <h3>Book your perfect stay on Addsgo</h3>
                    <p>Introducing Holiday Homes!</p>
                  </div>
                  <button className={styles.promoCardBtn}>Explore Now &rsaquo;</button>
                </div>
                <img src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80" alt="Holiday Homes" className={styles.promoCardImage} />
              </div>
              <div className={styles.promoCard}>
                <div className={styles.promoCardContent}>
                  <div>
                    <h3>Discover Agents and Agencies!</h3>
                    <p>Connect with our partners to find your ideal home!</p>
                  </div>
                  <button className={styles.promoCardBtn}>Browse Now &rsaquo;</button>
                </div>
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80" alt="Agents" className={styles.promoCardImage} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid Section */}
      <section className={styles.categoriesSection}>
        <div className="container">
          <h2 className={styles.categoriesTitle}>Explore Categories</h2>
          <div className={styles.categoriesGrid}>
            {categories.filter(cat => !cat.parent_id).map((cat) => (
              <Link href={`/search?category=${cat.slug}`} key={cat.id} className={styles.categoryCard}>
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span className={styles.categoryName}>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Listings Section with Dashboard Tabs */}
      <section className={styles.listingsSection}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Trending Ads</h2>
            </div>
            <Link href="/search" className={styles.viewAllLink}>View All Ads &rarr;</Link>
          </div>

          {/* Dashboard Category Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '10px' }}>
            {searchTabs.map((tab) => (
              <button
                key={tab.slug}
                onClick={() => setDashboardTab(tab.slug)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: dashboardTab === tab.slug ? 'var(--primary)' : 'white',
                  color: dashboardTab === tab.slug ? 'white' : 'var(--text-dark)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading {dashboardTab} listings...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--error)', fontWeight: 'bold' }}>{error}</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
              No listings found in this category. Be the first to place an ad!
            </div>
          ) : (
            <div className={styles.listingsGrid}>
              {listings.map((item) => (
                <div key={item.id} className="animate-fade-in">
                  <ListingCard listing={item} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}