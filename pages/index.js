import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import styles from '@/styles/landing.module.css';

export default function Home() {
  const { user, userRole, logout } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className={styles.landingPage}>
      {/* Scrolling Banner */}
      <div className={styles.scrollingBanner}>
        <div className={styles.bannerContent}>
          {[...Array(10)].map((_, i) => (
            <span key={i} className={styles.bannerText}>
              <span>Safe Haven for NRI Homes</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </span>
          ))}
        </div>
      </div>

      {/* Navbar */}
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <Link href="/" className={styles.navLogo}>ROUTE CARE</Link>

        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <a href="#about" className={styles.navLink}>About</a>
          <a href="#services" className={styles.navLink}>Services</a>
        </div>

        <div className={styles.navRight}>
          {mounted && user ? (
            <>
              <Link href={`/${userRole}/dashboard`} className={styles.loginLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Dashboard
              </Link>
              <button onClick={handleLogout} className={styles.menuBtn}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.loginLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M20 21a8 8 0 10-16 0" />
                </svg>
                Log In
              </Link>
              <Link href="/register" className={styles.menuBtn}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Guardian Homes for Peace of Mind
        </h1>
        <p className={styles.heroSubtitle}>
          Welcome to Route Care, where we connect NRIs with trusted caretakers
          to manage their properties and provide personalized home services remotely.
        </p>
        <Link href={mounted && user ? `/${userRole}/dashboard` : "/register"} className={styles.heroBtn}>
          {mounted && user ? "GO TO DASHBOARD" : "GET STARTED"}
        </Link>
      </section>

      {/* About Section */}
      <section id="about" className={styles.about}>
        <div className={styles.aboutCard}>
          <span className={styles.aboutLabel}>About Us</span>
          <h2 className={styles.aboutTitle}>Our Approach & Expertise</h2>
          <p className={styles.aboutText}>
            At Route Care, we are a premier home management platform dedicated
            to helping NRIs maintain their properties from anywhere in the world.
            Our network of verified caretakers specializes in property maintenance,
            home services, and personalized care solutions to address your
            individual needs and provide complete peace of mind.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className={styles.services}>
        <div className={styles.servicesHeader}>
          <span className={styles.servicesLabel}>What We Offer</span>
          <h2 className={styles.servicesTitle}>Our Services</h2>
        </div>

        <div className={styles.servicesGrid}>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <h3>Property Management</h3>
            <p>Regular inspections, maintenance coordination, and security checks for your property.</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <h3>Home Repairs</h3>
            <p>Expert handling of repairs, from plumbing to electrical work, with verified professionals.</p>
          </div>

          <div className={styles.serviceCard}>
            <div className={styles.serviceIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <h3>Caretaker Network</h3>
            <p>Access to a verified network of trusted caretakers in your property's location.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
          <p className={styles.ctaText}>
            Join Route Care today and experience worry-free home management from anywhere in the world.
          </p>
          <Link href={mounted && user ? `/${userRole}/dashboard` : "/register"} className={styles.ctaBtn}>
            {mounted && user ? "Dashboard" : "Create Your Account"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>ROUTE CARE</div>
        <p className={styles.footerText}>© 2026 Route Care. All rights reserved.</p>
      </footer>
    </div>

  );
}
