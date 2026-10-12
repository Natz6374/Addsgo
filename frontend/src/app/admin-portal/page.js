'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function AdminPortal() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('pending'); // pending, active, users
  const [pendingListings, setPendingListings] = useState([]);
  const [activeListings, setActiveListings] = useState([]);
  const [users, setUsers] = useState([]);

  const [fetchingPending, setFetchingPending] = useState(true);
  const [fetchingActive, setFetchingActive] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');

  // Protect route
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login?redirect=/admin-portal');
      }
    }
  }, [user, loading, router]);

  const loadPending = async () => {
    try {
      setFetchingPending(true);
      setError('');
      const data = await api.getPendingListings();
      setPendingListings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch pending moderation queue.');
    } finally {
      setFetchingPending(false);
    }
  };

  const loadActive = async () => {
    try {
      setFetchingActive(true);
      setError('');
      // Querying normal listings without filtering by user_id returns active approved listings
      const data = await api.getListings();
      setActiveListings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch active listings.');
    } finally {
      setFetchingActive(false);
    }
  };

  const loadUsers = async () => {
    try {
      setFetchingUsers(true);
      setError('');
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch users list.');
    } finally {
      setFetchingUsers(false);
    }
  };

  // Defer tab loading out of the effect's synchronous phase and cancel stale runs.
  useEffect(() => {
    if (!user || user.role !== 'admin') return undefined;
    const timer = setTimeout(() => {
      if (activeTab === 'pending') loadPending();
      else if (activeTab === 'active') loadActive();
      else if (activeTab === 'users') loadUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [user, activeTab]);

  const handleApprove = async (id) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.approveListing(id);
      setSuccessMsg('Ad listing approved and published!');
      // Remove from pending list
      setPendingListings(prev => prev.filter(item => item.id !== id));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Approval failed');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    try {
      setError('');
      setSuccessMsg('');
      await api.rejectListing(rejectId, rejectReason.trim());
      setSuccessMsg('Ad listing rejected and status updated.');
      setPendingListings(prev => prev.filter(item => item.id !== rejectId));
      setRejectId(null);
      setRejectReason('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Rejection failed');
    }
  };

  const handleTakedown = async (id) => {
    if (!confirm('Are you sure you want to permanently take down this listing?')) return;

    try {
      setError('');
      setSuccessMsg('');
      await api.takedownListing(id);
      setSuccessMsg('Listing taken down successfully!');
      setActiveListings(prev => prev.filter(item => item.id !== id));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Takedown failed');
    }
  };

  const handleToggleBan = async (id) => {
    try {
      setError('');
      setSuccessMsg('');
      await api.toggleBanUser(id);
      setSuccessMsg('User status updated successfully.');
      loadUsers(); // Refresh users list
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to toggle ban status');
    }
  };

  const getImageUrl = (url) => {
    if (!url) return '/placeholder_classifieds.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    return (
      <div style={{ padding: '80px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: '3rem', color: 'var(--error)', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-dark)', marginBottom: '12px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-light)', lineHeight: '1.6', marginBottom: '24px' }}>Access Denied: You do not have permissions to view the Admin Portal.</p>
        <button onClick={() => router.push('/')} style={{ backgroundColor: 'var(--primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
          Back to Homepage
        </button>
      </div>
    );
  }

  // Styles structured inline to respect guardrails
  const containerStyle = {
    padding: '40px 20px 80px 20px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '15px'
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '850',
    color: 'var(--text-dark)',
    margin: 0
  };

  const tabContainerStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '30px'
  };

  const tabStyle = (active) => ({
    padding: '10px 20px',
    borderRadius: 'var(--radius-md)',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: active ? 'var(--primary)' : 'white',
    color: active ? 'white' : 'var(--text-main)',
    border: active ? 'none' : '1px solid var(--border-color)',
    boxShadow: active ? '0 4px 10px rgba(0, 75, 191, 0.2)' : 'none',
    transition: 'all 0.2s'
  });

  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: 'var(--shadow-sm)',
    display: 'grid',
    gridTemplateColumns: '150px 1fr fit-content(200px)',
    gap: '24px',
    alignItems: 'start'
  };

  const imgStyle = {
    width: '150px',
    height: '110px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)'
  };

  const adTitleStyle = {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: 'var(--text-dark)',
    margin: '0 0 6px 0'
  };

  const priceStyle = {
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--primary)',
    marginBottom: '8px'
  };

  const metaStyle = {
    fontSize: '0.85rem',
    color: 'var(--text-light)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    marginBottom: '8px'
  };

  const descStyle = {
    fontSize: '0.9rem',
    color: 'var(--text-main)',
    lineHeight: '1.5',
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  };

  const actionColStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    justifyContent: 'center',
    height: '100%'
  };

  const successAlertStyle = {
    backgroundColor: '#d1fae5',
    border: '1px solid #a7f3d0',
    color: '#047857',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    marginBottom: '24px',
    fontWeight: '600'
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
      <div style={containerStyle}>

        {/* Portal Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Addsgo Admin Control Portal</h1>
            <p style={{ color: 'var(--text-light)', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
              Moderate active listings, review pending ads, and manage user registry accounts.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="btn btn-outline"
            style={{ fontSize: '0.9rem' }}
          >
            Exit Portal
          </button>
        </div>

        {successMsg && <div style={successAlertStyle}>{successMsg}</div>}

        {/* Tab Controls */}
        <div style={tabContainerStyle}>
          <button
            onClick={() => setActiveTab('pending')}
            style={tabStyle(activeTab === 'pending')}
          >
            Pending Ads ({pendingListings.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            style={tabStyle(activeTab === 'active')}
          >
            Active Directory
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={tabStyle(activeTab === 'users')}
          >
            Users Registry
          </button>
        </div>

        {/* PENDING MODERATION QUEUE TAB */}
        {activeTab === 'pending' && (
          <div>
            {fetchingPending ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-light)' }}>
                <div style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                Loading queue...
              </div>
            ) : pendingListings.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '60px 30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎉</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-dark)', margin: '0 0 6px 0' }}>Queue Clean!</h3>
                <p style={{ color: 'var(--text-light)', margin: 0 }}>There are no pending listings awaiting approval at this time.</p>
              </div>
            ) : (
              <div>
                {pendingListings.map(item => (
                  <div key={item.id} style={cardStyle}>
                    <img
                      src={getImageUrl(item.image_url)}
                      alt={item.title}
                      style={imgStyle}
                    />
                    <div>
                      <h3 style={adTitleStyle}>{item.title}</h3>
                      <div style={priceStyle}>Rs. {item.price.toLocaleString()}</div>
                      <div style={metaStyle}>
                        <span>📍 {item.location}</span>
                        <span>🏷️ {item.category_name}</span>
                        <span>👤 Seller: {item.seller_name} ({item.seller_email})</span>
                      </div>
                      <p style={descStyle}>{item.description}</p>
                    </div>

                    <div style={actionColStyle}>
                      <button
                        onClick={() => handleApprove(item.id)}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem', width: '120px' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectId(item.id)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', width: '120px', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE DIRECTORY TAB */}
        {activeTab === 'active' && (
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Search active listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />
            </div>

            {fetchingActive ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-light)' }}>
                <div style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                Loading active directory...
              </div>
            ) : activeListings.length === 0 ? (
              <div style={{ backgroundColor: 'white', padding: '60px 30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-light)', margin: 0 }}>No active listings found.</p>
              </div>
            ) : (
              <div>
                {activeListings
                  .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.location.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div key={item.id} style={cardStyle}>
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.title}
                        style={imgStyle}
                      />
                      <div>
                        <h3 style={adTitleStyle}>{item.title}</h3>
                        <div style={priceStyle}>Rs. {item.price.toLocaleString()}</div>
                        <div style={metaStyle}>
                          <span>📍 {item.location}</span>
                          <span>🏷️ {item.category_name}</span>
                          <span>👤 Seller: {item.seller_name}</span>
                        </div>
                        <p style={descStyle}>{item.description}</p>
                      </div>

                      <div style={actionColStyle}>
                        <button
                          onClick={() => handleTakedown(item.id)}
                          style={{ padding: '8px 16px', fontSize: '0.85rem', width: '120px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Take Down
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* USERS REGISTRY TAB */}
        {activeTab === 'users' && (
          <div>
            {fetchingUsers ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-light)' }}>
                <div style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }}></div>
                Loading user registry...
              </div>
            ) : (
              <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Name</th>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Email</th>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Phone</th>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Role</th>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Subscription</th>
                      <th style={{ padding: '16px 20px', fontWeight: '800', color: 'var(--text-dark)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const isBanned = u.role === 'banned';
                      const hasSub = u.subscription_end_date && new Date(u.subscription_end_date) > new Date();

                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 20px', fontWeight: '700', color: 'var(--text-dark)' }}>{u.full_name}</td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-main)' }}>{u.email}</td>
                          <td style={{ padding: '16px 20px', color: 'var(--text-main)' }}>{u.phone || 'N/A'}</td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              backgroundColor: isBanned ? '#fee2e2' : u.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                              color: isBanned ? '#ef4444' : u.role === 'admin' ? 'var(--primary)' : 'var(--text-main)'
                            }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              backgroundColor: hasSub ? '#d1fae5' : '#f1f5f9',
                              color: hasSub ? '#10b981' : 'var(--text-light)'
                            }}>
                              {hasSub ? 'Premium Active' : 'Free Tier'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {u.role !== 'admin' ? (
                              <button
                                onClick={() => handleToggleBan(u.id)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  backgroundColor: isBanned ? '#10b981' : '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                {isBanned ? 'Activate' : 'Suspend'}
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: '600' }}>Admin Account</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reject Dialog overlay */}
        {rejectId && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
            <form onSubmit={handleRejectSubmit} style={{ backgroundColor: 'white', padding: '30px', borderRadius: 'var(--radius-lg)', maxWidth: '450px', width: '90%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '12px' }}>Reject Listing</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '20px', lineHeight: '1.4' }}>
                Please provide a clear reason for rejecting this listing. This feedback will be displayed to the seller on their dashboard.
              </p>

              <textarea
                placeholder="e.g. Inappropriate images, incorrect price, incomplete description"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none',
                  marginBottom: '20px'
                }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectReason(''); }}
                  style={{ padding: '10px 18px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
