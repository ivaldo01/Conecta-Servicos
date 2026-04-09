import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
  browserLocalPersistence
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAzG2dnGzcipvraVdXEKJOj4JdjR8vRmzs",
  authDomain: "agenda-servicos-2139d.firebaseapp.com",
  projectId: "agenda-servicos-2139d",
  storageBucket: "agenda-servicos-2139d.firebasestorage.app",
  messagingSenderId: "2644975059",
  appId: "1:2644975059:web:90810802bf4473a90c2326",
  measurementId: "G-3F0TDM3BLB"
};

const app = initializeApp(firebaseConfig);

// Inicialização do Auth compatível com Web e Native
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
  // No web o Firebase já gerencia persistência por padrão, 
  // mas podemos forçar se necessário
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1');

export { app, auth, db, functions };