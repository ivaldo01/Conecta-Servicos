'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Settings,
  Save,
  Globe,
  Bell,
  Mail,
  CreditCard,
  Shield,
  Database,
  Palette,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import '@/styles/admin-ajustes.css';

interface Configuracoes {
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
    sessaoTimeout: number;
    tentativasLogin: number;
    ipBloqueado: string[];
  };
}

export default function AjustesPage() {
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{tipo: 'sucesso' | 'erro', texto: string} | null>(null);
  const [abaAtiva, setAbaAtiva] = useState('geral');

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    const docRef = doc(db, 'configuracoes', 'sistema');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      setConfig(docSnap.data() as Configuracoes);
    } else {
      // Configurações padrão
      setConfig({
        geral: {
          nomePlataforma: 'Conecta Solutions',
          emailSuporte: 'suporte@conectasolutions.com.br',
          telefoneSuporte: '(11) 4000-1234',
          timezone: 'America/Sao_Paulo',
          idiomaPadrao: 'pt-BR'
        },
        notificacoes: {
          emailAtivado: true,
          pushAtivado: true,
          smsAtivado: false,
          notificarNovoCadastro: true,
          notificarNovoAgendamento: true,
          notificarPagamento: true
        },
        pagamentos: {
          gatewayPadrao: 'asaas',
          moedaPadrao: 'BRL',
          taxaServico: 5,
          pagamentoAntecipado: false
        },
        seguranca: {
          autenticacaoDupla: false,
          sessaoTimeout: 30,
          tentativasLogin: 5,
          ipBloqueado: []
        }
      });
    }
    setLoading(false);
  };

  const salvarConfiguracoes = async () => {
    if (!config) return;
    setSalvando(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'sistema'), config);
      setMensagem({ tipo: 'sucesso', texto: 'Configurações salvas com sucesso!' });
      setTimeout(() => setMensagem(null), 3000);
    } catch (error) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações' });
    }
    setSalvando(false);
  };

  const atualizarCampo = (secao: keyof Configuracoes, campo: string, valor: any) => {
    if (!config) return;
    setConfig({
      ...config,
      [secao]: {
        ...config[secao],
        [campo]: valor
      }
    });
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <RefreshCw className="animate-spin" size={32} />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Configurações do Sistema</h1>
          <p className="admin-subtitle">Ajustes gerais - Quartel General</p>
        </div>
        <button 
          className="btn-primary"
          onClick={salvarConfiguracoes}
          disabled={salvando}
        >
          {salvando ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {mensagem && (
        <div className={`alert ${mensagem.tipo}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          {mensagem.texto}
        </div>
      )}

      <div className="ajustes-layout">
        {/* Menu Lateral */}
        <div className="ajustes-menu">
          <button 
            className={`menu-item ${abaAtiva === 'geral' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('geral')}
          >
            <Globe size={18} />
            Geral
          </button>
          <button 
            className={`menu-item ${abaAtiva === 'notificacoes' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('notificacoes')}
          >
            <Bell size={18} />
            Notificações
          </button>
          <button 
            className={`menu-item ${abaAtiva === 'pagamentos' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('pagamentos')}
          >
            <CreditCard size={18} />
            Pagamentos
          </button>
          <button 
            className={`menu-item ${abaAtiva === 'seguranca' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('seguranca')}
          >
            <Shield size={18} />
            Segurança
          </button>
        </div>

        {/* Conteúdo */}
        <div className="ajustes-content">
          {abaAtiva === 'geral' && (
            <div className="config-section">
              <h2>Configurações Gerais</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome da Plataforma</label>
                  <input
                    type="text"
                    value={config.geral.nomePlataforma}
                    onChange={(e) => atualizarCampo('geral', 'nomePlataforma', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>E-mail de Suporte</label>
                  <input
                    type="email"
                    value={config.geral.emailSuporte}
                    onChange={(e) => atualizarCampo('geral', 'emailSuporte', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone de Suporte</label>
                  <input
                    type="tel"
                    value={config.geral.telefoneSuporte}
                    onChange={(e) => atualizarCampo('geral', 'telefoneSuporte', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Timezone</label>
                  <select
                    value={config.geral.timezone}
                    onChange={(e) => atualizarCampo('geral', 'timezone', e.target.value)}
                  >
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Recife">Nordeste (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'notificacoes' && (
            <div className="config-section">
              <h2>Configurações de Notificações</h2>
              <div className="switch-list">
                <label className="switch-item">
                  <input
                    type="checkbox"
                    checked={config.notificacoes.emailAtivado}
                    onChange={(e) => atualizarCampo('notificacoes', 'emailAtivado', e.target.checked)}
                  />
                  <div className="switch-info">
                    <Mail size={18} />
                    <div>
                      <span className="switch-title">Notificações por E-mail</span>
                      <span className="switch-desc">Enviar notificações via e-mail</span>
                    </div>
                  </div>
                </label>
                <label className="switch-item">
                  <input
                    type="checkbox"
                    checked={config.notificacoes.pushAtivado}
                    onChange={(e) => atualizarCampo('notificacoes', 'pushAtivado', e.target.checked)}
                  />
                  <div className="switch-info">
                    <Smartphone size={18} />
                    <div>
                      <span className="switch-title">Push Notifications</span>
                      <span className="switch-desc">Notificações push no mobile</span>
                    </div>
                  </div>
                </label>
                <label className="switch-item">
                  <input
                    type="checkbox"
                    checked={config.notificacoes.notificarNovoAgendamento}
                    onChange={(e) => atualizarCampo('notificacoes', 'notificarNovoAgendamento', e.target.checked)}
                  />
                  <div className="switch-info">
                    <Bell size={18} />
                    <div>
                      <span className="switch-title">Novo Agendamento</span>
                      <span className="switch-desc">Notificar quando houver novo agendamento</span>
                    </div>
                  </div>
                </label>
                <label className="switch-item">
                  <input
                    type="checkbox"
                    checked={config.notificacoes.notificarPagamento}
                    onChange={(e) => atualizarCampo('notificacoes', 'notificarPagamento', e.target.checked)}
                  />
                  <div className="switch-info">
                    <CreditCard size={18} />
                    <div>
                      <span className="switch-title">Confirmação de Pagamento</span>
                      <span className="switch-desc">Notificar quando pagamento for confirmado</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {abaAtiva === 'pagamentos' && (
            <div className="config-section">
              <h2>Configurações de Pagamento</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Gateway de Pagamento</label>
                  <select
                    value={config.pagamentos.gatewayPadrao}
                    onChange={(e) => atualizarCampo('pagamentos', 'gatewayPadrao', e.target.value)}
                  >
                    <option value="asaas">Asaas</option>
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="stripe">Stripe</option>
                    <option value="pagarme">Pagar.me</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Taxa de Serviço (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.pagamentos.taxaServico}
                    onChange={(e) => atualizarCampo('pagamentos', 'taxaServico', Number(e.target.value))}
                  />
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={config.pagamentos.pagamentoAntecipado}
                      onChange={(e) => atualizarCampo('pagamentos', 'pagamentoAntecipado', e.target.checked)}
                    />
                    Permitir pagamento antecipado
                  </label>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'seguranca' && (
            <div className="config-section">
              <h2>Configurações de Segurança</h2>
              <div className="switch-list">
                <label className="switch-item">
                  <input
                    type="checkbox"
                    checked={config.seguranca.autenticacaoDupla}
                    onChange={(e) => atualizarCampo('seguranca', 'autenticacaoDupla', e.target.checked)}
                  />
                  <div className="switch-info">
                    <Shield size={18} />
                    <div>
                      <span className="switch-title">Autenticação em Dois Fatores</span>
                      <span className="switch-desc">Obrigar 2FA para administradores</span>
                    </div>
                  </div>
                </label>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Timeout de Sessão (minutos)</label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={config.seguranca.sessaoTimeout}
                    onChange={(e) => atualizarCampo('seguranca', 'sessaoTimeout', Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>Tentativas de Login (antes do bloqueio)</label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={config.seguranca.tentativasLogin}
                    onChange={(e) => atualizarCampo('seguranca', 'tentativasLogin', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
