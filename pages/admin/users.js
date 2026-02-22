import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import adminStyles from '@/styles/admin.module.css';

export default function AdminUsers() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        if (user) fetchUsers();
    }, [user]);

    const fetchUsers = async () => {
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'nri'));
            const snap = await getDocs(q);
            const list = [];

            for (const docSnap of snap.docs) {
                const data = docSnap.data();
                list.push({
                    id: docSnap.id,
                    email: data.email || '',
                    displayName: data.displayName || '',
                    status: data.status || 'active',
                    createdAt: data.createdAt,
                });
            }

            setUsers(list);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
        setLoading(false);
    };

    const toggleBlock = async (userId, currentStatus) => {
        setUpdating(userId);
        try {
            const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
            await updateDoc(doc(db, 'users', userId), { status: newStatus });
            setUsers(prev =>
                prev.map(u => u.id === userId ? { ...u, status: newStatus } : u)
            );
        } catch (error) {
            console.error('Error updating user status:', error);
        }
        setUpdating(null);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate?.() || new Date(timestamp);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.displayName.toLowerCase().includes(search.toLowerCase())
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
                        <h1 className={styles.welcomeTitle}>Users (NRIs)</h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage all registered NRI users.
                        </p>
                    </div>

                    {/* Search */}
                    <div className={adminStyles.toolbar}>
                        <input
                            type="text"
                            className={adminStyles.searchInput}
                            placeholder="Search by email or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Table */}
                    {filteredUsers.length === 0 ? (
                        <div className={adminStyles.noResults}>
                            {search ? 'No users match your search.' : 'No NRI users found.'}
                        </div>
                    ) : (
                        <div className={adminStyles.dataTable}>
                            <div className={`${adminStyles.tableHeader} ${adminStyles.usersGrid}`}>
                                <span>Email</span>
                                <span>Name</span>
                                <span>Status</span>
                                <span>Action</span>
                            </div>

                            {filteredUsers.map((u) => (
                                <div key={u.id} className={`${adminStyles.tableRow} ${adminStyles.usersGrid}`}>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Email</div>
                                        <span className={adminStyles.cellEmail}>{u.email}</span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Name</div>
                                        <span className={adminStyles.cellSecondary}>
                                            {u.displayName || '—'}
                                        </span>
                                    </div>
                                    <div>
                                        <div className={adminStyles.mobileLabel}>Status</div>
                                        <span className={`${adminStyles.statusBadge} ${u.status === 'blocked' ? adminStyles.statusBlocked : adminStyles.statusActive
                                            }`}>
                                            {u.status === 'blocked' ? 'Blocked' : 'Active'}
                                        </span>
                                    </div>
                                    <div>
                                        <button
                                            className={`${adminStyles.blockBtn} ${u.status === 'blocked' ? adminStyles.unblock : adminStyles.block
                                                }`}
                                            onClick={() => toggleBlock(u.id, u.status)}
                                            disabled={updating === u.id}
                                        >
                                            {updating === u.id
                                                ? '...'
                                                : u.status === 'blocked' ? 'Unblock' : 'Block'}
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
