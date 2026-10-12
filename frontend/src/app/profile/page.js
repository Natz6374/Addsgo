'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import ListingCard from '../../components/ListingCard';
import styles from './page.module.css';

export default function Profile() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [myListings, setMyListings] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  // Auth protection redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, loading, router]);

  // Load user's listings
  useEffect(() => {
    if (!user) return;
    async function loadMyListings() {
      try {
        setFetching(true);
        const data = await api.getListings({ user_id: user.id });
        setMyListings(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch your listings.');
      } finally {
        setFetching(false);
      }
    }
    loadMyListings();
  }, [user]);

  const handleDeleteListing = async (e, listingId) => {
    // Stop event bubble so it doesn't click open card details page
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this listing permanently?')) {
      return;
    }

    try {
      await api.deleteListing(listingId);
      // Remove from list
      setMyListings((prev) => prev.filter((item) => item.id !== listingId));
    } catch (err) {
      console.error(err);
      alert('Could not delete listing: ' + err.message);
    }
  };

  if (loading || !user) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        </div>
      </div>
    );
  }

  const getJoinedYear = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <div className="container">
        <div className={styles.layout}>
          {/* Sidebar Account info */}
          <aside className={styles.profileCard}>
            <div className={styles.avatar}>
              {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <h3 className={styles.name}>{user.full_name}</h3>
            <span className={styles.email}>{user.email}</span>

            <div className={styles.statsBox}>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Member Since</span>
                <span className={styles.statValue}>{getJoinedYear(user.created_at)}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Phone</span>
                <span className={styles.statValue}>{user.phone || 'Not Provided'}</span>
              </div>
              <div className={styles.statRow}>
                <span className={styles.statLabel}>Active Ads</span>
                <span className={styles.statValue}>{myListings.length} ads</span>
              </div>
            </div>

            <button onClick={logout} className="btn btn-outline" style={{ marginTop: '24px', width: '100%', borderColor: 'var(--error)', color: 'var(--error)' }}>
              Logout
            </button>
          </aside>

          {/* Listings Management */}
          <main className={styles.mainContent}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Manage My Ads</h2>
            </div>

            {fetching ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-light)' }}>
                <div style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                Loading your listings...
              </div>
            ) : error ? (
              <div style={{ color: 'var(--error)', padding: '20px', textAlign: 'center' }}>{error}</div>
            ) : myListings.length === 0 ? (
              <div className={styles.noAds}>
                <div className={styles.noAdsIcon}>📦</div>
                <h3 className={styles.noAdsTitle}>You have not posted any ads yet</h3>
                <p style={{ marginBottom: '20px' }}>Sell your car, phone, or find a tenant by listing with us!</p>
                <button onClick={() => router.push('/post-ad')} className="btn btn-primary">
                  Place an Ad Now
                </button>
              </div>
            ) : (
              <div className={styles.grid}>
                {myListings.map((item) => {
                  const getStatusStyle = (status) => {
                    let backgroundColor = '#f59e0b';
                    if (status === 'approved') backgroundColor = '#10b981';
                    else if (status === 'rejected') backgroundColor = '#ef4444';
                    else if (status === 'expired') backgroundColor = '#6b7280';
                    return {
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      zIndex: 10,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      color: 'white',
                      backgroundColor,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                    };
                  };

                  return (
                    <div key={item.id} style={{ position: 'relative' }}>
                      <div className={styles.cardContainer}>
                        <div style={getStatusStyle(item.status)}>
                          {item.status}
                        </div>
                        <button
                          onClick={(e) => handleDeleteListing(e, item.id)}
                          className={styles.deleteBtn}
                          title="Delete Listing"
                        >
                          🗑️
                        </button>
                        <ListingCard listing={item} />
                      </div>
                      {item.status === 'rejected' && item.rejection_reason && (
                        <div style={{
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c',
                          padding: '8px 12px',
                          fontSize: '0.8rem',
                          borderRadius: 'var(--radius-md)',
                          marginTop: '8px',
                          border: '1px solid #fecaca',
                          fontWeight: '600'
                        }}>
                          <strong>Rejection Reason:</strong> {item.rejection_reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            )}
          </main>
        </div>
      </div>
    </div>
  );
}
