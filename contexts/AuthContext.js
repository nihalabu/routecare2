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
            createdAt: serverTimestamp()
        });

        setUserRole(role);
        return userCredential;
    }

    // Login with email and password
    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    // Logout
    async function logout() {
        setUserRole(null);
        return signOut(auth);
    }

    // Fetch user role from Firestore
    async function fetchUserRole(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                return userDoc.data().role;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user role:', error);
            return null;
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                const role = await fetchUserRole(currentUser.uid);
                setUserRole(role);
            } else {
                setUserRole(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        user,
        userRole,
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
