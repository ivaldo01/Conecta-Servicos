'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit as firestoreLimit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import {
  Calendar, Users, Clock, DollarSign, Star, ArrowRight,
  Zap, Shield, MapPin, Wrench, Activity, 
  Trash, Search, Settings, User, ChevronRight, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '@/styles/dashboard.css';
import '@/styles/home-cliente.css';

// ============================================================
// TIPOS
// ============================================================
interface Agendamento {
  id: string;
  clienteNome?: string;
  profissionalNome?: string;
  servico?: string;
  dataHora?: Timestamp;
  status?: string;
  valor?: number;
}

interface Profissional {
  id: string;
  nome: string;
  especialidade?: string;
  categoria?: string;
  fotoPerfil?: string;
  bannerPerfil?: string;
  cidade?: string;
  estado?: string;
  avaliacaoMedia?: number;
  totalAvaliacoes?: number;
}

// ============================================================
// DASHBOARD PRINCIPAL
// ============================================================
export default function DashboardPage() {
  const { user, dadosUsuario, ehProfissional, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profs, setProfs]             = useState<Profissional[]>([]);
  const [loading, setLoading]           = useState(true);

  const hoje = new Date();
  const hojeStr = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    const userId = user.uid;
    let unsubscribe: () => void;

    async function carregarDados() {
      try {
        if (ehProfissional) {
          const q = query(
            collection(db, 'agendamentos'),
            where('profissionalId', '==', userId),
            firestoreLimit(100)
          );

          unsubscribe = onSnapshot(q, (snap) => {
            try {
              const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Agendamento));
              setAgendamentos(lista || []);
              setLoading(false);
            } catch (err) {
              console.error('[Snap Error]', err);
            }
          }, (err) => {
            console.error('[Permission Error]', err);
            setLoading(false);
          });
        } else {
          const qProfs = query(
            collection(db, 'usuarios'),
            where('tipo', '==', 'profissional'),
            firestoreLimit(6)
          );
          const snapProfs = await getDocs(qProfs);
          setProfs(snapProfs.docs.map(d => ({ id: d.id, ...d.data() } as Profissional)));
          setLoading(false);
        }
      } catch (err) {
        console.error('[Dashboard Error]', err);
        setLoading(false);
      }
    }
    
    carregarDados();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user?.uid, ehProfissional, authLoading]);

  // --- COMPONENTE: HOME DO CLIENTE ---
  const renderHomeCliente = () => (
    <div className="home-cliente">
      <div className="hc-banners">
        <div className="hc-banner-card">
          <div className="hc-banner-icon"><Zap size={20} /></div>
          <span className="hc-banner-text">Agendamento rápido</span>
        </div>
        <div className="hc-banner-card">
          <div className="hc-banner-icon"><Shield size={20} /></div>
          <span className="hc-banner-text">Profissionais verificados</span>
        </div>
        <div className="hc-banner-card">
          <div className="hc-banner-icon"><Clock size={20} /></div>
          <span className="hc-banner-text">Atendimento pontual</span>
        </div>
      </div>

      <div className="hc-section-header">
        <h2 className="hc-section-title">Categorias</h2>
        <Link href="/busca" className="hc-section-link">Ver todas <ArrowRight size={14} /></Link>
      </div>
      <div className="hc-categories-grid">
        {[
          { name: 'Eletricista', icon: <Zap size={24}/> },
          { name: 'Encanador', icon: <Wrench size={24}/> },
          { name: 'Pintor', icon: <Activity size={24}/> },
          { name: 'Pedreiro', icon: <Wrench size={24}/> },
          { name: 'Limpeza', icon: <Trash size={24}/> },
          { name: 'Jardineiro', icon: <Search size={24}/> },
          { name: 'Marceneiro', icon: <Wrench size={24}/> },
          { name: 'Ar Condicionado', icon: <Activity size={24}/> },
        ].map(cat => (
          <div key={cat.name} className="hc-category-card" onClick={() => router.push(`/busca?cat=${cat.name}`)}>
            <div className="hc-category-icon">{cat.icon}</div>
            <span className="hc-category-name">{cat.name}</span>
          </div>
        ))}
      </div>

      <div className="hc-section-header">
        <h2 className="hc-section-title">Especialistas em Destaque</h2>
      </div>
      <div className="hc-profs-grid-premium">
        {profs.map(p => (
          <div key={p.id} className="hc-prof-card-enterprise" onClick={() => router.push(`/perfil-profissional/${p.id}`)}>
            <div className="hc-prof-card-banner">
              {p.bannerPerfil ? <img src={p.bannerPerfil} alt="Banner" /> : <div className="hc-banner-placeholder-gradient" />}
            </div>
            <div className="hc-prof-card-content">
              <div className="hc-prof-avatar-overlap">
                {p.fotoPerfil ? <img src={p.fotoPerfil} alt={p.nome} /> : <div className="hc-avatar-fallback">{p.nome?.[0]}</div>}
                <div className="hc-badge-verified-mini">
                  <CheckCircle size={10} />
                </div>
              </div>
              <div className="hc-prof-core-info">
                <h4 className="hc-prof-name-premium">{p.nome}</h4>
                <span className="hc-prof-spec-tag">{p.especialidade || 'Elite'}</span>
                <div className="hc-prof-loc-row">
                  <MapPin size={12} />
                  <span>{p.cidade || 'Localização'}, {p.estado || 'BR'}</span>
                </div>
              </div>
              <div className="hc-prof-footer-premium">
                <div className="hc-prof-rating-box">
                  <Star size={12} />
                  <span>{p.avaliacaoMedia?.toFixed(1) || '5.0'}</span>
                </div>
                <div className="hc-prof-price-box">
                  <span className="hc-price-val">R$ 70/h</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- COMPONENTE: DASHBOARD DO PROFISSIONAL ---
  const renderDashboardProf = () => {
    const stats = {
      total: agendamentos.length,
      pendentes: agendamentos.filter(a => a.status === 'pendente').length,
      confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
      concluidos: agendamentos.filter(a => a.status === 'concluido').length,
    };

    const proximos = agendamentos
      .filter(a => a.status === 'pendente' || a.status === 'confirmado')
      .sort((a, b) => (a.dataHora?.seconds || 0) - (b.dataHora?.seconds || 0))
      .slice(0, 5);

    return (
      <div className="dashboard-body">
        <div className="kpi-grid">
          <Link href="/agendamentos" className="kpi-card kpi-card--blue">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><Calendar size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Total Geral</p>
              <p className="kpi-card-value">{stats.total}</p>
            </div>
          </Link>
          <Link href="/agendamentos?status=pendente" className="kpi-card kpi-card--orange">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><Clock size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Pendentes</p>
              <p className="kpi-card-value">{stats.pendentes}</p>
            </div>
          </Link>
          <Link href="/agendamentos?status=confirmado" className="kpi-card kpi-card--green">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><CheckCircle size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Confirmados</p>
              <p className="kpi-card-value">{stats.confirmados}</p>
            </div>
          </Link>
          <Link href="/agendamentos?status=concluido" className="kpi-card kpi-card--purple">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><DollarSign size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Concluídos</p>
              <p className="kpi-card-value">{stats.concluidos}</p>
            </div>
          </Link>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><Activity size={20} /> Próximos Atendimentos</h2>
          </div>
          <div className="appointments-list">
            {proximos.length === 0 ? (
              <p className="appointments-empty">Sem atividades recentes.</p>
            ) : (
              proximos.map(ag => (
                <Link key={ag.id} href={`/agendamentos/${ag.id}`} className="appointment-card">
                  <div className="appointment-avatar">{ag.clienteNome?.[0] || 'C'}</div>
                  <div className="appointment-info">
                    <p className="appointment-name">{ag.clienteNome}</p>
                    <p className="appointment-service">{ag.servico || 'Serviço'}</p>
                  </div>
                  <div className="appointment-right">
                    <span className={`status-badge-mini status--${ag.status}`}>{ag.status}</span>
                    <ChevronRight size={16} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <Topbar 
        title={ehProfissional ? 'Painel Profissional' : `Olá, ${dadosUsuario?.nome?.split(' ')[0] || 'Cliente'}`} 
        subtitle={hojeStr} 
      />
      <div className="p-6">
        {loading ? <p>Carregando...</p> : (ehProfissional ? renderDashboardProf() : renderHomeCliente())}
      </div>
    </div>
  );
}
