import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import reviewStyles from '@/styles/reviews.module.css';

export default function CaretakerProfile() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
        address: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [reviewCount, setReviewCount] = useState(0);

    useEffect(() => {
        async function fetchProfile() {
            if (!user) return;

            try {
                const caretakerRef = doc(db, 'caretakers', user.uid);
                const caretakerSnap = await getDoc(caretakerRef);

                if (caretakerSnap.exists()) {
                    const data = caretakerSnap.data();
                    setFormData({
                        displayName: data.displayName || '',
                        phone: data.phone || '',
                        address: data.address || '',
                    });
                }

                // Fetch reviews for this caretaker
                const reviewsQuery = query(
                    collection(db, 'reviews'),
                    where('caretakerId', '==', user.uid)
                );
                const reviewsSnap = await getDocs(reviewsQuery);
                const reviewList = [];
                let totalRating = 0;

                reviewsSnap.forEach((docSnap) => {
                    const data = docSnap.data();
                    reviewList.push({ id: docSnap.id, ...data });
                    totalRating += data.rating || 0;
                });

                // Sort by date
                reviewList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                setReviews(reviewList);
                setReviewCount(reviewList.length);
                setAvgRating(reviewList.length > 0 ? (totalRating / reviewList.length) : 0);
            } catch (error) {
                console.error('Error fetching profile:', error);
            }

            setLoading(false);
        }

        fetchProfile();
    }, [user]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const caretakerRef = doc(db, 'caretakers', user.uid);
            await updateDoc(caretakerRef, formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }

        setSaving(false);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderStars = (count) => {
        return [...Array(5)].map((_, i) => (
            <svg
                key={i}
                viewBox="0 0 24 24"
                className={`${reviewStyles.starSmall} ${i < Math.round(count) ? reviewStyles.filled : ''}`}
                stroke="currentColor"
                strokeWidth="2"
                fill={i < Math.round(count) ? 'currentColor' : 'none'}
            >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
        ));
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRole="caretaker">
                <DashboardLayout role="caretaker">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRole="caretaker">
            <DashboardLayout role="caretaker">
                <div className={styles.dashboardContainer}>
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>Profile Settings</h1>
                        <p className={styles.welcomeSubtitle}>
                            Update your profile information.
                        </p>
                    </div>

                    <div className={styles.card}>
                        {message.text && (
                            <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    style={{ background: 'var(--color-light-gray)', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                <label htmlFor="displayName">Display Name</label>
                                <input
                                    id="displayName"
                                    name="displayName"
                                    type="text"
                                    value={formData.displayName}
                                    onChange={handleChange}
                                    placeholder="Your name"
                                />
                            </div>

                            <div className={styles.formGroup} style={{ marginBottom: '1rem' }}>
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Your phone number"
                                />
                            </div>

                            <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="address">Address</label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Your address"
                                />
                            </div>

                            <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Rating & Reviews Section */}
                    <div style={{ marginTop: '2rem' }}>
                        <div className={styles.sectionTitle}>My Ratings & Reviews</div>

                        {reviewCount > 0 ? (
                            <>
                                <div className={reviewStyles.ratingCard}>
                                    <div className={reviewStyles.ratingBig}>
                                        {avgRating.toFixed(1)}
                                    </div>
                                    <div className={reviewStyles.ratingInfo}>
                                        <div className={reviewStyles.ratingStarsBig}>
                                            {renderStars(avgRating)}
                                        </div>
                                        <span className={reviewStyles.ratingCount}>
                                            Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {reviews.map((review) => (
                                    <div key={review.id} className={reviewStyles.reviewCard}>
                                        <div className={reviewStyles.reviewHeader}>
                                            <span className={reviewStyles.reviewService}>
                                                {review.serviceName}
                                            </span>
                                            <span className={reviewStyles.reviewDate}>
                                                {formatDate(review.createdAt)}
                                            </span>
                                        </div>
                                        <div className={reviewStyles.starsDisplay}>
                                            {renderStars(review.rating)}
                                        </div>
                                        {review.comment && (
                                            <p className={reviewStyles.reviewComment}>
                                                {review.comment}
                                            </p>
                                        )}
                                        <div className={reviewStyles.reviewAuthor}>
                                            — {review.nriEmail}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className={styles.emptyState}>
                                <h3 className={styles.emptyTitle}>No reviews yet</h3>
                                <p className={styles.emptyText}>
                                    Reviews from NRIs will appear here after services are completed.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
