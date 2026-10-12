'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function PricingPlans() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect if logged out
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/pricing-plans');
    }
  }, [user, loading, router]);

  const handleUpgrade = async () => {
    if (!user) return;
    try {
      setUpgrading(true);
      setError('');
      await api.upgradeSubscription();
      // Refetch user context so the app knows the user is premium
      const freshUser = await api.getMe();
      api.setCurrentUser(freshUser);
      setSuccess(true);
      setTimeout(() => {
        router.push('/post-ad');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Upgrade failed. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // Styles structured inline to respect guardrails and enforce premium look
  const containerStyle = {
    padding: '60px 20px 100px 20px',
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center'
  };

  const titleStyle = {
    fontSize: '2.5rem',
    fontWeight: '850',
    color: 'var(--text-dark)',
    marginBottom: '12px'
  };

  const subtitleStyle = {
    fontSize: '1.1rem',
    color: 'var(--text-light)',
    marginBottom: '50px',
    maxWidth: '600px',
    margin: '0 auto 50px auto',
    lineHeight: '1.6'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginTop: '20px'
  };

  const cardStyle = (isPopular) => ({
    backgroundColor: 'white',
    border: isPopular ? '2px solid var(--primary)' : '1px solid var(--border-color)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 30px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: isPopular ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
    transition: 'all 0.3s ease',
    transform: isPopular ? 'scale(1.03)' : 'none'
  });

  const popularBadgeStyle = {
    position: 'absolute',
    top: '-15px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const tierNameStyle = {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-dark)',
    marginBottom: '15px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const priceWrapperStyle = {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: '30px'
  };

  const currencyStyle = {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--text-dark)',
    marginRight: '2px'
  };

  const amountStyle = {
    fontSize: '3rem',
    fontWeight: '850',
    color: 'var(--text-dark)'
  };

  const periodStyle = {
    color: 'var(--text-light)',
    fontSize: '0.95rem',
    marginLeft: '6px'
  };

  const featureListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 40px 0',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    textAlign: 'left'
  };

  const featureItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.95rem',
    color: 'var(--text-main)'
  };

  const checkIconStyle = (active) => ({
    color: active ? '#10b981' : 'var(--text-light)',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  });

  const actionBtnStyle = (isPopular) => ({
    width: '100%',
    padding: '14px 20px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontWeight: '800',
    fontSize: '1rem',
    cursor: 'pointer',
    backgroundColor: isPopular ? 'var(--primary)' : '#f1f5f9',
    color: isPopular ? 'white' : 'var(--text-dark)',
    boxShadow: isPopular ? '0 4px 12px rgba(0, 75, 191, 0.25)' : 'none',
    transition: 'all 0.2s ease',
    marginTop: 'auto'
  });

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh' }}>
      <div style={containerStyle}>

        {success ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '60px 40px',
            maxWidth: '500px',
            margin: '60px auto 0 auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ fontSize: '4rem', color: '#10b981', marginBottom: '24px' }}>✓</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '850', color: 'var(--text-dark)', marginBottom: '12px' }}>Upgrade Successful!</h2>
            <p style={{ color: 'var(--text-light)', lineHeight: '1.5', marginBottom: '0' }}>
              Your account has been upgraded to the Premium Tier. Redirecting you to post your ad...
            </p>
          </div>
        ) : (
          <>
            <h1 style={titleStyle}>Upgrade to Premium Posting</h1>
            <p style={subtitleStyle}>
              Unlock unlimited listings, urgent ad highlighting, and 10x buyers reach. Continue selling and finding leads instantly across India.
            </p>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: 'var(--error)',
                padding: '14px 20px',
                borderRadius: 'var(--radius-md)',
                maxWidth: '600px',
                margin: '0 auto 30px auto',
                fontWeight: '600'
              }}>
                {error}
              </div>
            )}

            <div style={gridStyle}>
              {/* Free Tier Card */}
              <div style={cardStyle(false)}>
                <h3 style={tierNameStyle}>Free Tier</h3>
                <div style={priceWrapperStyle}>
                  <span style={currencyStyle}>Rs.</span>
                  <span style={amountStyle}>0</span>
                  <span style={periodStyle}>/ forever</span>
                </div>
                <ul style={featureListStyle}>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Limit of 3 free ad posts
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Standard 30 days active listing
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(false)}>✗</span> No featured or urgent badges
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(false)}>✗</span> Standard search index reach
                  </li>
                </ul>
                <button disabled style={{ ...actionBtnStyle(false), cursor: 'not-allowed', opacity: '0.65' }}>
                  Current Quota Plan
                </button>
              </div>

              {/* Premium Tier Card */}
              <div style={cardStyle(true)}>
                <div style={popularBadgeStyle}>Most Popular</div>
                <h3 style={tierNameStyle}>Premium Plan</h3>
                <div style={priceWrapperStyle}>
                  <span style={currencyStyle}>Rs.</span>
                  <span style={amountStyle}>999</span>
                  <span style={periodStyle}>/ month</span>
                </div>
                <ul style={featureListStyle}>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> <strong>Unlimited</strong> active listings
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Instant approval priority queue
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Highlighted Urgent badges
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> 10x higher buyer visibility reach
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  style={actionBtnStyle(true)}
                  onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.backgroundColor = 'var(--primary-hover)'; }}
                  onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.backgroundColor = 'var(--primary)'; }}
                >
                  {upgrading ? 'Upgrading Account...' : 'Upgrade Now'}
                </button>
              </div>

              {/* Business Tier Card */}
              <div style={cardStyle(false)}>
                <h3 style={tierNameStyle}>Business</h3>
                <div style={priceWrapperStyle}>
                  <span style={currencyStyle}>Rs.</span>
                  <span style={amountStyle}>2,499</span>
                  <span style={periodStyle}>/ month</span>
                </div>
                <ul style={featureListStyle}>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Everything in Premium plan
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Automated ad renewals
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> Custom dealer business profile
                  </li>
                  <li style={featureItemStyle}>
                    <span style={checkIconStyle(true)}>✓</span> 24/7 priority phone support
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  style={actionBtnStyle(false)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                >
                  Choose Business
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
