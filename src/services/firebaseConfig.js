import { initializeApp } from "firebase/app";

// Auth com persistência no React Native
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firestore
import { getFirestore } from "firebase/firestore";

// Cloud Functions
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAzG2dnGzcipvraVdXEKJOj4JdjR8vRmzs",
  authDomain: "agenda-servicos-2139d.firebaseapp.com",
  projectId: "agenda-servicos-2139d",
  storageBucket: "agenda-servicos-2139d.appspot.com",
  messagingSenderId: "2644975059",
  appId: "1:2644975059:web:90810802bf4473a90c2326",
  measurementId: "G-3F0TDM3BLB"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Auth com persistência (não perde login no React Native)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Firestore
export const db = getFirestore(app);

// Cloud Functions
export const functions = getFunctions(app);

export default app;