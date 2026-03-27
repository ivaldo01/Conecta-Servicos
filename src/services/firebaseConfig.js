import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

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

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db };