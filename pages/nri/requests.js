import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';

export default function NRIRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user) return;

        try {
            const requestsQuery = query(
                collection(db, 'serviceRequests'),
                where('nriId', '==', user.uid)
            );
            const querySnap = await getDocs(requestsQuery);
            const requestsList = [];

            for (const docSnap of querySnap.docs) {
                const data = docSnap.data();
                // Fetch caretaker info
                let caretakerName = 'Unknown';
                if (data.caretakerId) {
                    const caretakerDoc = await getDoc(doc(db, 'caretakers', data.caretakerId));
                    if (caretakerDoc.exists()) {
                        caretakerName = caretakerDoc.data().displayName || caretakerDoc.data().email;
                    }
                }

                requestsList.push({
                    id: docSnap.id,
                    ...data,
                    caretakerDisplayName: caretakerName
                });
            }

            // Sort by date (newest first)
            requestsList.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            setRequests(requestsList);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
        setLoading(false);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return serviceStyles.pending;
            case 'in-progress': return serviceStyles.inProgress;
            case 'completed': return serviceStyles.completed;
            default: return '';
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

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
                        <h1 className={styles.welcomeTitle}>My Requests</h1>
                        <p className={styles.welcomeSubtitle}>
                            Track your service requests and their progress.
                        </p>
                    </div>

                    {/* Filters */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['all', 'pending', 'in-progress', 'completed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    background: filter === status ? 'var(--color-primary)' : 'var(--color-light-gray)',
                                    color: filter === status ? 'var(--color-white)' : 'var(--color-text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                            </button>
                        ))}
                    </div>

                    {filteredRequests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>
                                {filter === 'all' ? 'No requests yet' : `No ${filter.replace('-', ' ')} requests`}
                            </h3>
                            <p className={styles.emptyText}>
                                {filter === 'all'
                                    ? 'Request services from your caretakers to track them here.'
                                    : 'No requests with this status.'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {filteredRequests.map((request) => (
                                <div key={request.id} className={serviceStyles.requestCard}>
                                    <div className={serviceStyles.requestHeader}>
                                        <h3 className={serviceStyles.requestService}>{request.serviceName}</h3>
                                        <span className={`${serviceStyles.requestStatus} ${getStatusClass(request.status)}`}>
                                            {request.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <p className={serviceStyles.requestInfo}>
                                        <strong>Caretaker:</strong> {request.caretakerDisplayName}
                                    </p>
                                    <p className={serviceStyles.requestInfo}>
                                        <strong>Requested:</strong> {formatDate(request.createdAt)}
                                    </p>
                                    {request.message && (
                                        <div className={serviceStyles.remarkText}>
                                            <strong>Your Message:</strong> {request.message}
                                        </div>
                                    )}
                                    {request.remarks && (
                                        <div className={serviceStyles.remarkText} style={{ marginTop: '0.5rem' }}>
                                            <strong>Caretaker's Remarks:</strong> {request.remarks}
                                        </div>
                                    )}
                                    {request.proof && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                Proof of Completion:
                                            </p>
                                            <img src={request.proof} alt="Proof" className={serviceStyles.proofImage} />
                                        </div>
                                    )}
                                    {request.completedAt && (
                                        <p className={serviceStyles.requestInfo} style={{ marginTop: '0.75rem' }}>
                                            <strong>Completed:</strong> {formatDate(request.completedAt)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
