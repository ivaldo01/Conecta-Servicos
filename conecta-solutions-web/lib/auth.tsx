'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

// =============================================
// TIPOS
// =============================================
interface DadosUsuario {
  uid: string;
  nome?: string;
  email?: string;
  perfil?: 'profissional' | 'cliente' | 'colaborador' | 'empresa' | 'admin' | 'suporte';
  planoAtivo?: string;
  fotoPerfil?: string;
  profissionalId?: string; // ID do patrão (para colaboradores)
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  dadosUsuario: DadosUsuario | null;
  loading: boolean;
  ehProfissional: boolean;
  ehAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dadosUsuario, setDadosUsuario] = useState<DadosUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  // EFEITO PRINCIPAL DE MONITORAMENTO
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Limpa listener anterior se houver
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // --- FLUXO GESTOR / CLIENTE (OFICIAL) ---
        setUser(firebaseUser);
        
        unsubscribeProfile = onSnapshot(doc(db, 'usuarios', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setDadosUsuario({ uid: firebaseUser.uid, ...snap.data() } as DadosUsuario);
          } else {
            console.warn('[Auth] Perfil não encontrado no Firestore.');
          }
          setLoading(false);
        }, (err) => {
          console.error('[Auth] Erro Profile Gestor:', err.message);
          if (err.code === 'permission-denied') {
            signOut(auth);
          }
          setLoading(false);
        });

      } else {
        // --- FLUXO COLABORADOR (MANUAL) ---
        const colabId = sessionStorage.getItem('colab_uid');
        if (colabId) {
          unsubscribeProfile = onSnapshot(doc(db, 'colaboradores', colabId), (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUser({ uid: colabId, email: data.email, displayName: data.nome } as any);
              setDadosUsuario({ uid: colabId, perfil: 'colaborador', ...data } as any);
            } else {
              sessionStorage.removeItem('colab_uid');
              setUser(null);
              setDadosUsuario(null);
            }
            setLoading(false);
          }, (err) => {
            console.error('[Auth] Erro Profile Colab:', err.message);
            sessionStorage.removeItem('colab_uid');
            setLoading(false);
          });
        } else {
          setUser(null);
          setDadosUsuario(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // LOGIN HÍBRIDO
  const login = async (email: string, password: string) => {
    const emailLimpo = email.trim().toLowerCase();
    
    try {
      console.log('[Auth] Tentando login oficial...');
      // 1. Tenta Auth Oficial
      await signInWithEmailAndPassword(auth, emailLimpo, password);
      sessionStorage.removeItem('colab_uid');
    } catch (err: any) {
      console.log('[Auth] Usuário não encontrado no Auth. Tentando canal de colaborador...');
      
      try {
        // --- PONTE DE SEGURANÇA ---
        const { signInAnonymously } = await import('firebase/auth');
        if (!auth.currentUser) {
          try {
            await signInAnonymously(auth);
          } catch (anonErr: any) {
            if (anonErr.code === 'auth/admin-restricted-operation') {
              console.warn('[Auth] Login Anônimo desativado no Firebase. Tentando busca direta...');
            } else {
              throw anonErr;
            }
          }
        }

        // 2. BUSCA NO FIRESTORE (Agora com permissão de 'autenticado')
        const colabsRef = collection(db, 'colaboradores');
        const q = query(colabsRef, where('email', '==', emailLimpo));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const colabDoc = snap.docs[0];
          const colabDados = colabDoc.data();
          
          console.log('[Auth] Colaborador localizado. Validando credenciais...');

          if (String(colabDados.senhaTemporaria) === String(password)) {
            const uid = colabDoc.id;
            
            // Define os dados IMEDIATAMENTE
            const mockUser = {
              uid,
              email: colabDados.email,
              displayName: colabDados.nome,
            } as any;
            
            setUser(mockUser);
            setDadosUsuario({ uid, perfil: 'colaborador', ...colabDados } as any);
            sessionStorage.setItem('colab_uid', uid);
            
            console.log('[Auth] Login de colaborador realizado com sucesso!');
            return;
          } else {
            // Se a senha estiver errada, saímos do anônimo para não travar
            await signOut(auth);
            throw new Error('Senha incorreta para este colaborador.');
          }
        } else {
          // Se não achou na busca, sai do anônimo
          await signOut(auth);
        }
      } catch (firestoreErr: any) {
        console.error('[Auth] Erro na busca de colaboradores:', firestoreErr.message);
        await signOut(auth);
      }

      // Se nada acima funcionou, joga o erro original (E-mail não encontrado)
      throw err;
    }
  };

  const logout = async () => {
    sessionStorage.removeItem('colab_uid');
    setDadosUsuario(null);
    setUser(null);
    await signOut(auth);
  };

  const ehProfissional = dadosUsuario?.perfil === 'profissional' || dadosUsuario?.tipo === 'profissional';
  const ehAdmin = dadosUsuario?.perfil === 'admin' || dadosUsuario?.isAdmin === true;

  return (
    <AuthContext.Provider value={{ user, dadosUsuario, loading, ehProfissional, ehAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
