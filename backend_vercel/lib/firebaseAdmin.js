
// backend_vercel/lib/firebaseAdmin.js
const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
            throw new Error('Variável de ambiente FIREBASE_SERVICE_ACCOUNT não definida.');
        }

        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('[firebaseAdmin] Firebase Admin inicializado com sucesso.');
    } catch (error) {
        console.error('[firebaseAdmin] Erro ao inicializar Firebase Admin:', error.message);
        // Lança para que as funções que dependem do db falhem com mensagem clara
        throw error;
    }
}

const db = admin.firestore();

module.exports = { db, admin };
