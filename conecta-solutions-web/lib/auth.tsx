"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { logAuth, logNavegacao } from "./activityLogger";
import { auth, db } from "./firebase";

// =============================================
// TIPOS
// =============================================
interface DadosUsuario {
  uid: string;
  nome?: string;
  email?: string;
  perfil?:
    | "profissional"
    | "cliente"
    | "colaborador"
    | "empresa"
    | "admin"
    | "suporte";
  planoAtivo?: string;
  fotoPerfil?: string;
  fotoUrl?: string;
  profissionalId?: string; // ID do patrão (para colaboradores)
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  dadosUsuario: DadosUsuario | null;
  loading: boolean;
  ehProfissional: boolean;
  ehAdmin: boolean;
  ehColaborador: boolean;
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
        try {
          unsubscribeProfile();
        } catch (e) {
          // Ignora erros de cleanup
        }
        unsubscribeProfile = null;
      }

      // Delay para evitar race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se é colaborador primeiro (tem prioridade sobre firebaseUser)
      const colabId = sessionStorage.getItem("colab_uid");
      
      if (colabId) {
        // --- FLUXO COLABORADOR ---
        try {
          const snap = await getDoc(doc(db, "colaboradores", colabId));
          if (snap.exists()) {
            const data = snap.data();
            setUser({
              uid: colabId,
              email: data.email,
              displayName: data.nome,
            } as any);
            setDadosUsuario({
              ...data,
              uid: colabId,
              perfil: "colaborador",
              clinicaId: data.profissionalId || data.clinicaId, // Mapeia profissionalId para clinicaId
            } as DadosUsuario);
          } else {
            console.warn("[Auth] Colaborador não encontrado no Firestore.");
            sessionStorage.removeItem("colab_uid");
            setUser(null);
            setDadosUsuario(null);
          }
        } catch (err: any) {
          console.error("[Auth] Erro ao buscar colaborador:", err.code, err.message);
          sessionStorage.removeItem("colab_uid");
          setUser(null);
          setDadosUsuario(null);
        }
        setLoading(false);
      } else if (firebaseUser) {
        // --- VERIFICAR SE É COLABORADOR PRIMEIRO ---
        try {
          const { getDocs, query, collection, where } = await import("firebase/firestore");
          const colabsRef = collection(db, "colaboradores");
          const q = query(colabsRef, where("email", "==", firebaseUser.email));
          const colabSnap = await getDocs(q);
          
          if (!colabSnap.empty) {
            // É COLABORADOR - usar dados da coleção colaboradores
            const colabDoc = colabSnap.docs[0];
            const colabData = colabDoc.data();
            const colabId = colabDoc.id;
            
            console.log("[Auth] Usuário identificado como colaborador:", colabData.nome);
            
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: colabData.nome || firebaseUser.displayName,
            } as any);
            setDadosUsuario({
              ...colabData,
              uid: colabId,
              firebaseAuthUid: firebaseUser.uid,
              perfil: "colaborador",
              clinicaId: colabData.profissionalId || colabData.clinicaId, // Mapeia profissionalId para clinicaId
            } as any);
            sessionStorage.setItem("colab_uid", colabId);
            setLoading(false);
            return; // Sai aqui, não continua para o fluxo de gestor
          }
        } catch (err: any) {
          console.log("[Auth] Erro ao verificar se é colaborador:", err.message);
          // Continua para o fluxo normal de gestor/cliente
        }
        
        // --- FLUXO GESTOR / CLIENTE (OFICIAL) ---
        setUser(firebaseUser);

        try {
          unsubscribeProfile = onSnapshot(
            doc(db, "usuarios", firebaseUser.uid),
            (snap) => {
              if (snap.exists()) {
                setDadosUsuario({
                  uid: firebaseUser.uid,
                  ...snap.data(),
                } as DadosUsuario);
              } else {
                console.warn("[Auth] Perfil não encontrado no Firestore.");
              }
              setLoading(false);
            },
            (err) => {
              console.error("[Auth] Erro Profile Gestor:", err.code, err.message);
              if (err.code === "permission-denied") {
                signOut(auth);
              }
              setLoading(false);
            },
          );
        } catch (err) {
          console.error("[Auth] Erro ao criar listener:", err);
          setLoading(false);
        }
      } else {
        // Nenhum usuário autenticado e nenhum colaborador no sessionStorage
        setUser(null);
        setDadosUsuario(null);
        setLoading(false);
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
      console.log("[Auth] Tentando login oficial...");
      // 1. Tenta Auth Oficial
      const userCred = await signInWithEmailAndPassword(
        auth,
        emailLimpo,
        password,
      );
      sessionStorage.removeItem("colab_uid");

      // Log da atividade
      logAuth(userCred.user, "Login realizado", { metodo: "email_senha" });
    } catch (err: any) {
      console.log(
        "[Auth] Usuário não encontrado no Auth. Tentando canal de colaborador...",
      );

      try {
        // --- LOGIN COM EMAIL/SENHA REAL ---
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        
        // 1. FAZ LOGIN NO FIREBASE AUTH COM A SENHA TEMPORÁRIA
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          emailLimpo, 
          password
        );
        
        const firebaseUser = userCredential.user;
        console.log("[Auth] Login Firebase Auth realizado:", firebaseUser.uid);

        // 2. BUSCA DADOS DO COLABORADOR NO FIRESTORE
        const colabsRef = collection(db, "colaboradores");
        const q = query(colabsRef, where("email", "==", emailLimpo));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const colabDoc = snap.docs[0];
          const colabDados = colabDoc.data();
          const uid = colabDoc.id;

          console.log(
            "[Auth] Colaborador localizado. Validando credenciais...",
          );

          // Verifica se a senha temporária está correta
          if (String(colabDados.senhaTemporaria) === String(password)) {
            setUser({
              uid: firebaseUser.uid,
              email: colabDados.email,
              displayName: colabDados.nome,
            } as any);
            setDadosUsuario({
              uid,
              perfil: "colaborador",
              ...colabDados,
            } as any);
            sessionStorage.setItem("colab_uid", uid);

            console.log("[Auth] Login de colaborador realizado com sucesso!");

            // Log da atividade
            logAuth(firebaseUser, "Login realizado", { metodo: "colaborador" });
            return;
          } else {
            // Se a senha estiver errada, faz logout
            await signOut(auth);
            throw new Error("Senha incorreta para este colaborador.");
          }
        } else {
          // Se não achou no Firestore, faz logout
          await signOut(auth);
          throw new Error("Colaborador não encontrado no sistema.");
        }
      } catch (authErr: any) {
        console.error(
          "[Auth] Erro no login do colaborador:",
          authErr.code,
          authErr.message,
        );
        
        // Tradução de erros comuns
        if (authErr.code === "auth/user-not-found") {
          throw new Error("Colaborador não encontrado. Verifique o email.");
        } else if (authErr.code === "auth/wrong-password") {
          throw new Error("Senha incorreta.");
        } else if (authErr.code === "auth/invalid-credential") {
          throw new Error("Email ou senha incorretos.");
        }
        
        throw authErr;
      }

      // Se nada acima funcionou, joga o erro original (E-mail não encontrado)
      throw err;
    }
  };

  const logout = async () => {
    // Log antes de deslogar
    if (user) {
      logAuth(user, 'Logout realizado', {});
    }
    sessionStorage.removeItem('colab_uid');
    setDadosUsuario(null);
    setUser(null);
    await signOut(auth);
  };

  const ehProfissional =
    dadosUsuario?.perfil === "profissional" ||
    dadosUsuario?.tipo === "profissional";
  // Efeito para logar navegação quando perfil muda
  useEffect(() => {
    if (dadosUsuario && !loading) {
      logNavegacao(
        {
          uid: dadosUsuario.uid,
          nome: dadosUsuario.nome,
          tipo: dadosUsuario.perfil,
          codigoConecta: dadosUsuario.codigoConecta,
        },
        "Dashboard",
        { 
          perfil: dadosUsuario.perfil, 
          ...(dadosUsuario.planoAtivo && { plano: dadosUsuario.planoAtivo })
        },
      );
    }
  }, [dadosUsuario, loading]);

  const ehAdmin =
    dadosUsuario?.perfil === "admin" || dadosUsuario?.isAdmin === true;
  
  const ehColaborador =
    dadosUsuario?.perfil === "colaborador" || (typeof window !== 'undefined' && !!sessionStorage.getItem('colab_uid'));

  return (
    <AuthContext.Provider
      value={{
        user,
        dadosUsuario,
        loading,
        ehProfissional,
        ehAdmin,
        ehColaborador,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
