import { db } from './firebase';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

interface UserInfo {
  uid?: string;
  nome?: string;
  displayName?: string;
  email?: string;
  tipo?: 'cliente' | 'profissional' | 'admin';
  role?: 'cliente' | 'profissional' | 'admin';
}

interface ActivityLogData {
  userId?: string;
  userNome?: string;
  userEmail?: string;
  tipoUsuario?: 'cliente' | 'profissional' | 'admin';
  acao: string;
  categoria: 'auth' | 'agendamento' | 'pagamento' | 'perfil' | 'navegacao' | 'chat' | 'sistema';
  plataforma: 'mobile' | 'web' | 'desktop';
  detalhes?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  localizacao?: string;
}

/**
 * Registra uma atividade do usuário para monitoramento em tempo real
 */
export const logActivity = async (data: ActivityLogData) => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      ...data,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    console.log(`[ActivityLogger] Log registrado: ${data.acao}`);
  } catch (error) {
    console.error('[ActivityLogger] Erro ao registrar:', error);
    // Silently fail - não quebra a experiência do usuário
  }
};

// Helpers pré-definidos
export const logAuth = (user: UserInfo | null, acao: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome || user?.displayName,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || user?.role || 'cliente',
    acao,
    categoria: 'auth',
    plataforma: 'web',
    detalhes
  });

export const logNavegacao = (user: UserInfo | null, pagina: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || 'cliente',
    acao: `Acessou ${pagina}`,
    categoria: 'navegacao',
    plataforma: 'web',
    detalhes: { pagina, ...detalhes }
  });

export const logAgendamento = (user: UserInfo | null, acao: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || 'cliente',
    acao,
    categoria: 'agendamento',
    plataforma: 'web',
    detalhes
  });

export const logPagamento = (user: UserInfo | null, acao: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || 'cliente',
    acao,
    categoria: 'pagamento',
    plataforma: 'web',
    detalhes
  });

export const logPerfil = (user: UserInfo | null, acao: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || 'cliente',
    acao,
    categoria: 'perfil',
    plataforma: 'web',
    detalhes
  });

export const logChat = (user: UserInfo | null, acao: string, detalhes?: Record<string, unknown>) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || 'cliente',
    acao,
    categoria: 'chat',
    plataforma: 'web',
    detalhes
  });

export default logActivity;
