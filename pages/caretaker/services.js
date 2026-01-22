import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';
import serviceStyles from '@/styles/services.module.css';

export default function CaretakerServices() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image: '',
        isActive: true,
    });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchServices();
    }, [user]);

    const fetchServices = async () => {
        if (!user) return;

        try {
            const servicesQuery = query(
                collection(db, 'services'),
                where('caretakerId', '==', user.uid)
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
        setLoading(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 500KB for Base64)
        if (file.size > 500000) {
            setMessage({ type: 'error', text: 'Image must be less than 500KB' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData({ ...formData, image: reader.result });
        };
        reader.readAsDataURL(file);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            image: '',
            isActive: true,
        });
        setEditingService(null);
        setMessage({ type: '', text: '' });
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description,
            price: service.price || '',
            image: service.image || '',
            isActive: service.isActive,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Service name is required' });
            return;
        }

        setSaving(true);

        try {
            if (editingService) {
                // Update existing service
                await updateDoc(doc(db, 'services', editingService.id), {
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    price: formData.price ? parseFloat(formData.price) : null,
                    image: formData.image,
                    isActive: formData.isActive,
                    updatedAt: serverTimestamp(),
                });
                setMessage({ type: 'success', text: 'Service updated successfully!' });
            } else {
                // Add new service
                await addDoc(collection(db, 'services'), {
                    caretakerId: user.uid,
                    name: formData.name.trim(),
                    description: formData.description.trim(),
                    price: formData.price ? parseFloat(formData.price) : null,
                    image: formData.image,
                    isActive: formData.isActive,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                setMessage({ type: 'success', text: 'Service added successfully!' });
            }

            await fetchServices();
            setTimeout(() => closeModal(), 1000);
        } catch (error) {
            console.error('Error saving service:', error);
            setMessage({ type: 'error', text: 'Failed to save service' });
        }

        setSaving(false);
    };

    const handleDelete = async (serviceId) => {
        if (!confirm('Are you sure you want to delete this service?')) return;

        try {
            await deleteDoc(doc(db, 'services', serviceId));
            await fetchServices();
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const toggleStatus = async (service) => {
        try {
            await updateDoc(doc(db, 'services', service.id), {
                isActive: !service.isActive,
                updatedAt: serverTimestamp(),
            });
            await fetchServices();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
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
                        <h1 className={styles.welcomeTitle}>My Services</h1>
                        <p className={styles.welcomeSubtitle}>
                            Manage the services you offer to NRIs.
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <button onClick={openAddModal} className={styles.primaryBtn}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Service
                        </button>
                    </div>

                    {services.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                                </svg>
                            </div>
                            <h3 className={styles.emptyTitle}>No services yet</h3>
                            <p className={styles.emptyText}>
                                Add your first service to start receiving requests.
                            </p>
                        </div>
                    ) : (
                        <div className={serviceStyles.servicesGrid}>
                            {services.map((service) => (
                                <div key={service.id} className={serviceStyles.serviceCard}>
                                    {service.image && (
                                        <div className={serviceStyles.serviceImage}>
                                            <img src={service.image} alt={service.name} />
                                        </div>
                                    )}
                                    <div className={serviceStyles.serviceContent}>
                                        <div className={serviceStyles.serviceHeader}>
                                            <h3 className={serviceStyles.serviceName}>{service.name}</h3>
                                            <span className={`${serviceStyles.statusBadge} ${service.isActive ? serviceStyles.active : serviceStyles.inactive}`}>
                                                {service.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <p className={serviceStyles.serviceDescription}>{service.description}</p>
                                        {service.price && (
                                            <p className={serviceStyles.servicePrice}>₹{service.price}</p>
                                        )}
                                        <div className={serviceStyles.serviceActions}>
                                            <button onClick={() => openEditModal(service)} className={serviceStyles.editBtn}>
                                                Edit
                                            </button>
                                            <button onClick={() => toggleStatus(service)} className={serviceStyles.toggleBtn}>
                                                {service.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                            <button onClick={() => handleDelete(service.id)} className={serviceStyles.deleteBtn}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className={serviceStyles.modalOverlay} onClick={closeModal}>
                        <div className={serviceStyles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={serviceStyles.modalHeader}>
                                <h2>{editingService ? 'Edit Service' : 'Add Service'}</h2>
                                <button onClick={closeModal} className={serviceStyles.closeBtn}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {message.text && (
                                <div className={`${styles.alert} ${message.type === 'success' ? styles.alertSuccess : styles.alertError}`}>
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className={serviceStyles.form}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Service Name *</label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Home Inspection"
                                        required
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe your service..."
                                        rows={3}
                                        className={serviceStyles.textarea}
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="price">Price (₹) - Optional</label>
                                    <input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="e.g., 500"
                                        min="0"
                                    />
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="image">Service Image (Max 500KB)</label>
                                    <input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className={serviceStyles.fileInput}
                                    />
                                    {formData.image && (
                                        <div className={serviceStyles.imagePreview}>
                                            <img src={formData.image} alt="Preview" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                className={serviceStyles.removeImage}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className={serviceStyles.checkboxGroup}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span>Active (visible to NRIs)</span>
                                    </label>
                                </div>

                                <div className={serviceStyles.modalActions}>
                                    <button type="button" onClick={closeModal} className={styles.secondaryBtn}>
                                        Cancel
                                    </button>
                                    <button type="submit" className={styles.primaryBtn} disabled={saving}>
                                        {saving ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
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
