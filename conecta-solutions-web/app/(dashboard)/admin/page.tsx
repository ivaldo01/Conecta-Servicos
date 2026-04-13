'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, limit, orderBy } from 'firebase/firestore';
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
  UserPlus
} from 'lucide-react';
import '@/styles/admin.css';

export default function AdminDashboard() {
  const { dadosUsuario, ehAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProfissionais: 0,
    totalClientes: 0,
    totalAgendamentos: 0,
    receitaPlataforma: 0,
    pendentesVerificacao: 0
  });

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
          receitaPlataforma: agSnap.size * 2.5, // Exemplo de taxa média por agendamento
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
              <button className="btn-view-all">Ver Global</button>
            </div>
            
            <div className="ops-list">
              {[1,2,3].map(i => (
                <div key={i} className="ops-item">
                  <div className="ops-item-info">
                    <div className="ops-dot active" />
                    <p><strong>Novo Agendamento:</strong> Profissional #8822 acaba de vender um serviço de R$ 150,00.</p>
                  </div>
                  <span className="ops-time">Agora</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ops-card side-ops">
            <div className="ops-header">
              <h4>Ações Rápidas</h4>
            </div>
            <div className="quick-actions-grid">
              <button className="qa-btn"><UserPlus size={18} /> Cadastrar Staff</button>
              <button className="qa-btn"><MessageCircle size={18} /> Abrir Suporte</button>
              <button className="qa-btn"><BarChart3 size={18} /> Relatórios Globais</button>
              <button className="qa-btn"><AlertCircle size={18} /> Enviar Alerta GERAL</button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
