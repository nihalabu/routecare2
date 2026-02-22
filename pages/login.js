import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from '@/styles/auth.module.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, userRole } = useAuth();
    const router = useRouter();

    // Show blocked message if redirected from ProtectedRoute
    useEffect(() => {
        if (router.query.blocked === 'true') {
            setError('Your account has been blocked. Please contact the administrator.');
        }
    }, [router.query]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            // Wait a moment for role to be fetched, then redirect
            setTimeout(() => {
                // Role will be fetched by AuthContext, we need to check it
                router.push('/redirect');
            }, 500);
        } catch (err) {
            setError(getErrorMessage(err.code));
        }

        setLoading(false);
    }

    function getErrorMessage(code) {
        switch (code) {
            case 'auth/invalid-email':
                return 'Invalid email address.';
            case 'auth/user-not-found':
                return 'No account found with this email.';
            case 'auth/wrong-password':
                return 'Incorrect password.';
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/user-blocked':
                return 'Your account has been blocked. Please contact the administrator.';
            default:
                return 'Failed to login. Please try again.';
        }
    }

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <Link href="/" className={styles.logoLink}>
                        <h1 className={styles.logo}>Route Care</h1>
                    </Link>
                    <p className={styles.subtitle}>Welcome back</p>
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
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className={styles.authFooter}>
                    Don't have an account?{' '}
                    <Link href="/register">Create one</Link>
                </p>
            </div>
        </div>
    );
}
