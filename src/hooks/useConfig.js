import { useState, useEffect, useContext, createContext } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Valores padrão
const defaultConfig = {
  geral: {
    nomePlataforma: 'Conecta Solutions',
    emailSuporte: 'suporte@conectasolutions.com',
    telefoneSuporte: '',
    timezone: 'America/Sao_Paulo',
    idiomaPadrao: 'pt-BR',
  },
  notificacoes: {
    emailAtivado: true,
    pushAtivado: true,
    smsAtivado: false,
    notificarNovoCadastro: true,
    notificarNovoAgendamento: true,
    notificarPagamento: true,
  },
  pagamentos: {
    gatewayPadrao: 'stripe',
    moedaPadrao: 'BRL',
    taxaServico: 10,
    pagamentoAntecipado: false,
  },
  seguranca: {
    autenticacaoDupla: false,
    timeoutSessao: 60,
    tentativasLogin: 5,
  },
};

// Criar contexto
const ConfigContext = createContext({
  config: defaultConfig,
  loading: true,
  error: null,
});

// Provider
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('[Mobile ConfigProvider] Aguardando autenticação...');

    const auth = getAuth();
    let configUnsubscribe = null;

    // Só carrega configurações quando usuário estiver autenticado
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('[Mobile ConfigProvider] Usuário autenticado, iniciando listener de configurações...');

        configUnsubscribe = onSnapshot(
          doc(db, 'configuracoes', 'sistema'),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log('[Mobile] Configurações carregadas:', data);

              // Merge com valores padrão
              setConfig({
                geral: { ...defaultConfig.geral, ...data.geral },
                notificacoes: { ...defaultConfig.notificacoes, ...data.notificacoes },
                pagamentos: { ...defaultConfig.pagamentos, ...data.pagamentos },
                seguranca: { ...defaultConfig.seguranca, ...data.seguranca },
              });
            } else {
              console.log('[Mobile] Configurações não existem, usando padrão');
              setConfig(defaultConfig);
            }
            setLoading(false);
          },
          (err) => {
            console.error('[Mobile] Erro ao carregar configurações:', err);
            setError('Erro ao carregar configurações');
            setLoading(false);
          }
        );
      } else {
        console.log('[Mobile ConfigProvider] Sem usuário autenticado, usando configurações padrão');
        // Usa configurações padrão quando não há usuário
        setConfig(defaultConfig);
        setLoading(false);
        // Cancela listener se existir
        if (configUnsubscribe) {
          configUnsubscribe();
          configUnsubscribe = null;
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (configUnsubscribe) {
        configUnsubscribe();
      }
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook
export function useConfig() {
  return useContext(ConfigContext);
}

// Função auxiliar fora de componentes
export async function getConfigServerSide() {
  try {
    const docRef = doc(db, 'configuracoes', 'sistema');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        geral: { ...defaultConfig.geral, ...data.geral },
        notificacoes: { ...defaultConfig.notificacoes, ...data.notificacoes },
        pagamentos: { ...defaultConfig.pagamentos, ...data.pagamentos },
        seguranca: { ...defaultConfig.seguranca, ...data.seguranca },
      };
    }
    return defaultConfig;
  } catch (error) {
    console.error('[Mobile] Erro getConfigServerSide:', error);
    return defaultConfig;
  }
}
