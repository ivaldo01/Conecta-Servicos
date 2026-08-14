'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowDown,
  Wallet,
  Users,
  Download,
  FileText
} from 'lucide-react';

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
import '@/styles/relatorios-premium.css';

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

  // Função para verificar se uma data está dentro do período selecionado
  const isDentroDoPeriodo = (data: any) => {
    if (!data) return false;
    let dataDate: Date;
    
    // Firestore Timestamp
    if (data.toDate) {
      dataDate = data.toDate();
    } 
    // String DD/MM/AAAA (formato brasileiro)
    else if (typeof data === 'string' && data.includes('/')) {
      const [dia, mes, ano] = data.split('/');
      dataDate = new Date(Number(ano), Number(mes) - 1, Number(dia)); // Mês em JS é 0-based
    }
    // String AAAA-MM-DD ou outros formatos
    else {
      dataDate = new Date(data);
    }
    
    // Verificar se a data é válida
    if (isNaN(dataDate.getTime())) {
      console.log(`[DEBUG] Data inválida: ${data}`);
      return false;
    }
    
    const hoje = new Date();
    // Normalizar ambas as datas para meia-noite para comparar só a data
    const hojeNormalizado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataNormalizada = new Date(dataDate.getFullYear(), dataDate.getMonth(), dataDate.getDate());
    
    const diffMs = hojeNormalizado.getTime() - dataNormalizada.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDias >= 0 && diffDias <= periodo;
  };

  useEffect(() => {
    async function carregarRelatorios() {
      if (!dadosUsuario?.uid) return;
      setLoading(true);

      let allAgendamentos: any[] = [];
      let concluidos: any[] = [];
      let receitaBruta = 0;

      try {
        console.log(`[Relatórios] Carregando dados para período: ${periodo} dias`);
        
        // ============================================================
        // 1. AGENDAMENTOS - Buscar de múltiplas fontes (Web + Mobile)
        // ============================================================
        try {
          let allAgendamentosRaw: any[] = [];
          
          // 1. Agendamentos (Filtro por Profissional/Clinica/Colaborador e Período)
          try {
            const q = query(
              collection(db, 'agendamentos'),
              or(
                where('profissionalId', '==', dadosUsuario.uid),
                where('clinicaId', '==', dadosUsuario.uid),
                where('colaboradorId', '==', dadosUsuario.uid)
              )
            );
            const snap = await getDocs(q);
            const ags = snap.docs.map(d => ({ id: d.id, fonte: 'web', ...d.data() }));
            console.log(`[Relatórios] Total de agendamentos: ${ags.length}`);
            console.log(`[Relatórios] Agendamentos (web): ${ags.length}`);
            allAgendamentosRaw = [...allAgendamentosRaw, ...ags];
          } catch (e) {
            console.warn('[Relatórios] Coleção agendamentos não encontrada');
          }
          
          // Tentar coleção 'appointments' (Mobile - inglês)
          try {
            const qMobile = query(
              collection(db, 'appointments'),
              or(
                where('profissionalId', '==', dadosUsuario.uid),
                where('clinicaId', '==', dadosUsuario.uid),
                where('colaboradorId', '==', dadosUsuario.uid)
              )
            );
            const snapMobile = await getDocs(qMobile);
            const agsMobile = snapMobile.docs.map(d => ({ id: d.id, fonte: 'mobile', ...d.data() }));
            allAgendamentosRaw = [...allAgendamentosRaw, ...agsMobile];
            console.log(`[Relatórios] Appointments (mobile): ${agsMobile.length}`);
          } catch (e) {
            console.warn('[Relatórios] Coleção appointments não encontrada');
          }
          
          // Tentar coleção 'atendimentos' (Mobile - português alternativo)
          try {
            const qAtend = query(
              collection(db, 'atendimentos'),
              or(
                where('profissionalId', '==', dadosUsuario.uid),
                where('clinicaId', '==', dadosUsuario.uid),
                where('colaboradorId', '==', dadosUsuario.uid)
              )
            );
            const snapAtend = await getDocs(qAtend);
            const agsAtend = snapAtend.docs.map(d => ({ id: d.id, fonte: 'mobile-alt', ...d.data() }));
            allAgendamentosRaw = [...allAgendamentosRaw, ...agsAtend];
            console.log(`[Relatórios] Atendimentos (mobile-alt): ${agsAtend.length}`);
          } catch (e) {
            console.warn('[Relatórios] Coleção atendimentos não encontrada');
          }
          
          console.log(`[Relatórios] Total agendamentos combinados: ${allAgendamentosRaw.length}`);
          
          // DEBUG: Ver dados dos agendamentos antes do filtro
          allAgendamentosRaw.forEach((d: any, i: number) => {
            const dataCampo = d.dataAgendamento || d.data || d.createdAt || d.date;
            console.log(`[DEBUG] Agendamento #${i} - ID: ${d.id?.substring(0, 8)}, Data: ${dataCampo}, Status: ${d.status}, Valor: ${d.valor}`);
          });
          
          // DEBUG: Ver campos disponíveis em alguns agendamentos para achar o valor
          allAgendamentosRaw.slice(0, 3).forEach((d: any, i: number) => {
            console.log(`[DEBUG] Campos agendamento #${i}:`, Object.keys(d));
            console.log(`[DEBUG] Dados completos #${i}:`, JSON.stringify(d, null, 2).substring(0, 800));
          });
          
          // DEBUG: Ver um agendamento SEM valor (provavelmente mobile) - achar onde está o preço
          const agSemValor = allAgendamentosRaw.find((d: any) => !d.valor && d.status === 'concluido');
          if (agSemValor) {
            console.log('[DEBUG] Agendamento SEM valor (mobile?):', JSON.stringify(agSemValor, null, 2).substring(0, 1500));
          }
          
          // Filtrar por período
          const agsFiltrados = allAgendamentosRaw.filter((d: any) => {
            const dataCampo = d.dataAgendamento || d.data || d.createdAt || d.date;
            const dentroPeriodo = isDentroDoPeriodo(dataCampo);
            console.log(`[DEBUG] Filtro - ID: ${d.id?.substring(0, 8)}, Data: ${dataCampo?.toDate?.() || dataCampo}, Dentro: ${dentroPeriodo}`);
            return dentroPeriodo;
          });
          console.log(`[Relatórios] Agendamentos filtrados (${periodo}d): ${agsFiltrados.length}`);
          
          // Normalizar dados (mobile pode ter campos diferentes)
          const agsNormalizados = agsFiltrados.map((d: any) => {
            // Calcular valor: tentar valorTotal, valor, value, ou somar servicos[].preco
            let valorCalculado = Number(d.valor || d.value || d.preco || d.price || 0);
            
            // Se não tem valor direto, tentar valorTotal
            if (!valorCalculado && d.valorTotal) {
              valorCalculado = Number(d.valorTotal);
            }
            
            // Se ainda não tem valor e tem array de servicos, somar os precos
            if (!valorCalculado && Array.isArray(d.servicos) && d.servicos.length > 0) {
              valorCalculado = d.servicos.reduce((acc: number, s: any) => acc + Number(s.preco || s.valor || s.price || 0), 0);
            }
            
            return {
              id: d.id,
              status: d.status || d.estado || 'pendente',
              valor: valorCalculado,
              clienteId: d.clienteId || d.clientId || d.userId,
              funcionarioId: d.funcionarioId || d.funcionario || d.staffId,
              funcionarioNome: d.funcionarioNome || d.funcionario || d.staffName,
              dataAgendamento: d.dataAgendamento || d.data || d.date || d.createdAt,
              createdAt: d.createdAt || d.dataAgendamento || d.data || d.date,
              ...d
            };
          });
          
          // DEBUG: Ver valores normalizados
          console.log('[DEBUG] Valores normalizados:', agsNormalizados.map((d: any) => ({ id: d.id?.substring(0,8), status: d.status, valor: d.valor })));
          
          allAgendamentos = agsNormalizados;
          concluidos = agsNormalizados.filter((d: any) => 
            d.status === 'concluido' || d.status === 'completed' || d.status === 'done'
          );
          
          // DEBUG: Ver agendamentos concluídos
          console.log('[DEBUG] Concluídos:', concluidos.map((d: any) => ({ id: d.id?.substring(0,8), valor: d.valor })));
          
          receitaBruta = concluidos.reduce((acc, d: any) => acc + (d.valor || 0), 0);
          
          console.log(`[Relatórios] Receita calculada: R$ ${receitaBruta}`);
          
          setStats({
            totalAgendamentos: agsNormalizados.length,
            receitaTotal: receitaBruta,
            clientesAtendidos: new Set(agsNormalizados.map((d: any) => d.clienteId).filter(Boolean)).size,
            taxaConclusao: agsNormalizados.length > 0 ? (concluidos.length / agsNormalizados.length) * 100 : 0
          });

          // Gráficos básicos
          setStatusData({
            labels: ['Concluído', 'Pendente', 'Cancelado'],
            datasets: [{
              data: [
                concluidos.length, 
                agsNormalizados.filter((d: any) => d.status === 'pendente' || d.status === 'pending').length, 
                agsNormalizados.filter((d: any) => d.status === 'cancelado' || d.status === 'cancelled' || d.status === 'canceled').length
              ],
              backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
              borderWidth: 0
            }]
          });
        } catch (e) {
          console.warn('[Relatórios] Erro ao ler agendamentos:', e);
        }

        // ============================================================
        // 2. TRANSAÇÕES - Buscar de múltiplas fontes
        // ============================================================
        try {
          let allTransacoesRaw: any[] = [];
          
          // Tentar coleção 'transacoes' (Web)
          try {
            const transQ = query(
              collection(db, 'transacoes'),
              or(
                where('profissionalId', '==', dadosUsuario.uid),
                where('clinicaId', '==', dadosUsuario.uid)
              )
            );
            const transSnap = await getDocs(transQ);
            const transWeb = transSnap.docs.map(d => ({ id: d.id, fonte: 'web', ...d.data() }));
            allTransacoesRaw = [...allTransacoesRaw, ...transWeb];
            console.log(`[Relatórios] Transações (web): ${transWeb.length}`);
          } catch (e) {
            console.warn('[Relatórios] Coleção transacoes não encontrada');
          }
          
          // Tentar coleção 'transactions' (Mobile)
          try {
            const transQMobile = query(
              collection(db, 'transactions'),
              where('profissionalId', '==', dadosUsuario.uid)
            );
            const transSnapMobile = await getDocs(transQMobile);
            const transMobile = transSnapMobile.docs.map(d => ({ id: d.id, fonte: 'mobile', ...d.data() }));
            allTransacoesRaw = [...allTransacoesRaw, ...transMobile];
            console.log(`[Relatórios] Transactions (mobile): ${transMobile.length}`);
          } catch (e) {
            console.warn('[Relatórios] Coleção transactions não encontrada');
          }
          
          // Tentar coleção 'payments' (Mobile alternativo)
          try {
            const payQ = query(
              collection(db, 'payments'),
              where('profissionalId', '==', dadosUsuario.uid)
            );
            const paySnap = await getDocs(payQ);
            const payments = paySnap.docs.map(d => ({ id: d.id, fonte: 'payments', ...d.data() }));
            allTransacoesRaw = [...allTransacoesRaw, ...payments];
            console.log(`[Relatórios] Payments: ${payments.length}`);
          } catch (e) {
            console.warn('[Relatórios] Coleção payments não encontrada');
          }
          
          console.log(`[Relatórios] Total transações combinadas: ${allTransacoesRaw.length}`);
          
          // Filtrar transações por período
          const transFiltradas = allTransacoesRaw.filter((t: any) => 
            isDentroDoPeriodo(t.data || t.date || t.createdAt || t.timestamp)
          );
          console.log(`[Relatórios] Transações filtradas (${periodo}d): ${transFiltradas.length}`);
          
          // Normalizar transações
          const transNormalizadas = transFiltradas.map((t: any) => ({
            id: t.id,
            tipo: t.tipo || t.type || t.categoria || t.category,
            valor: Number(t.valor || t.value || t.amount || 0),
            taxaSaque: Number(t.taxaSaque || t.fee || t.taxa || 0),
            data: t.data || t.date || t.createdAt || t.timestamp,
            status: t.status || t.estado || 'concluido',
            ...t
          }));

          const taxasPagas = transNormalizadas
            .filter((t: any) => 
              t.tipo === 'taxa_plataforma' || 
              t.tipo === 'comissao' || 
              t.tipo === 'fee' ||
              t.tipo === 'commission' ||
              t.categoria === 'comissao'
            )
            .reduce((acc, t: any) => acc + t.valor, 0);

          const saques = transNormalizadas
            .filter((t: any) => 
              t.tipo === 'saida' || 
              t.tipo === 'saque' || 
              t.tipo === 'withdrawal' ||
              t.tipo === 'saida' ||
              t.categoria === 'saque'
            )
            .map((t: any) => ({
              id: t.id,
              valor: t.valor,
              taxa: t.taxaSaque,
              data: t.data,
              status: t.status
            }));

          // Calcular taxas do plano VIP sobre os agendamentos concluídos
          const getTaxaPlano = (planoId?: string): number => {
            switch (planoId) {
              case 'pro_profissional': return 8;
              case 'pro_empresa': return 6;
              case 'pro_franquia': return 5;
              case 'pro_iniciante':
              default: return 10;
            }
          };
          
          const taxaPercentual = getTaxaPlano(dadosUsuario?.planoAtivo);
          const receitaB = concluidos.reduce((acc, d: any) => acc + d.valor, 0);
          const taxasPlano = (receitaB * taxaPercentual) / 100;
          
          // Total de taxas = taxas registradas + taxas do plano
          const totalTaxas = taxasPagas + taxasPlano;
          
          console.log(`[Relatórios] Plano ativo: ${dadosUsuario?.planoAtivo || 'pro_iniciante'}, Taxa: ${taxaPercentual}%`);
          console.log(`[Relatórios] Receita: R$ ${receitaB}, Taxas plano: R$ ${taxasPlano}, Taxas registradas: R$ ${taxasPagas}`);
          
          setFeesTotal(totalTaxas);
          setHistoricoSaques(saques);

          // Atualizar faturamento no gráfico com Lucro Líquido
          setGraphData({
            labels: ['Faturamento Bruto', 'Lucro Líquido'],
            datasets: [{
              label: 'Visão Financeira',
              data: [receitaB, receitaB - totalTaxas],
              backgroundColor: ['#3B82F6', '#10B981'],
              borderRadius: 12
            }]
          });
        } catch (e) {
          console.warn('[Relatórios] Erro ao ler transações:', e);
        }

        // ============================================================
        // 3. COLABORADORES - Buscar de múltiplas fontes
        // ============================================================
        try {
          let equipeRaw: any[] = [];
          
          // Tentar subcoleção 'equipe' (Web)
          try {
            const eqSnap = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'equipe'));
            const eqWeb = eqSnap.docs.map(d => ({ id: d.id, fonte: 'web', ...d.data() }));
            equipeRaw = [...equipeRaw, ...eqWeb];
          } catch (e) {
            console.warn('[Relatórios] Subcoleção equipe não encontrada');
          }
          
          // Tentar coleção 'staff' (Mobile)
          try {
            const staffQ = query(
              collection(db, 'staff'),
              where('profissionalId', '==', dadosUsuario.uid)
            );
            const staffSnap = await getDocs(staffQ);
            const staff = staffSnap.docs.map(d => ({ id: d.id, fonte: 'mobile', ...d.data() }));
            equipeRaw = [...equipeRaw, ...staff];
          } catch (e) {
            console.warn('[Relatórios] Coleção staff não encontrada');
          }
          
          // Tentar coleção 'funcionarios' (Mobile alternativo)
          try {
            const funcQ = query(
              collection(db, 'funcionarios'),
              where('profissionalId', '==', dadosUsuario.uid)
            );
            const funcSnap = await getDocs(funcQ);
            const funcs = funcSnap.docs.map(d => ({ id: d.id, fonte: 'funcionarios', ...d.data() }));
            equipeRaw = [...equipeRaw, ...funcs];
          } catch (e) {
            console.warn('[Relatórios] Coleção funcionarios não encontrada');
          }
          
          // Normalizar equipe
          const equipe = equipeRaw.map((e: any) => ({
            id: e.id,
            nome: e.nome || e.name || e.displayName || 'Sem nome',
            cargo: e.cargo || e.role || e.position || 'Especialista',
            ...e
          }));

          const performance = equipe.map((fun: any) => {
            const agsFun = allAgendamentos.filter((d: any) => 
              d.funcionarioId === fun.id || 
              d.funcionarioNome === fun.nome ||
              d.funcionario === fun.nome
            );
            const recFun = agsFun.filter((d: any) => 
              d.status === 'concluido' || d.status === 'completed'
            ).reduce((acc, d: any) => acc + d.valor, 0);
            return { 
              nome: fun.nome, 
              cargo: fun.cargo, 
              total: agsFun.length, 
              receita: recFun 
            };
          });

          if (ehProfissional) {
            const agsOwner = allAgendamentos.filter((d: any) => 
              !d.funcionarioId || 
              d.funcionarioId === dadosUsuario.uid ||
              d.funcionario === dadosUsuario.nome
            );
            const recOwner = agsOwner.filter((d: any) => 
              d.status === 'concluido' || d.status === 'completed'
            ).reduce((acc, d: any) => acc + d.valor, 0);
            performance.unshift({ 
              nome: `${dadosUsuario.nome || 'Você'} (Proprietário)`, 
              cargo: 'Proprietário', 
              total: agsOwner.length, 
              receita: recOwner 
            });
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

  const exportarRelatorio = () => window.print();

  if (loading) {
    return (
      <div className="loading-relatorios">
        <div className="loading-spinner" />
        <span>Compilando dados corporativos...</span>
      </div>
    );
  }

  return (
    <div className="relatorios-page">
      <div className="no-print">
        <Topbar 
          title="Inteligência de Negócios" 
          subtitle="Relatórios detalhados de faturamento, taxas e saques" 
        />
      </div>

      <div className="relatorios-container">
        <section className="rel-hero-enterprise no-print">
          <div>
            <span className="rel-hero-kicker">INTELIGÊNCIA OPERACIONAL</span>
            <h1>Dados que explicam o presente e orientam o próximo passo.</h1>
            <p>Compare resultados, acompanhe sua equipe e transforme o histórico financeiro em decisões melhores.</p>
          </div>
          <div className="rel-hero-result">
            <span>Resultado líquido</span>
            <strong>R$ {(stats.receitaTotal - feesTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            <small>no período selecionado</small>
          </div>
        </section>
        
        {/* BARRA DE AÇÕES EXECUTIVAS */}
        <div className="relatorios-action-header no-print">
          <div className="period-selector">
            <Calendar size={18} />
            <div className="tabs-filtro">
              {[1, 7, 30, 90].map(p => (
                <button 
                  key={p} 
                  onClick={() => setPeriodo(p)} 
                  className={periodo === p ? 'active' : ''}
                >
                  {p === 1 ? '24H' : `${p}D`}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-exportar" onClick={exportarRelatorio}>
            <Download size={18} /> Exportar PDF
          </button>
        </div>

        {/* KPIs DE ALTO NÍVEL */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon receita"><DollarSign size={24} /></div>
            <div className="kpi-data">
              <span className="kpi-label">Receita Bruta</span>
              <h3 className="kpi-value">
                R$ {stats.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon taxas"><TrendingDown size={24} /></div>
            <div className="kpi-data">
              <span className="kpi-label">Taxas Pagas</span>
              <h3 className="kpi-value negativo">
                R$ {feesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon lucro"><TrendingUp size={24} /></div>
            <div className="kpi-data">
              <span className="kpi-label">Lucro Líquido</span>
              <h3 className="kpi-value positivo">
                R$ {(stats.receitaTotal - feesTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon saques"><Wallet size={24} /></div>
            <div className="kpi-data">
              <span className="kpi-label">Total em Saques</span>
              <h3 className="kpi-value">
                R$ {historicoSaques.reduce((acc, s) => acc + s.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div className="graficos-section">
          <div className="grafico-card">
            <h4 className="grafico-titulo">
              <BarChart3 size={18} /> Crescimento de Receita
            </h4>
            <div className="grafico-container">
              {graphData && (
                <Bar 
                  data={graphData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 20,
                          font: { size: 12, weight: 'bold' }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: {
                          font: { size: 11 },
                          callback: (value: any) => `R$ ${value}`
                        }
                      },
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: 'bold' } }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>
          <div className="grafico-card pie">
            <h4 className="grafico-titulo">
              <FileText size={18} /> Status da Operação
            </h4>
            <div className="grafico-container">
              {statusData && (
                <Pie 
                  data={statusData} 
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 15,
                          font: { size: 12, weight: 'bold' }
                        }
                      }
                    }
                  }} 
                />
              )}
            </div>
          </div>
        </div>

        {/* TABELA DE DESEMPENHO DA EQUIPE */}
        <section className="secao-tabela">
          <div className="secao-header">
            <h3 className="secao-titulo">Desempenho por Colaborador</h3>
            <p className="secao-subtitulo">Detalhamento de produtividade e geração de lucro</p>
          </div>

          <div className="tabela-wrap">
            <table className="tabela-premium">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Cargo / Função</th>
                  <th>Serviços</th>
                  <th className="text-right">Total Gerado</th>
                </tr>
              </thead>
              <tbody>
                {desempenhoEquipe.length === 0 ? (
                  <tr className="empty-state">
                    <td colSpan={4}>Nenhum colaborador encontrado no período.</td>
                  </tr>
                ) : desempenhoEquipe.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="colab-cell">
                        <div className="avatar-mini">{row.nome?.[0] || '?'}</div>
                        <span>{row.nome}</span>
                      </div>
                    </td>
                    <td><span className="cargo-badge">{row.cargo}</span></td>
                    <td>{row.total} atendimentos</td>
                    <td className="text-right valor-positivo">
                      R$ {row.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TABELA DE SAQUES E TAXAS BANCÁRIAS */}
        <section className="secao-tabela">
          <div className="secao-header">
            <h3 className="secao-titulo">Movimentações de Saque</h3>
            <p className="secao-subtitulo">Histórico de transferências e taxas administrativas de saque</p>
          </div>

          <div className="tabela-wrap">
            <table className="tabela-premium">
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
                  <tr className="empty-state">
                    <td colSpan={4}>Nenhum saque realizado no período.</td>
                  </tr>
                ) : historicoSaques.map((saque) => (
                  <tr key={saque.id}>
                    <td><div className="colab-cell">{toDate(saque.data)}</div></td>
                    <td><code className="transaction-badge">#{saque.id.slice(0, 8).toUpperCase()}</code></td>
                    <td className="valor-negativo">
                      - R$ {Number(saque.taxa).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="text-right">
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
