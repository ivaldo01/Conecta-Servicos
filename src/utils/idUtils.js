import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

/**
 * Gera um ConectaID (CID) único no formato CSXXXXXX
 */
export async function gerarConectaIdUnico() {
    let unico = false;
    let cid = '';
    
    while (!unico) {
        // Gera 6 dígitos aleatórios
        const randomNumbers = Math.floor(100000 + Math.random() * 900000);
        cid = `CS${randomNumbers}`;
        
        // Verifica se já existe no Firestore
        const q = query(collection(db, 'usuarios'), where('conectaId', '==', cid));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            unico = true;
        }
    }
    
    return cid;
}

/**
 * Busca o email associado a um ConectaID (CID)
 */
export async function getEmailFromCid(cid) {
    if (!cid || !cid.startsWith('CS')) return null;
    
    const q = query(collection(db, 'usuarios'), where('conectaId', '==', cid.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
        return snapshot.docs[0].data().email;
    }
    
    return null;
}

