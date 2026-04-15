'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
  doc,
  updateDoc
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
  Filter,
  Calendar,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import '@/styles/admin-financeiro.css';

interface Transacao {
  id: string;
  tipo: 'recebimento' | 'pagamento' | 'reembolso' | 'taxa';
  valor: number;
  descricao: string;
  status: 'pendente' | 'confirmado' | 'cancelado' | 'estornado';
  data: any;
  usuarioId: string;
  usuarioNome: string;
  usuarioTipo: 'cliente' | 'profissional';
  metodoPagamento: 'pix' | 'cartao' | 'boleto' | 'dinheiro';
  referenciaExterna?: string;
}

export default function FinanceiroAdminPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'transacoes'),
      orderBy('data', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transacao[];
      setTransacoes(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const transacoesFiltradas = transacoes.filter(t => {
    const matchBusca = t.usuarioNome.toLowerCase().includes(busca.toLowerCase()) ||
                      t.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === 'todos' || t.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const stats = {
    totalRecebido: transacoes
      .filter(t => t.tipo === 'recebimento' && t.status === 'confirmado')
      .reduce((acc, t) => acc + t.valor, 0),
    totalPago: transacoes
      .filter(t => t.tipo === 'pagamento' && t.status === 'confirmado')
      .reduce((acc, t) => acc + t.valor, 0),
    pendente: transacoes
      .filter(t => t.status === 'pendente')
      .reduce((acc, t) => acc + t.valor, 0),
    transacoesHoje: transacoes.filter(t => {
      const hoje = new Date().toDateString();
      return t.data?.toDate?.().toDateString() === hoje;
    }).length
  };

  const confirmarTransacao = async (id: string) => {
    await updateDoc(doc(db, 'transacoes', id), { status: 'confirmado' });
  };

  const cancelarTransacao = async (id: string) => {
    await updateDoc(doc(db, 'transacoes', id), { status: 'cancelado' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado': return <CheckCircle size={16} className="status-confirmado" />;
      case 'cancelado': return <XCircle size={16} className="status-cancelado" />;
      case 'pendente': return <Clock size={16} className="status-pendente" />;
      case 'estornado': return <AlertTriangle size={16} className="status-estornado" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Faturamento Global</h1>
          <p className="admin-subtitle">Gestão financeira da plataforma - Quartel General</p>
        </div>
        <button className="btn-primary">
          <Download size={18} />
          Exportar Relatório
        </button>
      </div>

      {/* KPIs Financeiros */}
      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-icon">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Recebido</span>
            <span className="kpi-value">R$ {stats.totalRecebido.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-icon">
            <TrendingDown size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Pago</span>
            <span className="kpi-value">R$ {stats.totalPago.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">
            <Clock size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Pendente</span>
            <span className="kpi-value">R$ {stats.pendente.toFixed(2)}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">
            <CreditCard size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Transações Hoje</span>
            <span className="kpi-value">{stats.transacoesHoje}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por usuário ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="filtros-group">
          <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
            <option value="hoje">Hoje</option>
            <option value="semana">Esta Semana</option>
            <option value="mes">Este Mês</option>
            <option value="ano">Este Ano</option>
            <option value="todos">Todo Período</option>
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos Status</option>
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
            <option value="estornado">Estornado</option>
          </select>
        </div>
      </div>

      {/* Tabela de Transações */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuário</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Método</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {transacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-cell">
                  <div className="empty-state">
                    <Wallet size={48} />
                    <p>Nenhuma transação encontrada</p>
                  </div>
                </td>
              </tr>
            ) : (
              transacoesFiltradas.map((transacao) => (
                <tr key={transacao.id}>
                  <td>
                    {transacao.data?.toDate?.().toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div className="user-cell">
                      <div className={`avatar-small ${transacao.usuarioTipo}`}>
                        {transacao.usuarioTipo === 'profissional' ? 'P' : 'C'}
                      </div>
                      <span>{transacao.usuarioNome}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge tipo-${transacao.tipo}`}>
                      {transacao.tipo === 'recebimento' ? 'Recebimento' :
                       transacao.tipo === 'pagamento' ? 'Pagamento' :
                       transacao.tipo === 'reembolso' ? 'Reembolso' : 'Taxa'}
                    </span>
                  </td>
                  <td>{transacao.descricao}</td>
                  <td>
                    <span className={`metodo-${transacao.metodoPagamento}`}>
                      {transacao.metodoPagamento.toUpperCase()}
                    </span>
                  </td>
                  <td className={`valor ${transacao.tipo === 'recebimento' ? 'positivo' : 'negativo'}`}>
                    {transacao.tipo === 'recebimento' ? '+' : '-'}
                    R$ {transacao.valor.toFixed(2)}
                  </td>
                  <td>
                    <div className="status-cell">
                      {getStatusIcon(transacao.status)}
                      <span className={`status-text ${transacao.status}`}>
                        {transacao.status.charAt(0).toUpperCase() + transacao.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="acoes-cell">
                      {transacao.status === 'pendente' && (
                        <>
                          <button
                            className="btn-acao confirmar"
                            onClick={() => confirmarTransacao(transacao.id)}
                            title="Confirmar"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="btn-acao cancelar"
                            onClick={() => cancelarTransacao(transacao.id)}
                            title="Cancelar"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
