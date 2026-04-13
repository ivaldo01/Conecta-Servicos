'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle, Calendar, Wallet } from 'lucide-react';
import '@/styles/financeiro.css';

// ============================================================
// TIPOS
// ============================================================
interface Transacao {
  id: string;
  tipo?: 'entrada' | 'saida';
  descricao?: string;
  valor?: any;
  data?: any;
  status?: string;
  clienteNome?: string;
  servico?: string;
}

interface DadoGrafico {
  dia: string;
  receita: number;
}

// ============================================================
// COMPONENTE FINANCEIRO - Versão Blindada
// ============================================================
export default function FinanceiroPage() {
  const { dadosUsuario } = useAuth();
  const [transacoes, setTransacoes]     = useState<Transacao[]>([]);
  const [saldo, setSaldo]               = useState<number>(0);
  const [loading, setLoading]           = useState(true);
  const [periodoFiltro, setPeriodoFiltro] = useState<'7' | '30' | '90'>('30');

  const carregarDados = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      // 1. Carrega saldo
      const saldoSnap = await getDocs(
        query(collection(db, 'saldos'), where('usuarioId', '==', dadosUsuario.uid))
      );
      if (!saldoSnap.empty) {
        setSaldo(Number(saldoSnap.docs[0].data().saldo) || 0);
      }

      // 2. Carrega transações
      const q = query(
        collection(db, 'transacoes'),
        where('profissionalId', '==', dadosUsuario.uid),
        orderBy('data', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      setTransacoes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transacao)));
      
    } catch (err) {
      console.error('[Financeiro]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // Converte data do Firestore com segurança
  const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (v.toDate && typeof v.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  // Formata valor monetário com segurança
  const fmtBRL = (v: any) => {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtra transações pelo período
  const diasFiltro = parseInt(periodoFiltro);
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - diasFiltro);

  const transacoesFiltradas = transacoes.filter(t => {
    const d = toDate(t.data);
    return d && d >= dataCorte;
  });

  // KPIs
  const receitaPeriodo = transacoesFiltradas
    .filter(t => t.tipo === 'entrada')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const saidaPeriodo = transacoesFiltradas
    .filter(t => t.tipo === 'saida')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  // Gráfico
  const dadosGrafico: DadoGrafico[] = (() => {
    const mapa: Record<string, number> = {};
    transacoesFiltradas.filter(t => t.tipo === 'entrada').forEach(t => {
      const d = toDate(t.data);
      if (d) {
        const chave = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        mapa[chave] = (mapa[chave] || 0) + (Number(t.valor) || 0);
      }
    });
    return Object.entries(mapa).map(([dia, receita]) => ({ dia, receita }));
  })();

  return (
    <div className="financeiro-page-premium">
      <Topbar title="Gestão Financeira" subtitle="Controle analítico de receitas e fluxo de capital" />

      <div className="financeiro-container-premium">
        
        {/* ===== CARDS DE ALTO IMPACTO (KPIs) ===== */}
        <section className="fin-analytics-grid">
          <div className="fin-kpi-enterprise-card balance">
            <div className="kpi-icon-wrap"><Wallet size={24} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Saldo Disponível</span>
              <h2 className="kpi-value-main">{fmtBRL(saldo)}</h2>
              <button className="btn-saque-premium" onClick={() => alert('Assinatura Premium Necessária para saques imediatos (Simulação)')}>
                <DollarSign size={14} /> Solicitar Saque
              </button>
            </div>
            <div className="kpi-accent-bg azul" />
          </div>

          <div className="fin-kpi-enterprise-card revenue">
            <div className="kpi-icon-wrap"><ArrowUpCircle size={24} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Entradas ({periodoFiltro} dias)</span>
              <h2 className="kpi-value-main">{fmtBRL(receitaPeriodo)}</h2>
            </div>
            <div className="kpi-accent-bg verde" />
          </div>

          <div className="fin-kpi-enterprise-card outcome">
            <div className="kpi-icon-wrap"><ArrowDownCircle size={24} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Saídas ({periodoFiltro} dias)</span>
              <h2 className="kpi-value-main">{fmtBRL(saidaPeriodo)}</h2>
            </div>
            <div className="kpi-accent-bg vermelho" />
          </div>

          <div className="fin-kpi-enterprise-card volume">
            <div className="kpi-icon-wrap"><TrendingUp size={24} /></div>
            <div className="kpi-content">
              <span className="kpi-label">Volume Transações</span>
              <h2 className="kpi-value-main">{transacoesFiltradas.length}</h2>
            </div>
            <div className="kpi-accent-bg roxo" />
          </div>
        </section>

        <div className="fin-business-dashboard">
          
          {/* PAINEL DE GRÁFICOS (BI) */}
          <section className="fin-chart-enterprise-panel">
            <div className="panel-header-premium">
              <div className="header-text">
                <h3 className="panel-title-premium">Performance Operacional</h3>
                <p className="panel-hint-premium">Visualização de receita bruta por período</p>
              </div>
              <div className="period-tabs-premium">
                {(['7', '30', '90'] as const).map(p => (
                  <button
                    key={p}
                    className={`tab-btn-premium ${periodoFiltro === p ? 'active' : ''}`}
                    onClick={() => setPeriodoFiltro(p)}
                  >
                    {p}D
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-body-premium">
              {loading ? <div className="loading-chart-skeleton" /> : (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94A3B8'}} tickFormatter={v => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => [fmtBRL(v), 'Receita']}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* PAINEL DE HISTÓRICO (BANKING) */}
          <section className="fin-history-enterprise-panel">
            <div className="panel-header-premium">
              <h3 className="panel-title-premium">Últimas Transações</h3>
              <Calendar size={18} className="text-slate-300" />
            </div>

            <div className="history-list-premium">
              {loading ? (
                <div className="loading-history-premium">Processando extrato...</div>
              ) : transacoesFiltradas.length === 0 ? (
                <div className="empty-history-premium">Sem movimentações no período.</div>
              ) : (
                transacoesFiltradas.map(t => {
                  const dataT = toDate(t.data);
                  const isEntrada = t.tipo === 'entrada';
                  return (
                    <div key={t.id} className="transaction-row-premium">
                      <div className={`status-marker ${isEntrada ? 'in' : 'out'}`} />
                      <div className="row-main-info">
                        <p className="row-desc-premium">{t.descricao || t.servico || 'Transação do Sistema'}</p>
                        <p className="row-meta-premium">
                          {t.clienteNome ? `${t.clienteNome} • ` : ''}
                          {dataT ? dataT.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : 'Data Indefinida'}
                        </p>
                      </div>
                      <div className={`row-value-premium ${isEntrada ? 'positive' : 'negative'}`}>
                        {isEntrada ? '+' : '-'} {fmtBRL(t.valor)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
