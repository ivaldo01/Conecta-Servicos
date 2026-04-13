'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
// Ícones de segurança locais
const BarChart = (props: any) => <span>📊</span>;
const Activity = (props: any) => <span>📈</span>;
const Users = (props: any) => <span>👥</span>;
const Calendar = (props: any) => <span>📅</span>;
const CheckCircle = (props: any) => <span>✅</span>;
const Clock = (props: any) => <span>⏰</span>;
const DollarSign = (props: any) => <span>💰</span>;
const ArrowDown = (props: any) => <span>📉</span>;
const Wallet = (props: any) => <span>👛</span>;

import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import '@/styles/relatorios.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function RelatoriosPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(30);
  const [stats, setStats] = useState({
    totalAgendamentos: 0,
    receitaTotal: 0,
    clientesAtendidos: 0,
    taxaConclusao: 0
  });

  const [graphData, setGraphData] = useState<any>(null);
  const [statusData, setStatusData] = useState<any>(null);
  const [desempenhoEquipe, setDesempenhoEquipe] = useState<any[]>([]);
  const [historicoSaques, setHistoricoSaques] = useState<any[]>([]);
  const [feesTotal, setFeesTotal] = useState(0);

  useEffect(() => {
    async function carregarRelatorios() {
      if (!dadosUsuario?.uid) return;
      setLoading(true);

      let allAgendamentos: any[] = [];
      let concluidos: any[] = [];
      let receitaBruta = 0;

      try {
        // 1. Agendamentos (Filtro por Profissional)
        try {
          const q = query(
            collection(db, 'agendamentos'),
            where('profissionalId', '==', dadosUsuario.uid)
          );
          const snap = await getDocs(q);
          const ags = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          allAgendamentos = ags;
          concluidos = ags.filter((d: any) => d.status === 'concluido');
          receitaBruta = concluidos.reduce((acc, d: any) => acc + (Number(d.valor) || 0), 0);
          
          setStats({
            totalAgendamentos: ags.length,
            receitaTotal: receitaBruta,
            clientesAtendidos: new Set(ags.map((d: any) => d.clienteId)).size,
            taxaConclusao: ags.length > 0 ? (concluidos.length / ags.length) * 100 : 0
          });

          // Gráficos básicos
          setStatusData({
            labels: ['Concluído', 'Pendente', 'Cancelado'],
            datasets: [{
              data: [concluidos.length, ags.filter((d: any) => d.status === 'pendente').length, ags.filter((d: any) => d.status === 'cancelado').length],
              backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
              borderWidth: 0
            }]
          });
        } catch (e) {
          console.warn('[Relatórios] Erro ao ler agendamentos:', e);
        }

        // 2. Transações (Saques e Taxas)
        try {
          const transQ = query(
            collection(db, 'transacoes'),
            where('profissionalId', '==', dadosUsuario.uid)
          );
          const transSnap = await getDocs(transQ);
          const transData = transSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const taxasPagas = transData
            .filter((t: any) => t.tipo === 'taxa_plataforma' || t.categoria === 'comissao')
            .reduce((acc, t: any) => acc + (Number(t.valor) || 0), 0);

          const saques = transData
            .filter((t: any) => t.tipo === 'saida' || t.categoria === 'saque')
            .map((t: any) => ({
              id: t.id,
              valor: Number(t.valor) || 0,
              taxa: Number(t.taxaSaque) || 0,
              data: t.data,
              status: t.status || 'concluido'
            }));

          setFeesTotal(taxasPagas);
          setHistoricoSaques(saques);

          // Atualizar faturamento no gráfico com Lucro Líquido
          const receitaB = concluidos.reduce((acc, d: any) => acc + (Number(d.valor) || 0), 0);
          setGraphData({
            labels: ['Faturamento Bruto', 'Lucro Líquido'],
            datasets: [{
              label: 'Visão Financeira',
              data: [receitaB, receitaB - taxasPagas],
              backgroundColor: ['#3B82F6', '#10B981'],
              borderRadius: 12
            }]
          });
        } catch (e) {
          console.warn('[Relatórios] Erro ao ler transações:', e);
        }

        // 3. Colaboradores
        try {
          const eqSnap = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'equipe'));
          const equipe = eqSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const performance = equipe.map((fun: any) => {
            const agsFun = allAgendamentos.filter((d: any) => d.funcionarioId === fun.id || d.funcionarioNome === fun.nome);
            const recFun = agsFun.filter((d: any) => d.status === 'concluido').reduce((acc, d: any) => acc + (Number(d.valor) || 0), 0);
            return { nome: fun.nome, cargo: fun.cargo || 'Especialista', total: agsFun.length, receita: recFun };
          });

          if (ehProfissional) {
            const agsOwner = allAgendamentos.filter((d: any) => !d.funcionarioId);
            const recOwner = agsOwner.filter((d: any) => d.status === 'concluido').reduce((acc, d: any) => acc + (Number(d.valor) || 0), 0);
            performance.unshift({ nome: `${dadosUsuario.nome} (Você)`, cargo: 'Proprietário', total: agsOwner.length, receita: recOwner });
          }
          setDesempenhoEquipe(performance);
        } catch (e) {
          console.warn('[Relatórios] Erro ao ler equipe:', e);
        }

      } catch (err) {
        console.error('[Relatórios] Erro Crítico:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarRelatorios();
  }, [dadosUsuario, ehProfissional, periodo]);

  const toDate = (v: any) => {
    if (!v) return 'n/a';
    if (v.toDate) return v.toDate().toLocaleDateString('pt-BR');
    return new Date(v).toLocaleDateString('pt-BR');
  };

  const imprimirRelatorio = () => window.print();

  if (loading) return <div className="loading-reports-premium">Compilando dados corporativos...</div>;

  return (
    <div className="reports-page-premium">
      <div className="no-print">
        <Topbar 
          title="Inteligência de Negócios" 
          subtitle="Relatórios detalhados de faturamento, taxas e saques" 
        />
      </div>

      <div className="reports-container-premium">
        
        {/* BARRA DE AÇÕES EXECUTIVAS */}
        <div className="reports-action-header no-print">
          <div className="period-selector-premium">
            <Calendar size={18} />
            <div className="tabs-premium">
              {[7, 30, 90].map(p => (
                <button key={p} onClick={() => setPeriodo(p)} className={periodo === p ? 'active' : ''}>{p}D</button>
              ))}
            </div>
          </div>
          <button className="btn-print-premium" onClick={imprimirRelatorio}>
            <BarChart size={18} /> Gerar PDF do Exercício
          </button>
        </div>

        {/* KPIs DE ALTO NÍVEL */}
        <div className="reports-kpi-grid">
          <div className="report-card-premium">
            <div className="card-icon blue"><DollarSign size={22} /></div>
            <div className="card-data">
              <span className="label">Receita Bruta</span>
              <h3 className="value">R$ {stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div className="report-card-premium">
            <div className="card-icon red"><ArrowDown size={22} /></div>
            <div className="card-data">
              <span className="label">Taxas Pagas</span>
              <h3 className="value">R$ {feesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div className="report-card-premium">
            <div className="card-icon green"><Activity size={22} /></div>
            <div className="card-data">
              <span className="label">Lucro Líquido</span>
              <h3 className="value text-green-600">R$ {(stats.receitaTotal - feesTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div className="report-card-premium">
            <div className="card-icon purple"><Wallet size={22} /></div>
            <div className="card-data">
              <span className="label">Total em Saques</span>
              <h3 className="value">R$ {historicoSaques.reduce((acc, s) => acc + s.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div className="reports-visual-section">
          <div className="visual-card-premium main-chart">
            <h4 className="visual-title">Crescimento de Receita</h4>
            <div className="chart-container-premium">
              {graphData && <Bar data={graphData} options={{ responsive: true, maintainAspectRatio: false }} />}
            </div>
          </div>
          <div className="visual-card-premium side-chart">
            <h4 className="visual-title">Status da Operação</h4>
            <div className="chart-container-premium">
              {statusData && <Pie data={statusData} options={{ responsive: true, maintainAspectRatio: false }} />}
            </div>
          </div>
        </div>

        {/* TABELA DE DESEMPENHO DA EQUIPE */}
        <section className="employee-performance-section">
          <div className="section-header-premium">
            <h3 className="section-title-premium">Desempenho por Colaborador</h3>
            <p className="section-subtitle-premium">Detalhamento de produtividade e geração de lucro</p>
          </div>

          <div className="performance-table-wrap">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo / Função</th>
                  <th>Serviços</th>
                  <th className="text-right">Total Gerado</th>
                </tr>
              </thead>
              <tbody>
                {desempenhoEquipe.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="colab-name-cell">
                        <div className="avatar-mini-premium">{row.nome?.[0] || '?'}</div>
                        {row.nome}
                      </div>
                    </td>
                    <td><span className="cargo-badge">{row.cargo}</span></td>
                    <td>{row.total} atendimentos</td>
                    <td className="text-right font-bold text-slate-800">
                      R$ {row.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TABELA DE SAQUES E TAXAS BANCÁRIAS */}
        <section className="banking-history-section">
          <div className="section-header-premium">
            <h3 className="section-title-premium">Movimentações de Saque</h3>
            <p className="section-subtitle-premium">Histórico de transferências e taxas administrativas de saque</p>
          </div>

          <div className="performance-table-wrap">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Data da Solicitação</th>
                  <th>ID da Transação</th>
                  <th>Taxa de Saque</th>
                  <th className="text-right">Valor Líquido</th>
                </tr>
              </thead>
              <tbody>
                {historicoSaques.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-10 opacity-50">Nenhum saque realizado no período.</td></tr>
                ) : historicoSaques.map((saque) => (
                  <tr key={saque.id}>
                    <td><div className="colab-name-cell">{toDate(saque.data)}</div></td>
                    <td><code className="transaction-id-badge">#{saque.id.slice(0, 8).toUpperCase()}</code></td>
                    <td className="text-red-500">- R$ {Number(saque.taxa).toFixed(2).replace('.', ',')}</td>
                    <td className="text-right font-bold text-slate-800">
                      R$ {Number(saque.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}
