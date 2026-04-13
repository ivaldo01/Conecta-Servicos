import { initializeApp, getApps } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// =============================================
// CONFIGURAÇÃO DO FIREBASE
// Mesmo projeto que o app mobile (agenda-servicos-2139d)
// Os dados são compartilhados em tempo real entre web e mobile
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyAzG2dnGzcipvraVdXEKJOj4JdjR8vRmzs",
  authDomain: "agenda-servicos-2139d.firebaseapp.com",
  projectId: "agenda-servicos-2139d",
  storageBucket: "agenda-servicos-2139d.firebasestorage.app",
  messagingSenderId: "2644975059",
  appId: "1:2644975059:web:90810802bf4473a90c2326",
  measurementId: "G-3F0TDM3BLB"
};

// =============================================
// INICIALIZAÇÃO (evita inicializar duas vezes em dev)
// =============================================
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth — persiste sessão no navegador (localStorage)
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Firestore — banco de dados compartilhado com o mobile
const db = getFirestore(app);

// Functions — Cloud Functions na região sul da América
const functions = getFunctions(app, 'southamerica-east1');

// Storage — para upload de imagens (fotos de perfil, galeria, etc.)
const storage = getStorage(app);

export { app, auth, db, functions, storage };
