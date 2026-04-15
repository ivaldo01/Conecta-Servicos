'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Wallet,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Crown,
  Calendar,
  Zap,
  RefreshCw,
  ExternalLink,
  Webhook,
  ArrowUpCircle
} from 'lucide-react';
import '@/styles/admin-financeiro.css';

// Interfaces do Backend
interface Assinatura {
  id: string;
  userId: string;
  userNome?: string;
  planoId: string;
  planoNome?: string;
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
  valor: number;
  asaasSubscriptionId?: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  createdAt: any;
  updatedAt?: any;
  ultimoPagamento?: any;
  proximoVencimento?: any;
}

interface Pagamento {
  id: string;
  userId: string;
  userNome?: string;
  tipo: 'assinatura' | 'agendamento';
  valor: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  descricao: string;
  asaasPaymentId?: string;
  qrCode?: string;
  copiaECola?: string;
  createdAt: any;
  pagoEm?: any;
}

interface Saque {
  id: string;
  userId: string;
  userNome?: string;
  valor: number;
  pixKey: string;
  status: 'pendente' | 'processado' | 'erro';
  asaasTransferId?: string;
  createdAt: any;
  processadoEm?: any;
}

interface WebhookLog {
  id: string;
  eventType: string;
  paymentId?: string;
  subscriptionId?: string;
  userId?: string;
  payload: any;
  processed: boolean;
  error?: string;
  receivedAt: any;
}

