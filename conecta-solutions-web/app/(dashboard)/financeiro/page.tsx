'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, ArrowDownCircle, ArrowUpCircle, Calendar, Wallet, Download, Filter, Search, TrendingDown } from 'lucide-react';
import '@/styles/financeiro.css';

// ============================================================
// TIPOS
// ============================================================
interface Transacao {
  id: string;
  tipo?: 'entrada' | 'saida';
  descricao?: string;
  valor?: number | string | null;
  data?: unknown;
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
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [busca, setBusca] = useState('');

  // Taxa de serviço baseada no plano VIP do profissional
  const getTaxaPorPlano = (plano: string | undefined): number => {
    switch (plano?.toUpperCase()) {
      case 'OURO': return 5;
      case 'PRATA': return 8;
      case 'BRONZE':
      case 'INICIANTE':
      default: return 10;
    }
  };
  const taxaServico = getTaxaPorPlano(dadosUsuario?.planoAtivo);

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
  const toDate = (v: unknown): Date | null => {
    if (!v) return null;
    if (typeof v === 'object' && v !== null && 'toDate' in v && typeof (v as { toDate: () => unknown }).toDate === 'function') {
      return (v as { toDate: () => Date }).toDate();
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d;
  };

  // Formata valor monetário com segurança
  const fmtBRL = (v: string | number | undefined | null) => {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtra transações pelo período e tipo
  const diasFiltro = parseInt(periodoFiltro);
  const dataCorte = new Date();
  dataCorte.setDate(dataCorte.getDate() - diasFiltro);

  // Período anterior para comparação
  const dataCorteAnterior = new Date(dataCorte);
  dataCorteAnterior.setDate(dataCorteAnterior.getDate() - diasFiltro);

  const transacoesFiltradas = transacoes.filter(t => {
    const d = toDate(t.data);
    const matchPeriodo = d && d >= dataCorte;
    const matchTipo = tipoFiltro === 'todos' || t.tipo === tipoFiltro;
    const matchBusca = !busca || 
      t.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      t.clienteNome?.toLowerCase().includes(busca.toLowerCase());
    return matchPeriodo && matchTipo && matchBusca;
  });

  // Transações do período anterior (para comparação)
  const transacoesPeriodoAnterior = transacoes.filter(t => {
    const d = toDate(t.data);
    return d && d >= dataCorteAnterior && d < dataCorte && t.tipo === 'entrada';
  });

  // KPIs
  const receitaPeriodo = transacoesFiltradas
    .filter(t => t.tipo === 'entrada')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const receitaPeriodoAnterior = transacoesPeriodoAnterior
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  const saidaPeriodo = transacoesFiltradas
    .filter(t => t.tipo === 'saida')
    .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

  // Cálculo de variação percentual
  const variacaoPercentual = receitaPeriodoAnterior > 0
    ? ((receitaPeriodo - receitaPeriodoAnterior) / receitaPeriodoAnterior) * 100
    : 0;

  // Gráfico de área (Performance)
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

  // Gráfico de pizza (Distribuição por serviço)
  const dadosPieChart = (() => {
    const mapa: Record<string, number> = {};
    transacoesFiltradas.filter(t => t.tipo === 'entrada').forEach(t => {
      const servico = t.servico || 'Outros';
      mapa[servico] = (mapa[servico] || 0) + (Number(t.valor) || 0);
    });
    const cores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nome, valor], i) => ({ nome, valor, cor: cores[i % cores.length] }));
  })();

  return (
    <div className="financeiro-page-premium">
      <Topbar title="Gestão Financeira" subtitle="Controle analítico de receitas e fluxo de capital" />

      <div className="financeiro-container-premium">

        {/* ===== TAXA DE SERVIÇO DO PLANO VIP ===== */}
        <div style={{ 
          background: '#FEF3C7', 
          borderLeft: '4px solid #F59E0B', 
          padding: '12px 16px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#92400E' }}>
            Plano <strong>{dadosUsuario?.planoAtivo || 'Bronze'}</strong>: Taxa de <strong>{taxaServico}%</strong> sobre cada pagamento
          </span>
        </div>
        
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

          {/* Card de Comparativo Mensal */}
          <div className="comparison-card-premium">
            <div className="comparison-header">Comparativo Período Anterior</div>
            <div className="comparison-value">
              {variacaoPercentual > 0 ? '+' : ''}{variacaoPercentual.toFixed(1)}%
            </div>
            <div className={`comparison-badge ${variacaoPercentual >= 0 ? 'positive' : 'negative'}`}>
              {variacaoPercentual >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {variacaoPercentual >= 0 ? 'Crescimento' : 'Queda'} vs período anterior
            </div>
          </div>

          {/* Card de Taxa do Plano */}
          <div className="tax-info-card">
            <div className="tax-info-header">Taxa de Serviço do Plano</div>
            <div className="tax-info-value">{taxaServico}%</div>
            <div className="tax-info-desc">descontado de cada pagamento recebido</div>
            <span className="tax-info-plano">Plano {dadosUsuario?.planoAtivo || 'Bronze'}</span>
          </div>
        </section>

        {/* FILTROS AVANÇADOS */}
        <div className="filters-toolbar-premium">
          <div className="filter-item">
            <Filter size={14} />
            <select 
              className="filter-select-premium"
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as 'todos' | 'entrada' | 'saida')}
            >
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
          <div className="filter-item">
            <Search size={14} />
            <input
              type="text"
              className="filter-search-premium"
              placeholder="Buscar por cliente ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button 
            className="btn-export-premium"
            onClick={() => {
              const csvContent = transacoesFiltradas.map(t => 
                `${t.data},${t.tipo},${t.descricao},${t.valor}`
              ).join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `extrato_${periodoFiltro}dias.csv`;
              a.click();
            }}
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>

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
                      formatter={(v: number | undefined) => [fmtBRL(v || 0), 'Receita']}
                    />
                    <Area type="monotone" dataKey="receita" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* PAINEL DE DISTRIBUIÇÃO POR SERVIÇO (PIE CHART) */}
          <section className="fin-chart-enterprise-panel">
            <div className="panel-header-premium">
              <div className="header-text">
                <h3 className="panel-title-premium">Distribuição por Serviço</h3>
                <p className="panel-hint-premium">Receita por tipo de serviço prestado</p>
              </div>
            </div>

            <div className="pie-chart-container">
              {loading ? (
                <div className="loading-chart-skeleton" style={{ width: 180, height: 180 }} />
              ) : dadosPieChart.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>
                  Sem dados para exibir
                </div>
              ) : (
                <>
                  <div className="pie-chart-wrapper">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie
                          data={dadosPieChart}
                          cx={90}
                          cy={90}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="valor"
                        >
                          {dadosPieChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-chart-center">
                      <div className="pie-chart-center-value">{dadosPieChart.length}</div>
                      <div className="pie-chart-center-label">Serviços</div>
                    </div>
                  </div>
                  <div className="pie-legend">
                    {dadosPieChart.map((item, i) => (
                      <div key={i} className="pie-legend-item">
                        <div className="pie-legend-dot" style={{ background: item.cor }}></div>
                        <div className="pie-legend-info">
                          <div className="pie-legend-label">{item.nome}</div>
                          <div className="pie-legend-value">{fmtBRL(item.valor)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
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
