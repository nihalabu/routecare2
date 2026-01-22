import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';

export default function NRIDashboard() {
    const { user } = useAuth();
    const [nriData, setNriData] = useState(null);
    const [caretakers, setCaretakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [caretakerId, setCaretakerId] = useState('');
    const [addingCaretaker, setAddingCaretaker] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState({
        connectedCaretakers: 0,
        activeRequests: 0,
        completed: 0,
    });
    const [recentRequests, setRecentRequests] = useState([]);

    useEffect(() => {
        fetchNriData();
    }, [user]);

    const fetchNriData = async () => {
        if (!user) return;

        try {
            // Check/create NRI document
            const nriRef = doc(db, 'nris', user.uid);
            const nriSnap = await getDoc(nriRef);

            if (nriSnap.exists()) {
                setNriData(nriSnap.data());
            } else {
                const newNriData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: '',
                    phone: '',
                    caretakerIds: [],
                    createdAt: new Date().toISOString(),
                };
                await setDoc(nriRef, newNriData);
                setNriData(newNriData);
            }

            // Fetch connected caretakers
            await fetchCaretakers();

            // Fetch requests for stats
            const requestsQuery = query(
                collection(db, 'serviceRequests'),
                where('nriId', '==', user.uid)
            );
            const requestsSnap = await getDocs(requestsQuery);

            let activeCount = 0;
            let completedCount = 0;
            const requests = [];

            for (const docSnap of requestsSnap.docs) {
                const data = docSnap.data();
                if (data.status === 'pending' || data.status === 'in-progress') activeCount++;
                if (data.status === 'completed') completedCount++;

                requests.push({
                    id: docSnap.id,
                    ...data,
                });
            }

            // Sort by date and get recent 5
            requests.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            setRecentRequests(requests.slice(0, 5));
            setStats({
                connectedCaretakers: caretakers.length,
                activeRequests: activeCount,
                completed: completedCount,
            });
        } catch (error) {
            console.error('Error fetching NRI data:', error);
        }

        setLoading(false);
    };

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

                    querySnap.forEach((doc) => {
                        caretakersList.push({ id: doc.id, ...doc.data() });
                    });
                }

                setCaretakers(caretakersList);
                setStats(prev => ({ ...prev, connectedCaretakers: caretakersList.length }));
            }
        } catch (error) {
            console.error('Error fetching caretakers:', error);
        }
    };

    const handleAddCaretaker = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!caretakerId.trim()) {
            setMessage({ type: 'error', text: 'Please enter a Caretaker ID' });
            return;
        }

        setAddingCaretaker(true);

        try {
            const caretakersQuery = query(
                collection(db, 'caretakers'),
                where('caretakerId', '==', caretakerId.trim().toUpperCase())
            );
            const querySnap = await getDocs(caretakersQuery);

            if (querySnap.empty) {
                setMessage({ type: 'error', text: 'Caretaker not found. Please check the ID.' });
                setAddingCaretaker(false);
                return;
            }

            const nriRef = doc(db, 'nris', user.uid);
            const nriSnap = await getDoc(nriRef);
            const currentIds = nriSnap.data()?.caretakerIds || [];

            if (currentIds.includes(caretakerId.trim().toUpperCase())) {
                setMessage({ type: 'error', text: 'This caretaker is already connected.' });
                setAddingCaretaker(false);
                return;
            }

            await setDoc(nriRef, {
                ...nriSnap.data(),
                caretakerIds: [...currentIds, caretakerId.trim().toUpperCase()]
            });

            setMessage({ type: 'success', text: 'Caretaker added successfully!' });
            setCaretakerId('');
            await fetchCaretakers();
        } catch (error) {
            console.error('Error adding caretaker:', error);
            setMessage({ type: 'error', text: 'Failed to add caretaker. Please try again.' });
        }

        setAddingCaretaker(false);
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
                    {/* Welcome Section */}
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>
                            Welcome back{nriData?.displayName ? `, ${nriData.displayName}` : ''}!
                        </h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage your caretakers and track your service requests.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.connectedCaretakers}</div>
                            <div className={styles.statLabel}>Connected Caretakers</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.activeRequests}</div>
                            <div className={styles.statLabel}>Active Requests</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20,6 9,17 4,12" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.completed}</div>
                            <div className={styles.statLabel}>Completed</div>
                        </div>
                    </div>

                    {/* Add Caretaker Section */}
                    <div className={styles.addCaretakerSection}>
                        <h3 className={styles.cardTitle}>Add a Caretaker</h3>
                        <p className={styles.cardDescription} style={{ marginBottom: '1rem' }}>
                            Enter the unique Caretaker ID to connect with a caretaker.
                        </p>

                        {message.text && (
                            <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleAddCaretaker} className={styles.addCaretakerForm}>
                            <div className={styles.formGroup}>
                                <label htmlFor="caretakerId">Caretaker ID</label>
                                <input
                                    id="caretakerId"
                                    type="text"
                                    value={caretakerId}
                                    onChange={(e) => setCaretakerId(e.target.value)}
                                    placeholder="e.g., CT-ABC12345"
                                />
                            </div>
                            <button
                                type="submit"
                                className={styles.primaryBtn}
                                disabled={addingCaretaker}
                            >
                                {addingCaretaker ? 'Adding...' : 'Add Caretaker'}
                            </button>
                        </form>
                    </div>

                    {/* Connected Caretakers */}
                    <div className={styles.sectionTitle}>Your Caretakers</div>

                    {caretakers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <line x1="17" y1="11" x2="23" y2="11" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No caretakers yet</h3>
                            <p className={styles.emptyText}>
                                Add a caretaker using their unique ID to get started.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.caretakerList}>
                            {caretakers.map((caretaker) => (
                                <div key={caretaker.id} className={styles.caretakerCard}>
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recent Requests */}
                    {recentRequests.length > 0 && (
                        <>
                            <div className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Recent Requests</div>
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
                                            <strong>Requested:</strong> {formatDate(request.createdAt)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