export default function FinanceiroAdminPage() {
  // Dados do Backend
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assinaturas' | 'pagamentos' | 'saques' | 'webhooks'>('assinaturas');
  const [busca, setBusca] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Buscar dados do Backend (Firestore)
  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('[Financeiro] Iniciando carregamento...');
        
        // Assinaturas
        const qAssinaturas = query(collection(db, 'assinaturas'), orderBy('createdAt', 'desc'));
        const unsubAssinaturas = onSnapshot(qAssinaturas, async (snapshot) => {
          console.log(`[Financeiro] Assinaturas carregadas: ${snapshot.docs.length}`);
          const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            try {
              const userDoc = await getDoc(doc(db, 'usuarios', data.userId));
              const userData = userDoc.data();
              return {
                id: docSnap.id,
                ...data,
                userNome: userData?.nome || userData?.razaoSocial || 'Usuário não encontrado'
              } as Assinatura;
            } catch (e) {
              return {
                id: docSnap.id,
                ...data,
                userNome: 'Erro ao buscar usuário'
              } as Assinatura;
            }
          }));
          setAssinaturas(data);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar assinaturas:', error);
          setError('Erro de permissão ao carregar assinaturas. Verifique as regras do Firebase.');
        });

        // Pagamentos
        const qPagamentos = query(collection(db, 'pagamentos'), orderBy('createdAt', 'desc'));
        const unsubPagamentos = onSnapshot(qPagamentos, async (snapshot) => {
          console.log(`[Financeiro] Pagamentos carregados: ${snapshot.docs.length}`);
          const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            try {
              const userDoc = await getDoc(doc(db, 'usuarios', data.userId));
              const userData = userDoc.data();
              return {
                id: docSnap.id,
                ...data,
                userNome: userData?.nome || userData?.razaoSocial || 'Usuário não encontrado'
              } as Pagamento;
            } catch (e) {
              return {
                id: docSnap.id,
                ...data,
                userNome: 'Erro ao buscar usuário'
              } as Pagamento;
            }
          }));
          setPagamentos(data);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar pagamentos:', error);
        });

        // Saques
        const qSaques = query(collection(db, 'saques'), orderBy('createdAt', 'desc'));
        const unsubSaques = onSnapshot(qSaques, async (snapshot) => {
          console.log(`[Financeiro] Saques carregados: ${snapshot.docs.length}`);
          const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            try {
              const userDoc = await getDoc(doc(db, 'usuarios', data.userId));
              const userData = userDoc.data();
              return {
                id: docSnap.id,
                ...data,
                userNome: userData?.nome || userData?.razaoSocial || 'Profissional não encontrado'
              } as Saque;
            } catch (e) {
              return {
                id: docSnap.id,
                ...data,
                userNome: 'Erro ao buscar usuário'
              } as Saque;
            }
          }));
          setSaques(data);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar saques:', error);
        });

        // Webhook Logs
        const qWebhooks = query(collection(db, 'webhookLogs'), orderBy('receivedAt', 'desc'));
        const unsubWebhooks = onSnapshot(qWebhooks, (snapshot) => {
          console.log(`[Financeiro] Webhooks carregados: ${snapshot.docs.length}`);
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as WebhookLog[];
          setWebhooks(data);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar webhooks:', error);
        });

        setLoading(false);

        return () => {
          unsubAssinaturas();
          unsubPagamentos();
          unsubSaques();
          unsubWebhooks();
        };
      } catch (err) {
        console.error('[Financeiro] Erro geral:', err);
        setError('Erro ao carregar dados. Verifique o console.');
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Estatísticas
  const stats = {
    assinaturasAtivas: assinaturas.filter(a => a.status === 'ACTIVE').length,
    receitaMensal: assinaturas
      .filter(a => a.status === 'ACTIVE')
      .reduce((acc, a) => acc + a.valor, 0),
    pagamentosPendentes: pagamentos.filter(p => p.status === 'PENDING').length,
    saquesPendentes: saques.filter(s => s.status === 'pendente').length,
    webhooks24h: webhooks.filter(w => {
      const h24 = Date.now() - 24 * 60 * 60 * 1000;
      return w.receivedAt?.toMillis?.() > h24;
    }).length
  };

  // Helpers
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, type: 'assinatura' | 'pagamento' | 'saque') => {
    const styles: Record<string, string> = {
      'ACTIVE': 'status-ativo',
      'PENDING': 'status-pendente',
      'CANCELLED': 'status-cancelado',
      'EXPIRED': 'status-expirado',
      'RECEIVED': 'status-recebido',
      'CONFIRMED': 'status-confirmado',
      'OVERDUE': 'status-atrasado',
      'REFUNDED': 'status-reembolsado',
      'processado': 'status-processado',
      'erro': 'status-erro'
    };
    return styles[status] || 'status-default';
  };

  // Loading
  if (error) {
    return (
      <div className="admin-container">
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ color: '#EF4444', fontSize: '18px' }}>⚠️</span>
          <span style={{ color: '#EF4444', fontSize: '14px' }}>{error}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando dados do financeiro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Monitoramento Backend</h1>
          <p className="admin-subtitle">Visualização das comunicações com Asaas Gateway</p>
        </div>
        <button className="btn-primary" onClick={() => alert('Funcionalidade em desenvolvimento')}>
          <Download size={18} />
          Exportar Relatório
        </button>
      </div>

      {/* KPIs do Backend */}
      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-icon">
            <Crown size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Assinaturas Ativas</span>
            <span className="kpi-value">{stats.assinaturasAtivas}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">
            <DollarSign size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Receita Mensal</span>
            <span className="kpi-value">R$ {stats.receitaMensal.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pagamentos Pendentes</span>
            <span className="kpi-value">{stats.pagamentosPendentes}</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-icon">
            <ArrowUpCircle size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Saques Pendentes</span>
            <span className="kpi-value">{stats.saquesPendentes}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">
            <Webhook size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Webhooks (24h)</span>
            <span className="kpi-value">{stats.webhooks24h}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'assinaturas' ? 'active' : ''}`}
          onClick={() => setActiveTab('assinaturas')}
        >
          <Crown size={16} />
          Assinaturas ({assinaturas.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pagamentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagamentos')}
        >
          <CreditCard size={16} />
          Pagamentos ({pagamentos.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'saques' ? 'active' : ''}`}
          onClick={() => setActiveTab('saques')}
        >
          <ArrowUpCircle size={16} />
          Saques ({saques.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          <Webhook size={16} />
          Webhooks ({webhooks.length})
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="todos">Todos Status</option>
          {activeTab === 'assinaturas' && (
            <>
              <option value="ACTIVE">Ativas</option>
              <option value="PENDING">Pendentes</option>
              <option value="CANCELLED">Canceladas</option>
            </>
          )}
          {activeTab === 'pagamentos' && (
            <>
              <option value="PENDING">Pendentes</option>
              <option value="RECEIVED">Recebidos</option>
              <option value="CONFIRMED">Confirmados</option>
            </>
          )}
          {activeTab === 'saques' && (
            <>
              <option value="pendente">Pendentes</option>
              <option value="processado">Processados</option>
            </>
          )}
        </select>
      </div>

      {/* Tabela Assinaturas */}
      {activeTab === 'assinaturas' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Valor/Mês</th>
                <th>Método</th>
                <th>Criado em</th>
                <th>ID Asaas</th>
              </tr>
            </thead>
            <tbody>
              {assinaturas.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell"><div className="empty-state"><Wallet size={48} /><p>Nenhuma assinatura encontrada</p></div></td></tr>
              ) : (
                assinaturas
                  .filter(a => statusFilter === 'todos' || a.status === statusFilter)
                  .filter(a => a.userNome?.toLowerCase().includes(busca.toLowerCase()))
                  .map(a => (
                    <tr key={a.id}>
                      <td>{a.userNome}</td>
                      <td><span className="badge plano">{a.planoId}</span></td>
                      <td><span className={`status-badge ${getStatusBadge(a.status, 'assinatura')}`}>{a.status}</span></td>
                      <td>R$ {a.valor?.toFixed(2)}</td>
                      <td>{a.billingType}</td>
                      <td>{formatDate(a.createdAt)}</td>
                      <td><code className="code-small">{a.asaasSubscriptionId?.slice(0, 15)}...</code></td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela Pagamentos */}
      {activeTab === 'pagamentos' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell"><div className="empty-state"><CreditCard size={48} /><p>Nenhum pagamento encontrado</p></div></td></tr>
              ) : (
                pagamentos
                  .filter(p => statusFilter === 'todos' || p.status === statusFilter)
                  .filter(p => p.userNome?.toLowerCase().includes(busca.toLowerCase()))
                  .map(p => (
                    <tr key={p.id}>
                      <td>{p.userNome}</td>
                      <td><span className="badge">{p.tipo}</span></td>
                      <td>{p.descricao}</td>
                      <td>R$ {p.valor?.toFixed(2)}</td>
                      <td><span className={`status-badge ${getStatusBadge(p.status, 'pagamento')}`}>{p.status}</span></td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>{formatDate(p.pagoEm)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela Saques */}
      {activeTab === 'saques' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Valor</th>
                <th>Chave PIX</th>
                <th>Status</th>
                <th>Solicitado em</th>
                <th>Processado em</th>
              </tr>
            </thead>
            <tbody>
              {saques.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell"><div className="empty-state"><ArrowUpCircle size={48} /><p>Nenhum saque encontrado</p></div></td></tr>
              ) : (
                saques
                  .filter(s => statusFilter === 'todos' || s.status === statusFilter)
                  .filter(s => s.userNome?.toLowerCase().includes(busca.toLowerCase()))
                  .map(s => (
                    <tr key={s.id}>
                      <td>{s.userNome}</td>
                      <td>R$ {s.valor?.toFixed(2)}</td>
                      <td><code>{s.pixKey}</code></td>
                      <td><span className={`status-badge ${getStatusBadge(s.status, 'saque')}`}>{s.status}</span></td>
                      <td>{formatDate(s.createdAt)}</td>
                      <td>{formatDate(s.processadoEm)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Payment ID</th>
                <th>User ID</th>
                <th>Processado</th>
                <th>Recebido em</th>
                <th>Erro</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell"><div className="empty-state"><Webhook size={48} /><p>Nenhum webhook recebido</p></div></td></tr>
              ) : (
                webhooks
                  .filter(w => w.eventType?.toLowerCase().includes(busca.toLowerCase()))
                  .map(w => (
                    <tr key={w.id}>
                      <td><span className="badge webhook">{w.eventType}</span></td>
                      <td><code className="code-small">{w.paymentId?.slice(0, 20)}...</code></td>
                      <td><code className="code-small">{w.userId?.slice(0, 15)}...</code></td>
                      <td>{w.processed ? <CheckCircle size={16} className="text-success"/> : <XCircle size={16} className="text-danger"/>}</td>
                      <td>{formatDate(w.receivedAt)}</td>
                      <td>{w.error ? <span className="text-danger">{w.error}</span> : '-'}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
