import { db } from './firebaseConfig';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';

/**
 * Remove recursivamente todos os campos undefined de um objeto
 */
function removeUndefined(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(v => v !== undefined);
  }

  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }
    return result;
  }

  return obj;
}

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
  detalhes,
  plataforma = 'mobile'
}) => {
  try {
    const data = removeUndefined({
      userId,
      userNome,
      userEmail,
      tipoUsuario,
      acao,
      categoria,
      detalhes,
      plataforma
    });

    await addDoc(collection(db, 'activityLogs'), {
      ...data,
      timestamp: serverTimestamp(),
      deviceInfo: Platform.OS === 'ios' ? 'iOS' : 'Android',
      createdAt: new Date().toISOString()
    });
    console.log(`[ActivityLogger] Log registrado: ${acao}`);
  } catch (error) {
    console.error('[ActivityLogger] Erro ao registrar:', error);
    // Não quebra o app se falhar
  }
};

// Helpers pré-definidos para facilitar uso
export const logAuth = (user, acao, detalhes = {}) =>
  logActivity({
    userId: user?.codigoConecta || user?.uid,
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
    userId: user?.codigoConecta || user?.uid,
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
    userId: user?.codigoConecta || user?.uid,
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
    userId: user?.codigoConecta || user?.uid,
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
    userId: user?.codigoConecta || user?.uid,
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
    userId: user?.codigoConecta || user?.uid,
    userNome: user?.nome,
    userEmail: user?.email,
    tipoUsuario: user?.tipo,
    acao,
    categoria: 'chat',
    detalhes,
    plataforma: 'mobile'
  });

export default logActivity;
