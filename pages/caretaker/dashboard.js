import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';

// Generate a unique caretaker ID
function generateCaretakerId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CT-';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export default function CaretakerDashboard() {
    const { user } = useAuth();
    const [caretakerData, setCaretakerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [stats, setStats] = useState({
        activeServices: 0,
        pendingRequests: 0,
        connectedNris: 0,
    });
    const [recentRequests, setRecentRequests] = useState([]);

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                // Fetch/create caretaker data
                const caretakerRef = doc(db, 'caretakers', user.uid);
                const caretakerSnap = await getDoc(caretakerRef);

                if (caretakerSnap.exists()) {
                    setCaretakerData(caretakerSnap.data());
                } else {
                    const newCaretakerId = generateCaretakerId();
                    const newCaretakerData = {
                        uid: user.uid,
                        email: user.email,
                        caretakerId: newCaretakerId,
                        displayName: '',
                        phone: '',
                        address: '',
                        createdAt: new Date().toISOString(),
                    };
                    await setDoc(caretakerRef, newCaretakerData);
                    setCaretakerData(newCaretakerData);
                }

                // Fetch active services count
                const servicesQuery = query(
                    collection(db, 'services'),
                    where('caretakerId', '==', user.uid),
                    where('isActive', '==', true)
                );
                const servicesSnap = await getDocs(servicesQuery);

                // Fetch requests
                const requestsQuery = query(
                    collection(db, 'serviceRequests'),
                    where('caretakerId', '==', user.uid)
                );
                const requestsSnap = await getDocs(requestsQuery);

                const requests = [];
                const nriSet = new Set();
                let pendingCount = 0;

                for (const docSnap of requestsSnap.docs) {
                    const data = docSnap.data();
                    if (data.status === 'pending') pendingCount++;
                    nriSet.add(data.nriId);

                    // Get service name
                    let serviceName = 'Unknown Service';
                    if (data.serviceId) {
                        const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
                        if (serviceDoc.exists()) {
                            serviceName = serviceDoc.data().name;
                        }
                    }

                    requests.push({
                        id: docSnap.id,
                        ...data,
                        serviceName,
                    });
                }

                // Sort by date and get recent 5
                requests.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(0);
                    const dateB = b.createdAt?.toDate?.() || new Date(0);
                    return dateB - dateA;
                });

                setStats({
                    activeServices: servicesSnap.size,
                    pendingRequests: pendingCount,
                    connectedNris: nriSet.size,
                });
                setRecentRequests(requests.slice(0, 5));
            } catch (error) {
                console.error('Error fetching data:', error);
            }

            setLoading(false);
        }

        fetchData();
    }, [user]);

    const copyToClipboard = () => {
        if (caretakerData?.caretakerId) {
            navigator.clipboard.writeText(caretakerData.caretakerId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
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
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
                    {/* Welcome Section */}
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>
                            Welcome back{caretakerData?.displayName ? `, ${caretakerData.displayName}` : ''}!
                        </h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage your services and handle incoming requests from NRIs.
                        </p>
                    </div>

                    {/* Caretaker ID Card */}
                    <div className={styles.idCard}>
                        <div className={styles.idCardLabel}>YOUR UNIQUE CARETAKER ID</div>
                        <div className={styles.idCardValue}>{caretakerData?.caretakerId || 'Loading...'}</div>
                        <div className={styles.idCardHint}>
                            Share this ID with NRIs so they can connect with you
                        </div>
                        <button className={styles.copyBtn} onClick={copyToClipboard}>
                            {copied ? '✓ Copied!' : 'Copy ID'}
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.activeServices}</div>
                            <div className={styles.statLabel}>Active Services</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.pendingRequests}</div>
                            <div className={styles.statLabel}>Pending Requests</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.connectedNris}</div>
                            <div className={styles.statLabel}>Connected NRIs</div>
                        </div>
                    </div>

                    {/* Recent Requests */}
                    <div className={styles.sectionTitle}>Recent Service Requests</div>
                    {recentRequests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                    <line x1="12" y1="11" x2="12" y2="17" />
                                    <line x1="9" y1="14" x2="15" y2="14" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No requests yet</h3>
                            <p className={styles.emptyText}>
                                When NRIs request your services, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {recentRequests.map((request) => (
                                <div key={request.id} className={serviceStyles.requestCard}>
                                    <div className={serviceStyles.requestHeader}>
                                        <h3 className={serviceStyles.requestService}>{request.serviceName}</h3>
                                        <span className={`${serviceStyles.requestStatus} ${getStatusClass(request.status)}`}>
                                            {request.status.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <p className={serviceStyles.requestInfo}>
                                        <strong>From:</strong> {request.nriEmail}
                                    </p>
                                    <p className={serviceStyles.requestInfo}>
                                        <strong>Requested:</strong> {formatDate(request.createdAt)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
