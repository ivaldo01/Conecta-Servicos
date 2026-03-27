import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export function useUsuario(uid) {
    const [dadosUsuario, setDadosUsuario] = useState(null);
    const [loadingUsuario, setLoadingUsuario] = useState(true);

    useEffect(() => {
        if (!uid) {
            setDadosUsuario(null);
            setLoadingUsuario(false);
            return;
        }

        const ref = doc(db, 'usuarios', uid);

        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                if (snapshot.exists()) {
                    setDadosUsuario(snapshot.data());
                } else {
                    setDadosUsuario(null);
                }
                setLoadingUsuario(false);
            },
            (error) => {
                console.log('Erro ao buscar usuário:', error);
                setDadosUsuario(null);
                setLoadingUsuario(false);
            }
        );

        return unsubscribe;
    }, [uid]);

    return { dadosUsuario, loadingUsuario };
}