import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from '@/styles/auth.module.css';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }

        if (!role) {
            return setError('Please select a role.');
        }

        setLoading(true);

        try {
            await signup(email, password, role);
            // Redirect to appropriate dashboard
            router.push(`/${role}/dashboard`);
        } catch (err) {
            setError(getErrorMessage(err.code));
        }

        setLoading(false);
    }

    function getErrorMessage(code) {
        switch (code) {
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/weak-password':
                return 'Password is too weak.';
            default:
                return 'Failed to create account. Please try again.';
        }
    }

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <Link href="/" className={styles.logoLink}>
                        <h1 className={styles.logo}>Route Care</h1>
                    </Link>
                    <p className={styles.subtitle}>Create your account</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Create a password"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                        />
                    </div>

                    <div className={styles.roleSelection}>
                        <label className={styles.roleLabel}>Select Your Role</label>
                        <p className={styles.roleNote}>This cannot be changed later</p>

                        <div className={styles.roleOptions}>
                            <label className={`${styles.roleOption} ${role === 'caretaker' ? styles.selected : ''}`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="caretaker"
                                    checked={role === 'caretaker'}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                                <div className={styles.roleContent}>
                                    <span className={styles.roleTitle}>Caretaker</span>
                                    <span className={styles.roleDescription}>Manage services and handle requests</span>
                                </div>
                            </label>

                            <label className={`${styles.roleOption} ${role === 'nri' ? styles.selected : ''}`}>
                                <input
                                    type="radio"
                                    name="role"
                                    value="nri"
                                    checked={role === 'nri'}
                                    onChange={(e) => setRole(e.target.value)}
                                />
                                <div className={styles.roleContent}>
                                    <span className={styles.roleTitle}>NRI</span>
                                    <span className={styles.roleDescription}>Manage caretakers and request services</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <p className={styles.authFooter}>
                    Already have an account?{' '}
                    <Link href="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
