import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';

export default function CaretakerRequests() {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [updateData, setUpdateData] = useState({
        status: '',
        proof: '',
        remarks: '',
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchRequests();
    }, [user]);

    const fetchRequests = async () => {
        if (!user) return;

        try {
            const requestsQuery = query(
                collection(db, 'serviceRequests'),
                where('caretakerId', '==', user.uid)
            );
            const querySnap = await getDocs(requestsQuery);
            const requestsList = [];

            for (const docSnap of querySnap.docs) {
                const data = docSnap.data();
                // Fetch service name
                let serviceName = 'Unknown Service';
                if (data.serviceId) {
                    const serviceDoc = await getDoc(doc(db, 'services', data.serviceId));
                    if (serviceDoc.exists()) {
                        serviceName = serviceDoc.data().name;
                    }
                }
                // Fetch NRI info
                let nriEmail = 'Unknown';
                if (data.nriId) {
                    const nriDoc = await getDoc(doc(db, 'nris', data.nriId));
                    if (nriDoc.exists()) {
                        nriEmail = nriDoc.data().email;
                    }
                }

                requestsList.push({
                    id: docSnap.id,
                    ...data,
                    serviceName,
                    nriEmail
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

    const handleProofUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 500000) {
            setMessage({ type: 'error', text: 'Image must be less than 500KB' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setUpdateData({ ...updateData, proof: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const openUpdateModal = (request) => {
        setSelectedRequest(request);
        setUpdateData({
            status: request.status,
            proof: request.proof || '',
            remarks: request.remarks || '',
        });
        setMessage({ type: '', text: '' });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedRequest(null);
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!selectedRequest) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await updateDoc(doc(db, 'serviceRequests', selectedRequest.id), {
                status: updateData.status,
                proof: updateData.proof,
                remarks: updateData.remarks.trim(),
                updatedAt: serverTimestamp(),
                ...(updateData.status === 'completed' && { completedAt: serverTimestamp() }),
            });

            setMessage({ type: 'success', text: 'Request updated successfully!' });
            await fetchRequests();
            setTimeout(() => closeModal(), 1000);
        } catch (error) {
            console.error('Error updating request:', error);
            setMessage({ type: 'error', text: 'Failed to update request' });
        }

        setSaving(false);
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
                    <div className={styles.welcomeSection}>
                        <h1 className={styles.welcomeTitle}>Service Requests</h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage incoming service requests from NRIs.
                        </p>
                    </div>

                    {requests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No requests yet</h3>
                            <p className={styles.emptyText}>
                                When NRIs request your services, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {requests.map((request) => (
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
                                    {request.remarks && (
                                        <div className={serviceStyles.remarkText}>
                                            <strong>Remarks:</strong> {request.remarks}
                                        </div>
                                    )}
                                    {request.proof && (
                                        <img src={request.proof} alt="Proof" className={serviceStyles.proofImage} />
                                    )}
                                    <div className={serviceStyles.requestActions}>
                                        <button onClick={() => openUpdateModal(request)} className={serviceStyles.statusBtn}>
                                            Update Status
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Update Modal */}
                {showModal && selectedRequest && (
                    <div className={serviceStyles.modalOverlay} onClick={closeModal}>
                        <div className={serviceStyles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={serviceStyles.modalHeader}>
                                <h2>Update Request</h2>
                                <button onClick={closeModal} className={serviceStyles.closeBtn}>
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

                            <form onSubmit={handleUpdateStatus} className={serviceStyles.form}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        value={updateData.status}
                                        onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            border: '1px solid var(--color-gray)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '0.95rem',
                                        }}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="remarks">Remarks</label>
                                    <textarea
                                        id="remarks"
                                        value={updateData.remarks}
                                        onChange={(e) => setUpdateData({ ...updateData, remarks: e.target.value })}
                                        placeholder="Add any notes about the service..."
                                        rows={3}
                                        className={serviceStyles.textarea}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="proof">Upload Proof (Max 500KB)</label>
                                    <input
                                        id="proof"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProofUpload}
                                        className={serviceStyles.fileInput}
                                    />
                                    {updateData.proof && (
                                        <div className={serviceStyles.imagePreview}>
                                            <img src={updateData.proof} alt="Proof preview" />
                                            <button
                                                type="button"
                                                onClick={() => setUpdateData({ ...updateData, proof: '' })}
                                                className={serviceStyles.removeImage}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={serviceStyles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.secondaryBtn}>
                                        Cancel
                                    </button>
                                    <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                        {saving ? 'Updating...' : 'Update Request'}
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
