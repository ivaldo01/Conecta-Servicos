import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Registra uma atividade do usuário para monitoramento em tempo real
 * @param {Object} params
 * @param {string} params.userId - ID do usuário
 * @param {string} params.userNome - Nome do usuário
 * @param {string} params.userEmail - Email do usuário
 * @param {string} params.tipoUsuario - 'cliente' | 'profissional' | 'admin'
 * @param {string} params.acao - Descrição da ação (ex: "Login realizado")
 * @param {string} params.categoria - 'auth' | 'agendamento' | 'pagamento' | 'perfil' | 'navegacao' | 'chat' | 'sistema'
 * @param {Object} params.detalhes - Detalhes adicionais
 * @param {string} params.plataforma - 'mobile' | 'web' | 'desktop'
 */
export const logActivity = async ({
  userId,
  userNome,
  userEmail,
  tipoUsuario,
  acao,
  categoria,
  detalhes = {},
  plataforma = 'mobile'
}) => {
  try {
    const activityData = {
      userId,
      userNome: userNome || 'Usuário',
      userEmail: userEmail || '',
      tipoUsuario: tipoUsuario || 'cliente',
      acao,
      categoria,
      plataforma,
      detalhes,
      timestamp: Timestamp.now(),
      deviceInfo: Platform.OS === 'ios' ? 'iOS' : 'Android',
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'activityLogs'), activityData);
    console.log(`[ActivityLogger] Log registrado: ${acao}`);
  } catch (error) {
    console.error('[ActivityLogger] Erro ao registrar:', error);
    // Não quebra o app se falhar
  }
};

// Helpers pré-definidos para facilitar uso
export const logAuth = (user, acao, detalhes = {}) => 
  logActivity({
    userId: user?.uid,
    userNome: user?.nome || user?.displayName,
    userEmail: user?.email,
    tipoUsuario: user?.tipo || user?.role,
    acao,
    categoria: 'auth',
    detalhes,
    plataforma: 'mobile'
  });

export const logNavegacao = (user, pagina, detalhes = {}) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao: `Acessou ${pagina}`,
    categoria: 'navegacao',
    detalhes: { pagina, ...detalhes },
    plataforma: 'mobile'
  });

export const logAgendamento = (user, acao, detalhes = {}) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao,
    categoria: 'agendamento',
    detalhes,
    plataforma: 'mobile'
  });

export const logPagamento = (user, acao, detalhes = {}) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao,
    categoria: 'pagamento',
    detalhes,
    plataforma: 'mobile'
  });

export const logPerfil = (user, acao, detalhes = {}) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao,
    categoria: 'perfil',
    detalhes,
    plataforma: 'mobile'
  });

export const logChat = (user, acao, detalhes = {}) =>
  logActivity({
    userId: user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao,
    categoria: 'chat',
    detalhes,
    plataforma: 'mobile'
  });

export default logActivity;
