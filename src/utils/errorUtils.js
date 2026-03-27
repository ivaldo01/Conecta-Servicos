import { Alert } from 'react-native';

const DEFAULT_ERROR_TITLE = 'Ops';
const DEFAULT_ERROR_MESSAGE = 'Algo deu errado. Tente novamente.';

function isString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizarTexto(texto, fallback) {
  return isString(texto) ? texto.trim() : fallback;
}

function extrairMensagemFirebase(error) {
  const code = error?.code || '';

  const mapa = {
    'permission-denied': 'Você não tem permissão para acessar estes dados.',
    'unavailable': 'Serviço temporariamente indisponível. Tente novamente.',
    'network-request-failed': 'Falha de conexão. Verifique sua internet.',
    'deadline-exceeded': 'A operação demorou mais do que o esperado. Tente novamente.',
    'not-found': 'Registro não encontrado.',
    'already-exists': 'Este registro já existe.',
    'failed-precondition': 'Não foi possível concluir esta operação agora.',
    'resource-exhausted': 'Limite temporário atingido. Tente novamente em instantes.',
    'unauthenticated': 'Sua sessão expirou. Entre novamente.',
    'invalid-argument': 'Alguns dados enviados são inválidos.',
    'cancelled': 'A operação foi cancelada.',
  };

  if (!code) return null;

  const codeSemPrefixo = code.includes('/') ? code.split('/').pop() : code;
  return mapa[codeSemPrefixo] || null;
}

function extrairMensagemErro(error) {
  if (!error) return null;

  const mensagemFirebase = extrairMensagemFirebase(error);
  if (mensagemFirebase) return mensagemFirebase;

  if (isString(error?.message)) {
    const message = error.message.trim();

    if (
      message.toLowerCase().includes('network') ||
      message.toLowerCase().includes('internet')
    ) {
      return 'Falha de conexão. Verifique sua internet.';
    }

    if (message.toLowerCase().includes('permission')) {
      return 'Você não tem permissão para acessar estes dados.';
    }

    return message;
  }

  return null;
}

export function getErrorMessage(error, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  return normalizarTexto(extrairMensagemErro(error), fallbackMessage);
}

export function logError(contexto, error, extras = null) {
  const titulo = normalizarTexto(contexto, 'Erro');

  if (extras) {
    console.log(`[${titulo}]`, {
      code: error?.code || null,
      message: error?.message || null,
      extras,
      error,
    });
    return;
  }

  console.log(`[${titulo}]`, {
    code: error?.code || null,
    message: error?.message || null,
    error,
  });
}

export function showErrorAlert({
  title = DEFAULT_ERROR_TITLE,
  message = DEFAULT_ERROR_MESSAGE,
  error = null,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
}) {
  const tituloFinal = normalizarTexto(title, DEFAULT_ERROR_TITLE);
  const mensagemFinal = error
    ? getErrorMessage(error, fallbackMessage)
    : normalizarTexto(message, DEFAULT_ERROR_MESSAGE);

  Alert.alert(tituloFinal, mensagemFinal);
}

export function handleAppError({
  context = 'Erro',
  error = null,
  extras = null,
  title = DEFAULT_ERROR_TITLE,
  fallbackMessage = DEFAULT_ERROR_MESSAGE,
  showAlert = true,
}) {
  logError(context, error, extras);

  const mensagemFinal = getErrorMessage(error, fallbackMessage);

  if (showAlert) {
    Alert.alert(normalizarTexto(title, DEFAULT_ERROR_TITLE), mensagemFinal);
  }

  return {
    ok: false,
    message: mensagemFinal,
    originalError: error,
  };
}

export function createSafeAsyncAction(asyncFn, options = {}) {
  return async (...args) => {
    try {
      const result = await asyncFn(...args);
      return {
        ok: true,
        data: result,
      };
    } catch (error) {
      return handleAppError({
        context: options.context || 'Erro assíncrono',
        error,
        extras: options.extras || null,
        title: options.title || DEFAULT_ERROR_TITLE,
        fallbackMessage: options.fallbackMessage || DEFAULT_ERROR_MESSAGE,
        showAlert: options.showAlert !== false,
      });
    }
  };
}

export function getEmptyStateText(tipo = 'default') {
  const mapa = {
    favoritos: 'Você ainda não tem profissionais favoritados.',
    agendamentos: 'Nenhum agendamento encontrado.',
    notificacoes: 'Você ainda não tem notificações.',
    servicos: 'Nenhum serviço cadastrado.',
    busca: 'Nenhum resultado encontrado.',
    financeiro: 'Nenhum dado financeiro disponível.',
    default: 'Nenhum dado disponível no momento.',
  };

  return mapa[tipo] || mapa.default;
}

export function getRetryMessage(acao = 'carregar os dados') {
  return `Não foi possível ${acao}. Tente novamente.`;
}
