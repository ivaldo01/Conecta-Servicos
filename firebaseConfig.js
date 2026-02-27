import { initializeApp } from "firebase/app";
// Mudamos o getAuth para initializeAuth e incluímos o persistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzG2dnGzcipvraVdXEKJOj4JdjR8vRmzs",
  authDomain: "agenda-servicos-2139d.firebaseapp.com",
  projectId: "agenda-servicos-2139d",
  storageBucket: "agenda-servicos-2139d.appspot.com",
  messagingSenderId: "2644975059",
  appId: "1:2644975059:web:90810802bf4473a90c2326",
  measurementId: "G-3F0TDM3BLB"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Configura o Auth para NÃO perder a sessão no React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);