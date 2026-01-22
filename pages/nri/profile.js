import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';

export default function NRIProfile() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        displayName: '',
        phone: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        async function fetchProfile() {
            if (!user) return;

            try {
                const nriRef = doc(db, 'nris', user.uid);
                const nriSnap = await getDoc(nriRef);

                if (nriSnap.exists()) {
                    const data = nriSnap.data();
                    setFormData({
                        displayName: data.displayName || '',
                        phone: data.phone || '',
                    });
                }
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
            const nriRef = doc(db, 'nris', user.uid);
            await updateDoc(nriRef, formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }

        setSaving(false);
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

                            <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
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

                            <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    );
}
