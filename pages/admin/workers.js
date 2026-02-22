import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import adminStyles from '@/styles/admin.module.css';

export default function AdminWorkers() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [workers, setWorkers] = useState([]);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        if (user) fetchWorkers();
    }, [user]);

    const fetchWorkers = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'caretaker'));
            const snap = await getDocs(q);
            const list = [];

            for (const docSnap of snap.docs) {
                const data = docSnap.data();

                // Try to get caretaker profile for caretakerId
                let caretakerIdVal = '';
                let displayName = data.displayName || '';
                try {
                    const ctDoc = await getDoc(doc(db, 'caretakers', docSnap.id));
                    if (ctDoc.exists()) {
                        caretakerIdVal = ctDoc.data().caretakerId || '';
                        displayName = ctDoc.data().displayName || displayName;
                    }
                } catch (e) {
                    // ignore
                }

                list.push({
                    id: docSnap.id,
                    email: data.email || '',
                    displayName,
                    caretakerId: caretakerIdVal,
                    status: data.status || 'active',
                    createdAt: data.createdAt,
                });
            }

            setWorkers(list);
        } catch (error) {
            console.error('Error fetching workers:', error);
        }
        setLoading(false);
    };

    const toggleBlock = async (userId, currentStatus) => {
        setUpdating(userId);
        try {
            const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
            await updateDoc(doc(db, 'users', userId), { status: newStatus });
            setWorkers(prev =>
                prev.map(w => w.id === userId ? { ...w, status: newStatus } : w)
            );
        } catch (error) {
            console.error('Error updating worker status:', error);
        }
        setUpdating(null);
    };

    const filteredWorkers = workers.filter(w =>
        w.email.toLowerCase().includes(search.toLowerCase()) ||
        w.displayName.toLowerCase().includes(search.toLowerCase()) ||
        w.caretakerId.toLowerCase().includes(search.toLowerCase())
    );

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
                        <h1 className={styles.welcomeTitle}>Workers (Caretakers)</h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage all registered caretakers.
                        </p>
                    </div>

                    {/* Search */}
                    <div className={adminStyles.toolbar}>
                        <input
                            type="text"
                            className={adminStyles.searchInput}
                            placeholder="Search by email, name, or caretaker ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    {filteredWorkers.length === 0 ? (
                        <div className={adminStyles.noResults}>
                            {search ? 'No workers match your search.' : 'No caretakers found.'}
                        </div>
                    ) : (
                        <div className={adminStyles.dataTable}>
                            <div className={`${adminStyles.tableHeader} ${adminStyles.usersGrid}`}>
                                <span>Email</span>
                                <span>Caretaker ID</span>
                                <span>Status</span>
                                <span>Action</span>
                            </div>

                            {filteredWorkers.map((w) => (
                                <div key={w.id} className={`${adminStyles.tableRow} ${adminStyles.usersGrid}`}>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Email</div>
                                        <span className={adminStyles.cellEmail}>{w.email}</span>
                                        {w.displayName && (
                                            <div className={adminStyles.cellSecondary}>{w.displayName}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Caretaker ID</div>
                                        <span className={adminStyles.cellSecondary} style={{ fontFamily: 'monospace' }}>
                                            {w.caretakerId || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Status</div>
                                        <span className={`${adminStyles.statusBadge} ${w.status === 'blocked' ? adminStyles.statusBlocked : adminStyles.statusActive
                                            }`}>
                                            {w.status === 'blocked' ? 'Blocked' : 'Active'}
                                        </span>
                                    </div>
                                    <div>
                                        <button
                                            className={`${adminStyles.blockBtn} ${w.status === 'blocked' ? adminStyles.unblock : adminStyles.block
                                                }`}
                                            onClick={() => toggleBlock(w.id, w.status)}
                                            disabled={updating === w.id}
                                        >
                                            {updating === w.id
                                                ? '...'
                                                : w.status === 'blocked' ? 'Unblock' : 'Block'}
                                        </button>
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
