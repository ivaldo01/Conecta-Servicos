import { doc, runTransaction, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

function gerarIdSlot(clinicaId, data, horario, colaboradorId) {
    return `${clinicaId}_${data}_${horario}_${colaboradorId}`;
}

export async function travarHorario({
    clinicaId,
    data,
    horario,
    colaboradorId,
    agendamentoId
}) {
    const slotId = gerarIdSlot(clinicaId, data, horario, colaboradorId);
    const ref = doc(db, 'agenda_ocupada', slotId);

    await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(ref);

        if (snap.exists()) {
            throw new Error('HORARIO_OCUPADO');
        }

        transaction.set(ref, {
            clinicaId,
            data,
            horario,
            colaboradorId,
            agendamentoId,
        });
    });
}

export async function liberarHorario({
    clinicaId,
    data,
    horario,
    colaboradorId
}) {
    const slotId = gerarIdSlot(clinicaId, data, horario, colaboradorId);
    const ref = doc(db, 'agenda_ocupada', slotId);

    try {
        await deleteDoc(ref);
    } catch (e) {
        console.log('Erro ao liberar horário:', e);
    }
}