import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRole }) {
    const { user, userRole, userStatus, loading, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // If not logged in, redirect to login
            if (!user) {
                router.push('/login');
                return;
            }

            // If user is blocked, sign them out and redirect
            if (userStatus === 'blocked') {
                logout().then(() => {
                    router.push('/login?blocked=true');
                });
                return;
            }

            // If role doesn't match, redirect to appropriate dashboard
            if (allowedRole && userRole && userRole !== allowedRole) {
                if (userRole === 'caretaker' || userRole === 'nri' || userRole === 'admin') {
                    router.push(`/${userRole}/dashboard`);
                } else {
                    router.push('/login');
                }
            }
        }
    }, [user, userRole, userStatus, loading, router, allowedRole]);

    // Show loading state
    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    // If not authenticated, don't render children
    if (!user) {
        return null;
    }

    // If blocked, don't render children
    if (userStatus === 'blocked') {
        return null;
    }

    // If role check required and doesn't match, don't render
    if (allowedRole && userRole !== allowedRole) {
        return null;
    }

    return children;
}
