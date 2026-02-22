import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import adminStyles from '@/styles/admin.module.css';

export default function AdminDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalNRIs: 0,
        totalCaretakers: 0,
        totalRequests: 0,
        activeRequests: 0,
        completedRequests: 0,
    });
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (user) fetchAdminData();
    }, [user]);

    const fetchAdminData = async () => {
        try {
            // Count NRIs
            const nriQuery = query(collection(db, 'users'), where('role', '==', 'nri'));
            const nriSnap = await getDocs(nriQuery);

            // Count Caretakers
            const caretakerQuery = query(collection(db, 'users'), where('role', '==', 'caretaker'));
            const caretakerSnap = await getDocs(caretakerQuery);

            // Get all service requests
            const requestsSnap = await getDocs(collection(db, 'serviceRequests'));
            let activeCount = 0;
            let completedCount = 0;
            const allRequests = [];

            requestsSnap.forEach((doc) => {
                const data = doc.data();
                if (data.status === 'pending' || data.status === 'in-progress') activeCount++;
                if (data.status === 'completed') completedCount++;
                allRequests.push({ id: doc.id, ...data });
            });

            // Sort by date for recent activity
            allRequests.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            setStats({
                totalNRIs: nriSnap.size,
                totalCaretakers: caretakerSnap.size,
                totalRequests: requestsSnap.size,
                activeRequests: activeCount,
                completedRequests: completedCount,
            });

            setRecentActivity(allRequests.slice(0, 8));
        } catch (error) {
            console.error('Error fetching admin data:', error);
        }

        setLoading(false);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <ProtectedRoute allowedRole="admin">
                <DashboardLayout role="admin">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute allowedRole="admin">
            <DashboardLayout role="admin">
                <div className={styles.dashboardContainer}>
                    {/* Welcome Section */}
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>Admin Dashboard</h1>
                        <p className={styles.welcomeSubtitle}>
                            Platform overview and activity monitoring.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className={adminStyles.adminStatsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.totalNRIs}</div>
                            <div className={styles.statLabel}>Total NRIs</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.totalCaretakers}</div>
                            <div className={styles.statLabel}>Total Caretakers</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                            </div>
                            <div className={styles.statValue}>{stats.totalRequests}</div>
                            <div className={styles.statLabel}>Total Requests</div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12,6 12,12 16,14" />
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
                            <div className={styles.statValue}>{stats.completedRequests}</div>
                            <div className={styles.statLabel}>Completed</div>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className={styles.sectionTitle}>Recent Activity</div>

                    {recentActivity.length === 0 ? (
                        <div className={adminStyles.noResults}>No service requests found.</div>
                    ) : (
                        <div className={adminStyles.activityList}>
                            {recentActivity.map((item) => (
                                <div key={item.id} className={adminStyles.activityItem}>
                                    <div className={`${adminStyles.activityDot} ${item.status === 'completed' ? adminStyles.completed :
                                            item.status === 'in-progress' ? adminStyles.inProgress :
                                                adminStyles.pending
                                        }`} />
                                    <div className={adminStyles.activityContent}>
                                        <div className={adminStyles.activityTitle}>
                                            {item.serviceName || 'Service Request'}
                                        </div>
                                        <div className={adminStyles.activityMeta}>
                                            Status: {item.status?.replace('-', ' ')} • NRI: {item.nriEmail || 'N/A'}
                                        </div>
                                    </div>
                                    <div className={adminStyles.activityDate}>
                                        {formatDate(item.createdAt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
