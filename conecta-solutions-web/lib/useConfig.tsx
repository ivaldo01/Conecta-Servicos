'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { doc, onSnapshot, getDoc, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

// Interface das configurações
export interface ConfiguracoesSistema {
  geral: {
    nomePlataforma: string;
    emailSuporte: string;
    telefoneSuporte: string;
    timezone: string;
    idiomaPadrao: string;
  };
  notificacoes: {
    emailAtivado: boolean;
    pushAtivado: boolean;
    smsAtivado: boolean;
    notificarNovoCadastro: boolean;
    notificarNovoAgendamento: boolean;
    notificarPagamento: boolean;
  };
  pagamentos: {
    gatewayPadrao: string;
    moedaPadrao: string;
    taxaServico: number;
    pagamentoAntecipado: boolean;
  };
  seguranca: {
    autenticacaoDupla: boolean;
    timeoutSessao: number;
    tentativasLogin: number;
  };
}

// Valores padrão (fallback)
const defaultConfig: ConfiguracoesSistema = {
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

// Contexto
interface ConfigContextType {
  config: ConfiguracoesSistema;
  loading: boolean;
  error: string | null;
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  loading: true,
  error: null,
});

// Provider
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConfiguracoesSistema>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[ConfigProvider] Iniciando listener de configurações...');
    
    const unsubscribe = onSnapshot(
      doc(db, 'configuracoes', 'sistema'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          console.log('[ConfigProvider] Configurações carregadas:', data);
          
          // Merge com valores padrão para garantir que todos os campos existam
          setConfig({
            geral: { ...defaultConfig.geral, ...data.geral },
            notificacoes: { ...defaultConfig.notificacoes, ...data.notificacoes },
            pagamentos: { ...defaultConfig.pagamentos, ...data.pagamentos },
            seguranca: { ...defaultConfig.seguranca, ...data.seguranca },
          });
        } else {
          console.log('[ConfigProvider] Documento não existe, usando padrão');
          setConfig(defaultConfig);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[ConfigProvider] Erro ao carregar configurações:', err);
        setError('Erro ao carregar configurações');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook para usar configurações
export function useConfig() {
  return useContext(ConfigContext);
}

// Função auxiliar para usar fora de componentes React (APIs, etc.)
export async function getConfigServerSide(): Promise<ConfiguracoesSistema> {
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
    console.error('[getConfigServerSide] Erro:', error);
    return defaultConfig;
  }
}
