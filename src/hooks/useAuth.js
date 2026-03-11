import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

export function useAuth() {
    const [usuario, setUsuario] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUsuario(user || null);
            setLoadingAuth(false);
        });

        return unsubscribe;
    }, []);

    return { usuario, loadingAuth };
}