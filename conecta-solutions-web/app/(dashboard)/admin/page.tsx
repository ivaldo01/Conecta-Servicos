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
          
          <div className="ops-card main-ops">
            <div className="ops-header">
              <h4>Monitor de Atividades</h4>
              <button className="btn-view-all" onClick={() => navegarPara('/admin/financeiro')}>Ver Global</button>
            </div>
            
            <div className="ops-list">
              {atividades.map((atividade) => (
                <div key={atividade.id} className="ops-item">
                  <div className="ops-item-info">
                    <div className="ops-dot active" />
                    <p><strong>{atividade.titulo}:</strong> {atividade.descricao}</p>
                  </div>
                  <span className="ops-time">{atividade.data}</span>
                </div>
              ))}
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
