import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function Redirect() {
    const { user, userRole, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (userRole) {
                if (userRole === 'caretaker' || userRole === 'nri') {
                    router.push(`/${userRole}/dashboard`);
                } else {
                    console.error('Invalid user role detected:', userRole);
                    router.push('/login'); // Fallback for invalid roles
                }
            } else {
                // If role is missing, we might still be fetching or it's a new user without a role
                console.log('User role not found, waiting or redirecting...');
            }
        }
    }, [user, userRole, loading, router]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'var(--font-sans)'
        }}>
            <p>Redirecting...</p>
        </div>
    );
}
