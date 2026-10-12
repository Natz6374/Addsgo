import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.grid}>
          <div className={`${styles.column} styles.logoColumn`}>
            <div className={styles.logo}>
              Addsgo<span className={styles.logoDot}>.</span>
            </div>
            <p className={styles.tagline}>
              India&apos;s favorite classifieds platform. Sell, buy, rent, and find jobs in minutes.
            </p>
          </div>

          <div className={styles.column}>
            <h4>Popular Categories</h4>
            <ul>
              <li><Link href="/search?category=motors">Motor</Link></li>
              <li><Link href="/search?category=property-for-rent">Property for rent</Link></li>
              <li><Link href="/search?category=property-for-sale">Property for sale</Link></li>
              <li><Link href="/search?category=rooms-for-rent">Rooms for rent</Link></li>
              <li><Link href="/search?category=jobs">Jobs</Link></li>
              <li><Link href="/search?category=classifieds">Classifieds</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4>Locations</h4>
            <ul>
              <li><Link href="/search?location=Mumbai">Mumbai</Link></li>
              <li><Link href="/search?location=Delhi">Delhi</Link></li>
              <li><Link href="/search?location=Bangalore">Bangalore</Link></li>
              <li><Link href="/search?location=Hyderabad">Hyderabad</Link></li>
              <li><Link href="/search?location=Chennai">Chennai</Link></li>
            </ul>
          </div>

          <div className={styles.column}>
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Terms of Use</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div className={styles.copyright}>
            &copy; {new Date().getFullYear()} Addsgo. All rights reserved.
          </div>
          <div className={styles.socials}>
            <a href="#" className={styles.socialLink}>𝕏</a>
            <a href="#" className={styles.socialLink}>ⓕ</a>
            <a href="#" className={styles.socialLink}>ⓘ</a>
            <a href="#" className={styles.socialLink}>Ⓨ</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
