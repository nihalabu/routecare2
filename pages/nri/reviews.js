import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import reviewStyles from '@/styles/reviews.module.css';

export default function NRIReviews() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pendingReviews, setPendingReviews] = useState([]);
    const [pastReviews, setPastReviews] = useState([]);
    const [activeForm, setActiveForm] = useState(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            // Get completed requests not yet reviewed
            const requestsQuery = query(
                collection(db, 'serviceRequests'),
                where('nriId', '==', user.uid),
                where('status', '==', 'completed')
            );
            const requestsSnap = await getDocs(requestsQuery);
            const pending = [];

            requestsSnap.forEach((docSnap) => {
                const data = docSnap.data();
                if (!data.reviewed) {
                    pending.push({ id: docSnap.id, ...data });
                }
            });

            setPendingReviews(pending);

            // Get past reviews by this NRI
            const reviewsQuery = query(
                collection(db, 'reviews'),
                where('nriId', '==', user.uid)
            );
            const reviewsSnap = await getDocs(reviewsQuery);
            const reviews = [];

            reviewsSnap.forEach((docSnap) => {
                reviews.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Sort by date (newest first)
            reviews.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            setPastReviews(reviews);
        } catch (error) {
            console.error('Error fetching review data:', error);
        }
        setLoading(false);
    };

    const handleSubmitReview = async (request) => {
        if (rating === 0) {
            setMessage({ type: 'error', text: 'Please select a star rating.' });
            return;
        }

        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            // Create review document
            await addDoc(collection(db, 'reviews'), {
                nriId: user.uid,
                nriEmail: user.email,
                caretakerId: request.caretakerId || '',
                serviceRequestId: request.id,
                serviceName: request.serviceName || 'Service',
                rating,
                comment: comment.trim(),
                createdAt: serverTimestamp(),
            });

            // Mark the service request as reviewed
            await updateDoc(doc(db, 'serviceRequests', request.id), {
                reviewed: true,
            });

            setMessage({ type: 'success', text: 'Review submitted successfully!' });
            setActiveForm(null);
            setRating(0);
            setComment('');

            // Refresh data
            await fetchData();
        } catch (error) {
            console.error('Error submitting review:', error);
            setMessage({ type: 'error', text: 'Failed to submit review. Please try again.' });
        }

        setSubmitting(false);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderStars = (count, size = 'small') => {
        return [...Array(5)].map((_, i) => (
            <svg
                key={i}
                viewBox="0 0 24 24"
                className={`${reviewStyles.starSmall} ${i < count ? reviewStyles.filled : ''}`}
                stroke="currentColor"
                strokeWidth="2"
                fill={i < count ? 'currentColor' : 'none'}
            >
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
        ));
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRole="nri">
                <DashboardLayout role="nri">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRole="nri">
            <DashboardLayout role="nri">
                <div className={styles.dashboardContainer}>
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>Reviews</h1>
                        <p className={styles.welcomeSubtitle}>
                            Rate your caretakers after completed services.
                        </p>
                    </div>

                    {message.text && (
                        <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Pending Reviews */}
                    <div className={styles.sectionTitle}>Pending Reviews</div>

                    {pendingReviews.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No pending reviews</h3>
                            <p className={styles.emptyText}>
                                Complete a service to leave a review for your caretaker.
                            </p>
                        </div>
                    ) : (
                        pendingReviews.map((request) => (
                            <div key={request.id} className={reviewStyles.pendingCard}>
                                <div className={reviewStyles.pendingHeader}>
                                    <span className={reviewStyles.pendingService}>
                                        {request.serviceName || 'Service'}
                                    </span>
                                    {activeForm !== request.id && (
                                        <button
                                            className={reviewStyles.expandBtn}
                                            onClick={() => {
                                                setActiveForm(request.id);
                                                setRating(0);
                                                setComment('');
                                                setMessage({ type: '', text: '' });
                                            }}
                                        >
                                            Write Review
                                        </button>
                                    )}
                                </div>

                                {activeForm === request.id && (
                                    <div className={reviewStyles.reviewForm} style={{ border: 'none', padding: '1rem 0 0 0' }}>
                                        <div className={reviewStyles.reviewFormTitle}>Rate this service</div>
                                        <div className={reviewStyles.reviewFormSub}>Tap a star to rate</div>

                                        {/* Star Rating */}
                                        <div className={reviewStyles.starRating}>
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className={`${reviewStyles.starBtn} ${star <= (hoverRating || rating) ? reviewStyles.filled : ''
                                                        }`}
                                                    onClick={() => setRating(star)}
                                                    onMouseEnter={() => setHoverRating(star)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                >
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
                                                    >
                                                        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                    </svg>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Comment */}
                                        <textarea
                                            className={reviewStyles.reviewTextarea}
                                            placeholder="Share your experience (optional)..."
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            rows={3}
                                        />

                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <button
                                                className={styles.primaryBtn}
                                                onClick={() => handleSubmitReview(request)}
                                                disabled={submitting}
                                            >
                                                {submitting ? 'Submitting...' : 'Submit Review'}
                                            </button>
                                            <button
                                                className={styles.secondaryBtn}
                                                onClick={() => {
                                                    setActiveForm(null);
                                                    setRating(0);
                                                    setComment('');
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {/* Past Reviews */}
                    <div className={reviewStyles.reviewSection}>
                        <div className={styles.sectionTitle}>My Past Reviews</div>

                        {pastReviews.length === 0 ? (
                            <div className={styles.emptyState}>
                                <h3 className={styles.emptyTitle}>No reviews yet</h3>
                                <p className={styles.emptyText}>
                                    Your submitted reviews will appear here.
                                </p>
                            </div>
                        ) : (
                            pastReviews.map((review) => (
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
                                        <span className={reviewStyles.ratingValue}>{review.rating}/5</span>
                                    </div>
                                    {review.comment && (
                                        <p className={reviewStyles.reviewComment}>{review.comment}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
