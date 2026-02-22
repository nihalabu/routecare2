import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';
import reviewStyles from '@/styles/reviews.module.css';

export default function NRICaretakers() {
    const { user } = useAuth();
    const [caretakers, setCaretakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCaretaker, setSelectedCaretaker] = useState(null);
    const [services, setServices] = useState([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [requestMessage, setRequestMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchCaretakers();
    }, [user]);

    const fetchCaretakers = async () => {
        if (!user) return;

        try {
            const nriRef = doc(db, 'nris', user.uid);
            const nriSnap = await getDoc(nriRef);

            if (nriSnap.exists() && nriSnap.data().caretakerIds?.length > 0) {
                const caretakersList = [];

                for (const ctId of nriSnap.data().caretakerIds) {
                    const caretakersQuery = query(
                        collection(db, 'caretakers'),
                        where('caretakerId', '==', ctId)
                    );
                    const querySnap = await getDocs(caretakersQuery);

                    for (const docSnap of querySnap.docs) {
                        const ctData = { id: docSnap.id, ...docSnap.data() };

                        // Fetch average rating for this caretaker
                        const reviewsQuery = query(
                            collection(db, 'reviews'),
                            where('caretakerId', '==', docSnap.id)
                        );
                        const reviewsSnap = await getDocs(reviewsQuery);
                        let totalRating = 0;
                        let reviewCount = 0;
                        reviewsSnap.forEach((r) => {
                            totalRating += r.data().rating || 0;
                            reviewCount++;
                        });
                        ctData.avgRating = reviewCount > 0 ? totalRating / reviewCount : 0;
                        ctData.reviewCount = reviewCount;

                        caretakersList.push(ctData);
                    }
                }

                setCaretakers(caretakersList);
            }
        } catch (error) {
            console.error('Error fetching caretakers:', error);
        }
        setLoading(false);
    };

    const fetchServices = async (caretaker) => {
        setSelectedCaretaker(caretaker);
        setLoadingServices(true);
        setServices([]);

        try {
            const servicesQuery = query(
                collection(db, 'services'),
                where('caretakerId', '==', caretaker.uid),
                where('isActive', '==', true)
            );
            const querySnap = await getDocs(servicesQuery);
            const servicesList = [];
            querySnap.forEach((doc) => {
                servicesList.push({ id: doc.id, ...doc.data() });
            });
            setServices(servicesList);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
        setLoadingServices(false);
    };

    const openRequestModal = (service) => {
        setSelectedService(service);
        setRequestMessage('');
        setMessage({ type: '', text: '' });
        setShowRequestModal(true);
    };

    const closeRequestModal = () => {
        setShowRequestModal(false);
        setSelectedService(null);
    };

    const handleRequestService = async (e) => {
        e.preventDefault();
        if (!selectedService || !selectedCaretaker) return;

        setSubmitting(true);
        setMessage({ type: '', text: '' });

        try {
            await addDoc(collection(db, 'serviceRequests'), {
                serviceId: selectedService.id,
                serviceName: selectedService.name,
                caretakerId: selectedCaretaker.uid,
                caretakerName: selectedCaretaker.displayName || selectedCaretaker.email,
                nriId: user.uid,
                nriEmail: user.email,
                status: 'pending',
                message: requestMessage.trim(),
                proof: '',
                remarks: '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setMessage({ type: 'success', text: 'Service requested successfully!' });
            setTimeout(() => closeRequestModal(), 1500);
        } catch (error) {
            console.error('Error requesting service:', error);
            setMessage({ type: 'error', text: 'Failed to request service' });
        }

        setSubmitting(false);
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
                        <h1 className={styles.welcomeTitle}>My Caretakers</h1>
                        <p className={styles.welcomeSubtitle}>
                            View your connected caretakers and request their services.
                        </p>
                    </div>

                    {caretakers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No caretakers yet</h3>
                            <p className={styles.emptyText}>
                                Add a caretaker from your dashboard to get started.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
                            {/* Caretaker List */}
                            <div>
                                <h3 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>Caretakers</h3>
                                <div className={styles.caretakerList}>
                                    {caretakers.map((caretaker) => (
                                        <div
                                            key={caretaker.id}
                                            className={styles.caretakerCard}
                                            style={{
                                                cursor: 'pointer',
                                                border: selectedCaretaker?.id === caretaker.id ? '2px solid var(--color-primary)' : undefined
                                            }}
                                            onClick={() => fetchServices(caretaker)}
                                        >
                                            <div className={styles.caretakerAvatar}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                            <div className={styles.caretakerInfo}>
                                                <div className={styles.caretakerName}>
                                                    {caretaker.displayName || caretaker.email}
                                                </div>
                                                <div className={styles.caretakerId}>{caretaker.caretakerId}</div>
                                                {caretaker.reviewCount > 0 && (
                                                    <div className={reviewStyles.starsDisplay} style={{ marginTop: '0.25rem' }}>
                                                        {[...Array(5)].map((_, i) => (
                                                            <svg
                                                                key={i}
                                                                viewBox="0 0 24 24"
                                                                className={`${reviewStyles.starSmall} ${i < Math.round(caretaker.avgRating) ? reviewStyles.filled : ''}`}
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                fill={i < Math.round(caretaker.avgRating) ? 'currentColor' : 'none'}
                                                            >
                                                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                                                            </svg>
                                                        ))}
                                                        <span className={reviewStyles.ratingValue} style={{ fontSize: '0.8rem' }}>
                                                            {caretaker.avgRating.toFixed(1)}
                                                        </span>
                                                        <span className={reviewStyles.ratingCount}>
                                                            ({caretaker.reviewCount})
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Services */}
                            <div>
                                {!selectedCaretaker ? (
                                    <div className={styles.emptyState}>
                                        <h3 className={styles.emptyTitle}>Select a caretaker</h3>
                                        <p className={styles.emptyText}>
                                            Click on a caretaker to view their services.
                                        </p>
                                    </div>
                                ) : loadingServices ? (
                                    <div className="loading-container" style={{ minHeight: '200px' }}>
                                        <div className="loading-spinner"></div>
                                    </div>
                                ) : services.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <h3 className={styles.emptyTitle}>No services available</h3>
                                        <p className={styles.emptyText}>
                                            This caretaker hasn't added any services yet.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className={styles.sectionTitle} style={{ marginBottom: '1rem' }}>
                                            Services by {selectedCaretaker.displayName || selectedCaretaker.email}
                                        </h3>
                                        <div className={serviceStyles.servicesGrid}>
                                            {services.map((service) => (
                                                <div key={service.id} className={serviceStyles.serviceCard}>
                                                    {service.image && (
                                                        <div className={serviceStyles.serviceImage}>
                                                            <img src={service.image} alt={service.name} />
                                                        </div>
                                                    )}
                                                    <div className={serviceStyles.serviceContent}>
                                                        <h3 className={serviceStyles.serviceName}>{service.name}</h3>
                                                        <p className={serviceStyles.serviceDescription}>{service.description}</p>
                                                        {service.price && (
                                                            <p className={serviceStyles.servicePrice}>₹{service.price}</p>
                                                        )}
                                                        <button
                                                            onClick={() => openRequestModal(service)}
                                                            className={styles.primaryBtn}
                                                            style={{ marginTop: '0.75rem' }}
                                                        >
                                                            Request Service
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Request Modal */}
                {showRequestModal && selectedService && (
                    <div className={serviceStyles.modalOverlay} onClick={closeRequestModal}>
                        <div className={serviceStyles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={serviceStyles.modalHeader}>
                                <h2>Request Service</h2>
                                <button onClick={closeRequestModal} className={serviceStyles.closeBtn}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {message.text && (
                                <div style={{ padding: '0 1.5rem' }}>
                                    <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                                        {message.text}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleRequestService} className={serviceStyles.form}>
                                <div className={styles.card} style={{ marginBottom: '1rem' }}>
                                    <h3 className={styles.cardTitle}>{selectedService.name}</h3>
                                    <p className={styles.cardDescription}>{selectedService.description}</p>
                                    {selectedService.price && (
                                        <p style={{ marginTop: '0.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                                            ₹{selectedService.price}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="message">Additional Message (Optional)</label>
                                    <textarea
                                        id="message"
                                        value={requestMessage}
                                        onChange={(e) => setRequestMessage(e.target.value)}
                                        placeholder="Any specific instructions or requirements..."
                                        rows={3}
                                        className={serviceStyles.textarea}
                                    />
                                </div>

                                <div className={serviceStyles.modalActions}>
                                    <button type="button" onClick={closeRequestModal} className={styles.secondaryBtn}>
                                        Cancel
                                    </button>
                                    <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                                        {submitting ? 'Submitting...' : 'Submit Request'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </ProtectedRoute>
    );
}
