'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import styles from './page.module.css';

export default function PostAd() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Categories list
  const [categories, setCategories] = useState([]);

  // Common Form States
  const [parentCategorySlug, setParentCategorySlug] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Bandra West, Mumbai');
  const [phoneVisible, setPhoneVisible] = useState(true);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageNames, setImageNames] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Category Specific Spec States
  // Motors
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [color, setColor] = useState('');
  const [specs, setSpecs] = useState('GCC');

  // Properties
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [size, setSize] = useState('');
  const [propType, setPropType] = useState('Apartment');
  const [furnishing, setFurnishing] = useState('Furnished');

  // Jobs
  const [jobType, setJobType] = useState('Full-Time');
  const [experience, setExperience] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [company, setCompany] = useState('');

  // Classifieds
  const [condition, setCondition] = useState('Like New');
  const [itemColor, setItemColor] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Authenticate user check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/post-ad');
    }
  }, [user, loading, router]);

  // Load categories
  useEffect(() => {
    api.getCategories()
      .then(setCategories)
      .catch(err => console.error('Error loading categories', err));
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 5); // Support up to 5 images
    if (files.length > 0) {
      setImageFiles(files);
      setImageNames(files.map(f => f.name).join(', '));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !price || !location || !categorySlug) {
      setError('Please fill in all general listing details');
      return;
    }

    try {
      setError('');
      setSubmitting(true);

      // Collect specific specifications depending on parent category
      const specFields = {};
      if (parentCategorySlug === 'motors') {
        specFields.make = make;
        specFields.model = model;
        specFields.year = parseInt(year) || '';
        specFields.mileage = parseInt(mileage) || 0;
        specFields.color = color;
        specFields.specs = specs;
      } else if (parentCategorySlug === 'property-for-sale' || parentCategorySlug === 'property-for-rent' || parentCategorySlug === 'rooms-for-rent') {
        specFields.bedrooms = parseInt(bedrooms) || 0;
        specFields.bathrooms = parseInt(bathrooms) || 0;
        specFields.size = parseInt(size) || '';
        specFields.type = propType;
        specFields.furnishing = furnishing;
      } else if (parentCategorySlug === 'jobs') {
        specFields.job_type = jobType;
        specFields.experience = experience;
        specFields.salary_range = salaryRange;
        specFields.company = company;
      } else if (parentCategorySlug === 'classifieds') {
        specFields.condition = condition;
        specFields.color = itemColor;
      }

      // Build Multipart Form Data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('location', location);
      formData.append('category_slug', categorySlug);
      formData.append('phone_visible', phoneVisible ? '1' : '0');
      formData.append('category_fields', JSON.stringify(specFields));

      if (imageFiles.length > 0) {
        imageFiles.forEach(file => {
          formData.append('images', file);
        });
      }

      const result = await api.createListing(formData);
      setSuccessMessage(
        result.message || 'Your ad has been created successfully.'
      );
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      if (err.message.includes('/pricing-plans') || err.message.includes('pricing') || err.message.includes('quota')) {
        router.push('/pricing-plans');
      } else {
        setError(err.message || 'Failed to post listing. Please try again.');
      }
    } finally {
      setSubmitting(false);
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

  // Inline styles for Modal to respect guardrails
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 10000,
    backdropFilter: 'blur(4px)'
  };

  const modalContentStyle = {
    backgroundColor: 'white', padding: '40px', borderRadius: 'var(--radius-lg)',
    maxWidth: '480px', width: '90%', textAlign: 'center',
    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)'
  };

  const modalIconStyle = { fontSize: '3rem', color: '#10b981', marginBottom: '20px' };
  const modalTitleStyle = { fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '10px' };
  const modalMessageStyle = { fontSize: '0.95rem', color: 'var(--text-light)', marginBottom: '30px', lineHeight: '1.5' };
  const modalBtnStyle = {
    backgroundColor: 'var(--primary)', color: 'white', border: 'none',
    padding: '12px 24px', borderRadius: 'var(--radius-md)', fontWeight: 'bold',
    cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 10px rgba(0, 75, 191, 0.25)'
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h2 className={styles.title}>Place An Ad</h2>
        <p className={styles.subtitle}>List your car, home, job, or item for free in India</p>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 1. Parent Category Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Choose a Category *</label>
            <select
              value={parentCategorySlug}
              onChange={(e) => {
                setParentCategorySlug(e.target.value);
                setCategorySlug('');
              }}
              className={styles.select}
              required
            >
              <option value="">Select Category</option>
              {categories.filter(cat => !cat.parent_id).map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sub-Category Selection */}
          {parentCategorySlug && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Choose a Sub-category *</label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className={styles.select}
                required
              >
                <option value="">Select Sub-category</option>
                {categories
                  .filter(cat => {
                    const parent = categories.find(p => p.slug === parentCategorySlug);
                    return parent && cat.parent_id === parent.id;
                  })
                  .map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))
                }
              </select>
            </div>
          )}

          {/* Conditional Specifications */}
          {parentCategorySlug && <h3 className={styles.sectionTitle}>Ad Specifications</h3>}

          {/* Motors Specs */}
          {parentCategorySlug === 'motors' && (
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Make *</label>
                <select value={make} onChange={(e) => setMake(e.target.value)} className={styles.select}>
                  <option value="Toyota">Toyota</option>
                  <option value="Mercedes-Benz">Mercedes-Benz</option>
                  <option value="Nissan">Nissan</option>
                  <option value="BMW">BMW</option>
                  <option value="Ford">Ford</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Model Name *</label>
                <input type="text" placeholder="e.g. Camry, G63, Altima" value={model} onChange={(e) => setModel(e.target.value)} className={styles.input} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Year *</label>
                <input type="number" placeholder="e.g. 2021" value={year} onChange={(e) => setYear(e.target.value)} className={styles.input} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Mileage (km) *</label>
                <input type="number" placeholder="e.g. 45000" value={mileage} onChange={(e) => setMileage(e.target.value)} className={styles.input} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Regional Specs</label>
                <select value={specs} onChange={(e) => setSpecs(e.target.value)} className={styles.select}>
                  <option value="GCC">GCC Specs</option>
                  <option value="American">American Specs</option>
                  <option value="Canadian">Canadian Specs</option>
                  <option value="European">European Specs</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Color</label>
                <input type="text" placeholder="e.g. White, Black, Red" value={color} onChange={(e) => setColor(e.target.value)} className={styles.input} />
              </div>
            </div>
          )}

          {/* Properties Specs */}
          {(parentCategorySlug === 'property-for-sale' || parentCategorySlug === 'property-for-rent' || parentCategorySlug === 'rooms-for-rent') && (
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Bedrooms *</label>
                <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={styles.select}>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3 Bedrooms</option>
                  <option value="4">4+ Bedrooms</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Bathrooms *</label>
                <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={styles.select}>
                  <option value="1">1 Bathroom</option>
                  <option value="2">2 Bathrooms</option>
                  <option value="3">3 Bathrooms</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Property Size (sqft) *</label>
                <input type="number" placeholder="e.g. 1200" value={size} onChange={(e) => setSize(e.target.value)} className={styles.input} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Property Type</label>
                <select value={propType} onChange={(e) => setPropType(e.target.value)} className={styles.select}>
                  <option value="Apartment">Apartment</option>
                  <option value="Villa">Villa</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Furnishing</label>
                <select value={furnishing} onChange={(e) => setFurnishing(e.target.value)} className={styles.select}>
                  <option value="Furnished">Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>
          )}

          {/* Jobs Specs */}
          {parentCategorySlug === 'jobs' && (
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Job Type *</label>
                <select value={jobType} onChange={(e) => setJobType(e.target.value)} className={styles.select}>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Required Experience</label>
                <input type="text" placeholder="e.g. 2-3 Years" value={experience} onChange={(e) => setExperience(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Salary Range (Monthly)</label>
                <input type="text" placeholder="e.g. 50,000 - 80,000 INR" value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} className={styles.input} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Company Name *</label>
                <input type="text" placeholder="e.g. Tech Solutions LLC" value={company} onChange={(e) => setCompany(e.target.value)} className={styles.input} required />
              </div>
            </div>
          )}

          {/* Classifieds Specs */}
          {parentCategorySlug === 'classifieds' && (
            <div className={styles.grid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Condition *</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} className={styles.select}>
                  <option value="New">Brand New</option>
                  <option value="Like New">Like New</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Color</label>
                <input type="text" placeholder="e.g. Blue, Gold, Silver" value={itemColor} onChange={(e) => setItemColor(e.target.value)} className={styles.input} />
              </div>
            </div>
          )}

          {/* 3. General Information */}
          <h3 className={styles.sectionTitle}>Listing Information</h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>Listing Title *</label>
            <input type="text" placeholder="e.g. Toyota Camry 2021 SE for sale" value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description *</label>
            <textarea placeholder="Provide a detailed description of your item/car/property/job including condition, specs, viewing times, etc." value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} required />
          </div>

          <div className={styles.grid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Price (INR) *</label>
              <input type="number" placeholder="e.g. 500000" value={price} onChange={(e) => setPrice(e.target.value)} className={styles.input} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Location in India *</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className={styles.select}>
                <option value="Bandra West, Mumbai">Bandra West, Mumbai</option>
                <option value="Connaught Place, Delhi">Connaught Place, Delhi</option>
                <option value="Indiranagar, Bangalore">Indiranagar, Bangalore</option>
                <option value="Gachibowli, Hyderabad">Gachibowli, Hyderabad</option>
                <option value="T. Nagar, Chennai">T. Nagar, Chennai</option>
                <option value="Salt Lake, Kolkata">Salt Lake, Kolkata</option>
                <option value="Koregaon Park, Pune">Koregaon Park, Pune</option>
              </select>
            </div>
          </div>

          {/* 4. Upload Images (Multiple Support) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Upload Listing Images (Max 5)</label>
            <div className={styles.fileInputWrapper}>
              <span className={styles.fileInputText}>
                {imageNames ? (
                  <>Selected: <strong>{imageNames}</strong></>
                ) : (
                  <>Drag & drop or <strong>click to upload</strong> (Select up to 5 images)</>
                )}
              </span>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className={styles.fileInput} />
            </div>
          </div>

          {/* 5. Contact Options */}
          <div className={styles.checkboxGroup}>
            <input type="checkbox" id="phone_opt" checked={phoneVisible} onChange={(e) => setPhoneVisible(e.target.checked)} className={styles.checkbox} />
            <label htmlFor="phone_opt" style={{ cursor: 'pointer' }}>
              Show my phone number on the ad details page
            </label>
          </div>

          <button type="submit" disabled={submitting} className={styles.submitBtn}>
            {submitting ? 'Creating Ad...' : 'Publish Your Ad'}
          </button>
        </form>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <div style={modalIconStyle}>✓</div>
            <h3 style={modalTitleStyle}>Ad Submitted!</h3>
            <p style={modalMessageStyle}>{successMessage}</p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                router.push('/profile');
              }}
              style={modalBtnStyle}
            >
              Go to My Ads
            </button>
          </div>
        </div>
      )}
    </div>
  );
}