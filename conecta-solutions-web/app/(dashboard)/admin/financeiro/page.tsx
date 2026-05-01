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
  limit,
  Timestamp,
  updateDoc,
  setDoc,
  increment,
  serverTimestamp
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
  ArrowUpCircle,
  Plus,
  User
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

// Função para exportar dados para CSV
function exportToCSV(data: any[], filename: string, headers: string[]) {
  const csvRows = [headers.join(';')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(';'));
  }
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function FinanceiroAdminPage() {
  // Dados do Backend
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookLog[]>([]);

  // Função para exportar relatório financeiro
  const exportarRelatorio = () => {
    const data = new Date().toISOString().split('T')[0];
    const assinaturasData = assinaturas.map(a => ({
      'Tipo': 'Assinatura',
      'Usuario': a.userNome || a.userId,
      'Plano': a.planoNome || a.planoId,
      'Status': a.status,
      'Valor': a.valor,
      'BillingType': a.billingType,
      'CriadoEm': a.createdAt?.toDate?.() || a.createdAt
    }));
    
    const pagamentosData = pagamentos.map(p => ({
      'Tipo': 'Pagamento',
      'Usuario': p.userNome || p.userId,
      'Descricao': p.descricao,
      'Status': p.status,
      'Valor': p.valor,
      'CriadoEm': p.createdAt?.toDate?.() || p.createdAt,
      'PagoEm': p.pagoEm?.toDate?.() || p.pagoEm
    }));
    
    const todosDados = [...assinaturasData, ...pagamentosData];
    
    if (todosDados.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }
    
    exportToCSV(
      todosDados,
      `relatorio-financeiro-${data}.csv`,
      ['Tipo', 'Usuario', 'Plano', 'Descricao', 'Status', 'Valor', 'BillingType', 'CriadoEm', 'PagoEm']
    );
    
    alert(`Relatório exportado! ${todosDados.length} registros baixados.`);
  };
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assinaturas' | 'pagamentos' | 'saques' | 'webhooks' | 'agendamentos' | 'saldos'>('agendamentos');
  const [agendamentosPagos, setAgendamentosPagos] = useState([]);
  const [busca, setBusca] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  
  // Modal para adicionar saldo
  const [modalSaldoOpen, setModalSaldoOpen] = useState(false);
  const [saldoUserId, setSaldoUserId] = useState('');
  const [saldoUserName, setSaldoUserName] = useState('');
  const [saldoValor, setSaldoValor] = useState('');
  const [saldoTipo, setSaldoTipo] = useState<'disponivel' | 'pendente' | 'bloqueado'>('disponivel');
  const [loadingSaldo, setLoadingSaldo] = useState(false);
  const [saldos, setSaldos] = useState<any[]>([]);

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

        // Saldos
        const qSaldos = query(collection(db, 'saldos'), orderBy('ultimaAtualizacao', 'desc'));
        const unsubSaldos = onSnapshot(qSaldos, async (snapshot) => {
          console.log(`[Financeiro] Saldos carregados: ${snapshot.docs.length}`);
          const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            try {
              const userDoc = await getDoc(doc(db, 'usuarios', data.usuarioId));
              const userData = userDoc.data();
              return {
                id: docSnap.id,
                ...data,
                userNome: userData?.nome || userData?.razaoSocial || 'Usuário não encontrado'
              };
            } catch (e) {
              return {
                id: docSnap.id,
                ...data,
                userNome: 'Erro ao buscar usuário'
              };
            }
          }));
          setSaldos(data);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar saldos:', error);
        });

        // Agendamentos Pagos (cobranças dos agendamentos) - query simplificada sem orderBy
        const qAgendamentos = query(
          collection(db, 'agendamentos'), 
          where('status', 'in', ['confirmado', 'concluido']),
          where('pagamentoConfirmado', '==', true)
        );
        const unsubAgendamentos = onSnapshot(qAgendamentos, async (snapshot) => {
          console.log(`[Financeiro] Agendamentos pagos carregados: ${snapshot.docs.length}`);
          let data = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const ag = docSnap.data();
            try {
              // Buscar nome do cliente
              let clienteNome = ag.clienteNome || 'Cliente';
              if (ag.clienteId) {
                const cliDoc = await getDoc(doc(db, 'usuarios', ag.clienteId));
                if (cliDoc.exists()) {
                  clienteNome = cliDoc.data().nome || clienteNome;
                }
              }
              
              // Buscar nome do profissional
              let profissionalNome = ag.profissionalNome || ag.colaboradorNome || 'Profissional';
              
              return {
                id: docSnap.id,
                ...ag,
                clienteNome,
                profissionalNome,
                tipo: 'agendamento',
                descricao: `Agendamento: ${ag.servico || ag.servicos?.map(s => s.nome).join(', ') || 'Serviço'}`,
                valor: ag.valorTotal || 0,
                status: ag.pagamentoConfirmado ? 'PAGO' : 'PENDENTE',
                createdAt: ag.dataCriacao,
                pagoEm: ag.dataPagamento,
                dataFiltro: ag.dataFiltro // Para ordenação
              };
            } catch (e) {
              return {
                id: docSnap.id,
                ...ag,
                clienteNome: ag.clienteNome || 'Cliente',
                profissionalNome: ag.profissionalNome || 'Profissional',
                tipo: 'agendamento',
                descricao: `Agendamento: ${ag.servico || 'Serviço'}`,
                valor: ag.valorTotal || 0,
                status: ag.pagamentoConfirmado ? 'PAGO' : 'PENDENTE',
                createdAt: ag.dataCriacao,
                pagoEm: ag.dataPagamento,
                dataFiltro: ag.dataFiltro
              };
            }
          }));
          
          // Ordenar no cliente por data (desc)
          data = data.sort((a, b) => {
            if (!a.dataFiltro) return 1;
            if (!b.dataFiltro) return -1;
            return b.dataFiltro.localeCompare(a.dataFiltro);
          }).slice(0, 100); // Limitar a 100
          
          setAgendamentosPagos(data);
          setLoading(false);
        }, (error) => {
          console.error('[Financeiro] Erro ao carregar agendamentos:', error);
          setLoading(false);
        });

        setLoading(false);

        return () => {
          unsubAssinaturas();
          unsubPagamentos();
          unsubSaques();
          unsubWebhooks();
          unsubSaldos();
          unsubAgendamentos();
        };
      } catch (err) {
        console.error('[Financeiro] Erro geral:', err);
        setError('Erro ao carregar dados. Verifique o console.');
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  // Função para adicionar saldo manualmente
  const adicionarSaldo = async () => {
    if (!saldoUserId || !saldoValor) {
      alert('Preencha todos os campos.');
      return;
    }

    const valorNumerico = parseFloat(saldoValor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      alert('Valor inválido.');
      return;
    }

    setLoadingSaldo(true);
    try {
      const saldoRef = doc(db, 'saldos', saldoUserId);
      const campoSaldo = saldoTipo === 'disponivel' ? 'saldoDisponivel' : 
                         saldoTipo === 'pendente' ? 'saldoPendente' : 'saldoBloqueado';

      // Verifica se o documento existe
      const snap = await getDoc(saldoRef);
      
      if (snap.exists()) {
        // Atualiza saldo existente
        await updateDoc(saldoRef, {
          [campoSaldo]: increment(valorNumerico),
          ultimaAtualizacao: serverTimestamp()
        });
        alert(`Saldo adicionado com sucesso! R$ ${valorNumerico.toFixed(2)} adicionado ao ${campoSaldo} do usuário.`);
      } else {
        // Cria documento de saldo
        await setDoc(saldoRef, {
          usuarioId: saldoUserId,
          saldoDisponivel: saldoTipo === 'disponivel' ? valorNumerico : 0,
          saldoPendente: saldoTipo === 'pendente' ? valorNumerico : 0,
          saldoBloqueado: saldoTipo === 'bloqueado' ? valorNumerico : 0,
          ultimaAtualizacao: serverTimestamp()
        });
        alert(`Documento de saldo criado com sucesso! R$ ${valorNumerico.toFixed(2)} adicionado ao ${campoSaldo}.`);
      }

      // Limpa e fecha modal
      setModalSaldoOpen(false);
      setSaldoUserId('');
      setSaldoUserName('');
      setSaldoValor('');
      setSaldoTipo('disponivel');
    } catch (error) {
      console.error('[Adicionar Saldo] Erro:', error);
      alert('Erro ao adicionar saldo. Verifique o console.');
    } finally {
      setLoadingSaldo(false);
    }
  };

  // Função para abrir modal com usuário pré-selecionado
  const abrirModalSaldo = (userId?: string, userName?: string) => {
    setSaldoUserId(userId || '');
    setSaldoUserName(userName || '');
    setSaldoValor('');
    setSaldoTipo('disponivel');
    setModalSaldoOpen(true);
  };

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
    }).length,
    agendamentosPagos: agendamentosPagos.length,
    receitaAgendamentos: agendamentosPagos.reduce((acc, ag) => acc + (ag.valor || 0), 0)
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
        <button className="btn-primary" onClick={exportarRelatorio}>
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

        <div className="kpi-card success">
          <div className="kpi-icon">
            <CreditCard size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Agendamentos Pagos</span>
            <span className="kpi-value">{stats.agendamentosPagos}</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">
            <DollarSign size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Receita Agendamentos</span>
            <span className="kpi-value">
              {stats.receitaAgendamentos.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </span>
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
          className={`tab-btn ${activeTab === 'agendamentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('agendamentos')}
        >
          <Calendar size={16} />
          Agendamentos ({agendamentosPagos.length})
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
        <button 
          className={`tab-btn ${activeTab === 'saldos' ? 'active' : ''}`}
          onClick={() => setActiveTab('saldos')}
        >
          <Wallet size={16} />
          Saldos ({saldos.length})
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

      {/* Tabela Agendamentos Pagos */}
      {activeTab === 'agendamentos' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Profissional</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Status Pagamento</th>
                <th>Data Agendamento</th>
                <th>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {agendamentosPagos.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell"><div className="empty-state"><Calendar size={48} /><p>Nenhum agendamento pago encontrado</p></div></td></tr>
              ) : (
                agendamentosPagos
                  .filter(ag => ag.clienteNome?.toLowerCase().includes(busca.toLowerCase()) || ag.profissionalNome?.toLowerCase().includes(busca.toLowerCase()))
                  .map(ag => (
                    <tr key={ag.id}>
                      <td>{ag.clienteNome}</td>
                      <td>{ag.profissionalNome}</td>
                      <td>{ag.descricao}</td>
                      <td>R$ {(ag.valor || 0).toFixed(2)}</td>
                      <td><span className={`status-badge ${ag.status === 'PAGO' ? 'RECEIVED' : 'PENDING'}`}>{ag.status}</span></td>
                      <td>{ag.data} {ag.horario}</td>
                      <td>{ag.pagoEm ? new Date(ag.pagoEm?.toDate?.() || ag.pagoEm).toLocaleDateString('pt-BR') : '-'}</td>
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

      {/* Tabela Saldos */}
      {activeTab === 'saldos' && (
        <div className="data-table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>Saldos dos Usuários</h3>
            <button className="btn-primary" onClick={() => abrirModalSaldo()}>
              <Plus size={16} />
              Adicionar Saldo
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>User ID</th>
                <th>Saldo Disponível</th>
                <th>Saldo Pendente</th>
                <th>Saldo Bloqueado</th>
                <th>Última Atualização</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {saldos.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell"><div className="empty-state"><Wallet size={48} /><p>Nenhum saldo encontrado</p></div></td></tr>
              ) : (
                saldos
                  .filter(s => s.userNome?.toLowerCase().includes(busca.toLowerCase()))
                  .map(s => (
                    <tr key={s.id}>
                      <td>{s.userNome}</td>
                      <td><code className="code-small">{s.usuarioId?.slice(0, 15)}...</code></td>
                      <td style={{ color: '#16A34A', fontWeight: '600' }}>R$ {(s.saldoDisponivel || 0).toFixed(2)}</td>
                      <td style={{ color: '#F59E0B', fontWeight: '600' }}>R$ {(s.saldoPendente || 0).toFixed(2)}</td>
                      <td style={{ color: '#EF4444', fontWeight: '600' }}>R$ {(s.saldoBloqueado || 0).toFixed(2)}</td>
                      <td>{formatDate(s.ultimaAtualizacao)}</td>
                      <td>
                        <button 
                          className="btn-small"
                          onClick={() => abrirModalSaldo(s.usuarioId, s.userNome)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Plus size={12} />
                          Adicionar
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Adicionar Saldo */}
      {modalSaldoOpen && (
        <div className="modal-overlay" onClick={() => setModalSaldoOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Adicionar Saldo</h3>
              <button onClick={() => setModalSaldoOpen(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ID do Usuário</label>
                <input
                  type="text"
                  value={saldoUserId}
                  onChange={(e) => setSaldoUserId(e.target.value)}
                  placeholder="ID do usuário no Firebase"
                />
              </div>
              {saldoUserName && (
                <div className="form-group">
                  <label>Nome do Usuário</label>
                  <input
                    type="text"
                    value={saldoUserName}
                    onChange={(e) => setSaldoUserName(e.target.value)}
                    placeholder="Nome do usuário"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={saldoValor}
                  onChange={(e) => setSaldoValor(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Tipo de Saldo</label>
                <select
                  value={saldoTipo}
                  onChange={(e) => setSaldoTipo(e.target.value as any)}
                >
                  <option value="disponivel">Saldo Disponível</option>
                  <option value="pendente">Saldo Pendente</option>
                  <option value="bloqueado">Saldo Bloqueado</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary" 
                onClick={() => setModalSaldoOpen(false)}
                disabled={loadingSaldo}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={adicionarSaldo}
                disabled={loadingSaldo}
              >
                {loadingSaldo ? 'Processando...' : 'Adicionar Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
