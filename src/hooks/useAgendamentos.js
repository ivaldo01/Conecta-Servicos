import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { ordenarAgendamentosPorCriacao } from '../utils/agendamentoUtils';

export function useAgendamentos(uid, perfil) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);

    useEffect(() => {
        if (!uid || !perfil) {
            setAgendamentos([]);
            setLoadingAgendamentos(false);
            return;
        }

        const ehColaborador = perfil === 'colaborador';

        const q = ehColaborador
            ? query(collection(db, 'agendamentos'), where('colaboradorId', '==', uid))
            : query(collection(db, 'agendamentos'), where('clinicaId', '==', uid));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const dados = snapshot.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                }));

                setAgendamentos(ordenarAgendamentosPorCriacao(dados));
                setLoadingAgendamentos(false);
            },
            (error) => {
                console.log('Erro ao carregar agendamentos:', error);
                setAgendamentos([]);
                setLoadingAgendamentos(false);
            }
        );

        return unsubscribe;
    }, [uid, perfil]);

    return { agendamentos, loadingAgendamentos };
}