import { createContext, useContext, useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthContext = createContext({});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userStatus, setUserStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up with email, password, and role
    async function signup(email, password, role) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        // Create user document in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            email: newUser.email,
            role: role,
            status: 'active',
            createdAt: serverTimestamp()
        });

        setUserRole(role);
        setUserStatus('active');
        return userCredential;
    }

    // Login with email and password
    async function login(email, password) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);

        // Check if user is blocked before allowing login
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().status === 'blocked') {
            // Sign them out immediately and throw an error
            await signOut(auth);
            throw { code: 'auth/user-blocked' };
        }

        return userCredential;
    }

    // Logout
    async function logout() {
        setUserRole(null);
        setUserStatus(null);
        return signOut(auth);
    }

    // Fetch user role and status from Firestore
    async function fetchUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return { role: data.role, status: data.status || 'active' };
            }
            return { role: null, status: null };
        } catch (error) {
            console.error('Error fetching user data:', error);
            return { role: null, status: null };
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const { role, status } = await fetchUserData(currentUser.uid);
                setUserRole(role);
                setUserStatus(status);

                // If user is blocked, sign them out
                if (status === 'blocked') {
                    await signOut(auth);
                    setUser(null);
                    setUserRole(null);
                    setUserStatus(null);
                }
            } else {
                setUserRole(null);
                setUserStatus(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        userRole,
        userStatus,
        loading,
        signup,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
