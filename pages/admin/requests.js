import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import adminStyles from '@/styles/admin.module.css';

export default function AdminRequests() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (user) fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        try {
            const snap = await getDocs(collection(db, 'serviceRequests'));
            const list = [];

            snap.forEach((docSnap) => {
                list.push({ id: docSnap.id, ...docSnap.data() });
            });

            // Sort by date (newest first)
            list.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB - dateA;
            });

            setRequests(list);
        } catch (error) {
            console.error('Error fetching requests:', error);
        }
        setLoading(false);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending': return adminStyles.statusPending;
            case 'in-progress': return adminStyles.statusInProgress;
            case 'completed': return adminStyles.statusCompleted;
            default: return '';
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesFilter = filter === 'all' || r.status === filter;
        const matchesSearch = !search ||
            (r.serviceName || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.nriEmail || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.caretakerEmail || '').toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

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
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>Service Requests</h1>
                        <p className={styles.welcomeSubtitle}>
                            Monitor all service requests across the platform.
                        </p>
                    </div>

                    {/* Toolbar */}
                    <div className={adminStyles.toolbar}>
                        <input
                            type="text"
                            className={adminStyles.searchInput}
                            placeholder="Search by service name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className={adminStyles.filterTabs}>
                            {['all', 'pending', 'in-progress', 'completed'].map((f) => (
                                <button
                                    key={f}
                                    className={`${adminStyles.filterTab} ${filter === f ? adminStyles.active : ''}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f === 'all' ? 'All' : f.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    {filteredRequests.length === 0 ? (
                        <div className={adminStyles.noResults}>
                            {search || filter !== 'all'
                                ? 'No requests match your filters.'
                                : 'No service requests found.'}
                        </div>
                    ) : (
                        <div className={adminStyles.dataTable}>
                            <div className={`${adminStyles.tableHeader} ${adminStyles.requestsGrid}`}>
                                <span>Service</span>
                                <span>NRI</span>
                                <span>Status</span>
                                <span>Date</span>
                                <span>Count</span>
                            </div>

                            {filteredRequests.map((r) => (
                                <div key={r.id} className={`${adminStyles.tableRow} ${adminStyles.requestsGrid}`}>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Service</div>
                                        <span className={adminStyles.cellEmail}>
                                            {r.serviceName || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>NRI</div>
                                        <span className={adminStyles.cellSecondary}>
                                            {r.nriEmail || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Status</div>
                                        <span className={`${adminStyles.statusBadge} ${getStatusClass(r.status)}`}>
                                            {(r.status || 'unknown').replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Date</div>
                                        <span className={adminStyles.cellDate}>
                                            {formatDate(r.createdAt)}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>#</div>
                                        <span className={adminStyles.cellSecondary}>
                                            {filteredRequests.indexOf(r) + 1}
                                        </span>
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
