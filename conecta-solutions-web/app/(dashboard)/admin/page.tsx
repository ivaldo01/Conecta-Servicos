'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { 
  Users, 
  Scissors, 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle,
  MessageCircle,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  UserPlus,
  FileText,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/styles/admin.css';

export default function AdminDashboard() {
  const { dadosUsuario, ehAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProfissionais: 0,
    totalClientes: 0,
    totalAgendamentos: 0,
    receitaPlataforma: 0,
    pendentesVerificacao: 0
  });
  const [atividades, setAtividades] = useState([]);
  
  // Estados para Dashboard Completo
  const [resumoDia, setResumoDia] = useState({
    totalHoje: 0,
    confirmados: 0,
    pendentes: 0,
    cancelados: 0,
    faturamentoHoje: 0
  });
  const [alertas, setAlertas] = useState([]);
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
  const [estatisticasSemana, setEstatisticasSemana] = useState({
    labels: [],
    agendamentos: [],
    faturamento: []
  });

  // Função para calcular valor total do agendamento
  const calcularValorAgendamento = (ag) => {
    // Tenta valorTotal primeiro
    if (ag.valorTotal !== undefined && ag.valorTotal !== null) {
      return Number(ag.valorTotal);
    }
    // Tenta campo valor
    if (ag.valor !== undefined && ag.valor !== null) {
      return Number(ag.valor);
    }
    // Tenta somar valores dos serviços
    if (Array.isArray(ag.servicos) && ag.servicos.length > 0) {
      return ag.servicos.reduce((total, s) => total + (s.preco || s.valor || 0), 0);
    }
    // Tenta precoTotal
    if (ag.precoTotal !== undefined && ag.precoTotal !== null) {
      return Number(ag.precoTotal);
    }
    return 0;
  };

  useEffect(() => {
    async function carregarDadosAdmin() {
      if (!ehAdmin) return;
      try {
        // Simulação de busca de dados globais (em produção seriam cloud functions ou queries otimizadas)
        const proSnap = await getDocs(query(collection(db, 'usuarios'), where('perfil', '==', 'profissional')));
        const cliSnap = await getDocs(query(collection(db, 'usuarios'), where('perfil', '==', 'cliente')));
        const agSnap = await getDocs(collection(db, 'agendamentos'));
        
        // Exemplo: buscas de profissionais aguardando selo
        const pendingSnap = await getDocs(query(collection(db, 'usuarios'), where('statusVerificacao', '==', 'pendente')));

        setStats({
          totalProfissionais: proSnap.size,
          totalClientes: cliSnap.size,
          totalAgendamentos: agSnap.size,
          receitaPlataforma: agSnap.docs.reduce((total, doc) => total + calcularValorAgendamento(doc.data()), 0),
          pendentesVerificacao: pendingSnap.size
        });
      } catch (err) {
        console.error('[Admin] Erro ao carregar HQ:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDadosAdmin();
  }, [ehAdmin]);

  // Buscar agendamentos recentes para o Monitor de Atividades
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'agendamentos'), orderBy('criadoEm', 'desc'), limit(5)),
      async (querySnapshot) => {
        const agendamentos = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        
        // Buscar nomes dos profissionais e clientes
        const atividadesFormatadas = await Promise.all(
          agendamentos.map(async (ag) => {
            let profissionalNome = 'Profissional';
            let clienteNome = 'Cliente';
            let profissionalCodigo = null;
            let clienteCodigo = null;
            
            try {
              // Buscar nome e código do profissional
              if (ag.profissionalId) {
                const profDoc = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', ag.profissionalId)));
                if (!profDoc.empty) {
                  const profData = profDoc.docs[0].data();
                  profissionalNome = profData.nome || 'Profissional';
                  profissionalCodigo = profData.codigoConecta;
                }
              }
              
              // Buscar nome e código do cliente
              if (ag.clienteId) {
                const cliDoc = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', ag.clienteId)));
                if (!cliDoc.empty) {
                  const cliData = cliDoc.docs[0].data();
                  clienteNome = cliData.nome || 'Cliente';
                  clienteCodigo = cliData.codigoConecta;
                }
              }
            } catch (e) {
              console.log('Erro ao buscar nomes:', e);
            }
            
            const data = ag.criadoEm?.toDate ? ag.criadoEm.toDate() : new Date();
            const valorAgendamento = calcularValorAgendamento(ag);
            
            return {
              id: ag.id,
              titulo: 'Novo Agendamento',
              descricao: `${clienteNome} (${clienteCodigo || 'Sem CS'}) agendou com ${profissionalNome} (${profissionalCodigo || 'Sem CS'}) - R$ ${valorAgendamento.toFixed(2)}`,
              data: data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
              status: ag.status,
              valor: valorAgendamento,
              clienteId: ag.clienteId,
              profissionalId: ag.profissionalId
            };
          })
        );
        
        setAtividades(atividadesFormatadas);
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Função para calcular taxa da Conecta baseada no plano do profissional
  const calcularTaxaConecta = (planoAtivo) => {
    // Taxas por plano (serviceFee do PLANS)
    const taxas = {
      'pro_iniciante': 0.10,    // 10%
      'pro_profissional': 0.08,  // 8%
      'pro_empresa': 0.06,       // 6%
      'pro_franquia': 0.05       // 5%
    };
    return taxas[planoAtivo] || 0.10; // Default 10% se não encontrar
  };

  // Efeito para carregar resumo do dia
  useEffect(() => {
    if (!ehAdmin) return;
    
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataFiltro = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const q = query(
      collection(db, 'agendamentos'),
      where('dataFiltro', '==', dataFiltro)
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let confirmados = 0, pendentes = 0, cancelados = 0, arrecadacaoConecta = 0;
      
      const agendamentosHoje = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Buscar dados dos profissionais para calcular taxas corretas
      const profissionaisCache = {};
      
      for (const ag of agendamentosHoje) {
        const valor = calcularValorAgendamento(ag);
        
        if (ag.status === 'confirmado') {
          confirmados++;
          
          // Buscar plano do profissional
          let plano = 'pro_iniciante'; // Default
          if (ag.profissionalId && !profissionaisCache[ag.profissionalId]) {
            try {
              const profDoc = await getDocs(query(collection(db, 'usuarios'), where('__name__', '==', ag.profissionalId)));
              if (!profDoc.empty) {
                const profData = profDoc.docs[0].data();
                plano = profData.planoAtivo || 'pro_iniciante';
                profissionaisCache[ag.profissionalId] = plano;
              }
            } catch (e) {
              console.log('Erro ao buscar plano do profissional:', e);
            }
          } else if (ag.profissionalId && profissionaisCache[ag.profissionalId]) {
            plano = profissionaisCache[ag.profissionalId];
          }
          
          // Calcular taxa da Conecta
          const taxa = calcularTaxaConecta(plano);
          arrecadacaoConecta += valor * taxa;
          
        } else if (ag.status === 'pendente') {
          pendentes++;
        } else if (ag.status === 'cancelado' || ag.status === 'recusado') {
          cancelados++;
        }
      }
      
      setResumoDia({
        totalHoje: agendamentosHoje.length,
        confirmados,
        pendentes,
        cancelados,
        faturamentoHoje: arrecadacaoConecta // Arrecadação da Conecta (taxas)
      });
      
      // Próximos agendamentos (ordenados por horário)
      const proximos = agendamentosHoje
        .filter(ag => ag.status !== 'cancelado' && ag.status !== 'recusado')
        .sort((a, b) => {
          // Ordenar por horário
          const horaA = a.horario || '00:00';
          const horaB = b.horario || '00:00';
          return horaA.localeCompare(horaB);
        })
        .slice(0, 5); // Top 5
      
      setProximosAgendamentos(proximos);
      
      // Alertas
      const novosAlertas = [];
      
      // Agendamentos pendentes com mais de 2 horas
      const agora = new Date();
      agendamentosHoje.forEach(ag => {
        if (ag.status === 'pendente' && ag.dataCriacao) {
          const dataCriacao = ag.dataCriacao.toDate ? ag.dataCriacao.toDate() : new Date(ag.dataCriacao);
          const horasDiff = (agora - dataCriacao) / (1000 * 60 * 60);
          
          if (horasDiff > 2) {
            novosAlertas.push({
              tipo: 'urgente',
              mensagem: `Agendamento pendente há ${Math.floor(horasDiff)}h - ${ag.clienteNome} com ${ag.profissionalNome || 'Profissional'}`,
              agendamentoId: ag.id
            });
          }
        }
      });
      
      setAlertas(novosAlertas);
    });
    
    return () => unsubscribe();
  }, [ehAdmin]);

  // Efeito para carregar estatísticas da semana
  useEffect(() => {
    if (!ehAdmin) return;
    
    const hoje = new Date();
    const labels = [];
    const agendamentosSemana = [];
    const faturamentoSemana = [];
    
    // Últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      
      const dataFiltro = data.toISOString().split('T')[0];
      labels.push(data.toLocaleDateString('pt-BR', { weekday: 'short' }));
      
      // Consulta para cada dia
      const q = query(
        collection(db, 'agendamentos'),
        where('dataFiltro', '==', dataFiltro),
        where('status', 'in', ['confirmado', 'concluido'])
      );
      
      getDocs(q).then(snapshot => {
        let totalDia = 0;
        let faturamentoDia = 0;
        
        snapshot.docs.forEach(doc => {
          const ag = doc.data();
          totalDia++;
          faturamentoDia += calcularValorAgendamento(ag);
        });
        
        agendamentosSemana.push(totalDia);
        faturamentoSemana.push(faturamentoDia);
        
        // Atualizar quando todos os dados forem carregados
        if (agendamentosSemana.length === 7) {
          setEstatisticasSemana({
            labels,
            agendamentos: agendamentosSemana,
            faturamento: faturamentoSemana
          });
        }
      });
    }
  }, [ehAdmin]);

  const navegarPara = (rota) => {
    router.push(rota);
  };

  if (!ehAdmin) return <div className="p-20 text-center text-red-500 font-bold">Acesso Restrito ao Quartel General.</div>;
  if (loading) return <div className="loading-admin-premium">Iniciando Sistemas de Controle...</div>;

  return (
    <div className="admin-page-premium">
      <Topbar 
        title="Quartel General (HQ)" 
        subtitle={`Bem-vindo, Comandante ${dadosUsuario?.nome?.split(' ')[0]}`} 
      />

      <div className="admin-container-premium">
        
        {/* KPIs DE CONTROLE GLOBAL */}
        <div className="admin-kpi-grid">
          <div className="admin-card-hq">
            <div className="card-head">
              <div className="icon-wrap blue"><Scissors size={20} /></div>
              <span className="trend-up"><ArrowUpRight size={14} /> +12%</span>
            </div>
            <div className="card-body">
              <h3>{stats.totalProfissionais}</h3>
              <p>Profissionais Ativos</p>
            </div>
          </div>

          <div className="admin-card-hq">
            <div className="card-head">
              <div className="icon-wrap purple"><Users size={20} /></div>
              <span className="trend-up"><ArrowUpRight size={14} /> +5%</span>
            </div>
            <div className="card-body">
              <h3>{stats.totalClientes}</h3>
              <p>Clientes na Base</p>
            </div>
          </div>

          <div className="admin-card-hq">
            <div className="card-head">
              <div className="icon-wrap gold"><DollarSign size={20} /></div>
              <span className="trend-up"><ArrowUpRight size={14} /> +24%</span>
            </div>
            <div className="card-body">
              <h3>R$ {stats.receitaPlataforma.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p>Arrecadação Conecta (Taxas)</p>
            </div>
          </div>

          <div className="admin-card-hq highlight">
            <div className="card-head">
              <div className="icon-wrap orange"><ShieldCheck size={20} /></div>
              <span className="badge-alert">URGENTE</span>
            </div>
            <div className="card-body">
              <h3>{stats.pendentesVerificacao}</h3>
              <p>Profissionais p/ Verificar</p>
            </div>
          </div>
        </div>

        {/* ÁREA DE OPERAÇÕES EM TEMPO REAL */}
        <div className="admin-ops-section">
          
          {/* Dashboard Completo - Resumo do Dia */}
          <div className="ops-card main-ops dashboard-completo">
            <div className="ops-header">
              <h4>📊 Resumo do Dia</h4>
              <span className="data-hoje">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            
            {/* Cards de Métricas */}
            <div className="metricas-grid">
              <div className="metrica-card total">
                <span className="metrica-valor">{resumoDia.totalHoje}</span>
                <span className="metrica-label">Total Agendamentos</span>
              </div>
              <div className="metrica-card confirmado">
                <span className="metrica-valor">{resumoDia.confirmados}</span>
                <span className="metrica-label">Confirmados</span>
              </div>
              <div className="metrica-card pendente">
                <span className="metrica-valor">{resumoDia.pendentes}</span>
                <span className="metrica-label">Pendentes</span>
              </div>
              <div className="metrica-card cancelado">
                <span className="metrica-valor">{resumoDia.cancelados}</span>
                <span className="metrica-label">Cancelados</span>
              </div>
              <div className="metrica-card faturamento">
                <span className="metrica-valor">
                  {resumoDia.faturamentoHoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="metrica-label">Arrecadação Conecta (Taxas)</span>
              </div>
            </div>

            {/* Alertas */}
            {alertas.length > 0 && (
              <div className="alertas-section">
                <h5>🚨 Alertas ({alertas.length})</h5>
                {alertas.slice(0, 3).map((alerta, idx) => (
                  <div key={idx} className={`alerta-item ${alerta.tipo}`}>
                    <span className="alerta-texto">{alerta.mensagem}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Próximos Agendamentos */}
            <div className="proximos-section">
              <h5>📅 Próximos Agendamentos</h5>
              {proximosAgendamentos.length === 0 ? (
                <p className="sem-agendamentos">Nenhum agendamento para hoje</p>
              ) : (
                <div className="proximos-lista">
                  {proximosAgendamentos.map((ag) => (
                    <div key={ag.id} className="proximo-item">
                      <div className="proximo-hora">{ag.horario}</div>
                      <div className="proximo-info">
                        <span className="proximo-cliente">{ag.clienteNome}</span>
                        <span className="proximo-profissional">com {ag.profissionalNome || 'Profissional'}</span>
                        <span className={`proximo-status ${ag.status}`}>{ag.status}</span>
                      </div>
                      <div className="proximo-valor">
                        {(ag.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estatísticas da Semana (Mini Gráfico) */}
            <div className="semana-section">
              <h5>📈 Últimos 7 Dias</h5>
              <div className="semana-barras">
                {estatisticasSemana.labels.map((label, idx) => (
                  <div key={idx} className="semana-barra-container">
                    <div 
                      className="semana-barra" 
                      style={{ 
                        height: `${Math.max((estatisticasSemana.agendamentos[idx] || 0) * 20, 4)}px`,
                        background: estatisticasSemana.agendamentos[idx] > 0 ? '#3B82F6' : '#E5E7EB'
                      }}
                    />
                    <span className="semana-label">{label}</span>
                    <span className="semana-valor">{estatisticasSemana.agendamentos[idx] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ops-card side-ops">
            <div className="ops-header">
              <h4>Ações Rápidas</h4>
            </div>
            <div className="acoes-grid">
              <button className="acao-btn" onClick={() => navegarPara('/admin/equipe')}>
                <UserPlus size={24} />
                <span>Cadastrar Staff</span>
              </button>
              <button className="acao-btn" onClick={() => navegarPara('/admin/suporte')}>
                <MessageCircle size={24} />
                <span>Abrir Suporte</span>
              </button>
              <button className="acao-btn" onClick={() => navegarPara('/admin/financeiro')}>
                <FileText size={24} />
                <span>Relatórios Globais</span>
              </button>
              <button className="qa-btn" onClick={() => navegarPara('/admin/campanhas')}>
                <AlertCircle size={18} /> Enviar Alerta GERAL
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
