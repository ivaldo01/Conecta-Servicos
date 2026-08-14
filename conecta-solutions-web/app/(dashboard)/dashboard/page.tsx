'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { collection, query, where, getDocs, limit as firestoreLimit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import BannerAd from '@/components/ads/BannerAd';
import {
  Calendar, Users, Clock, DollarSign, Star, ArrowRight,
  Zap, Shield, MapPin, Wrench, Activity, 
  Trash, Search, User, ChevronRight, CheckCircle,
  TrendingUp, Plus, Wallet, BarChart3, Sparkles
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
  const { user, dadosUsuario, ehAdmin, ehProfissional, ehColaborador, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profs, setProfs]             = useState<Profissional[]>([]);
  const [loading, setLoading]           = useState(true);

  const hoje = new Date();
  const hojeStr = hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    if (!authLoading && ehAdmin) {
      router.replace('/admin');
    }
  }, [authLoading, ehAdmin, router]);

  useEffect(() => {
    if (authLoading || !user?.uid || ehAdmin) return;

    // Não criar listeners para colaboradores
    if (ehColaborador) {
      return;
    }

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
            console.error('[Permission Error] Agendamentos:', err.message, err.code);
            if (err.code === 'permission-denied') {
              console.error('[Permission Error] Usuário não tem permissão para ler agendamentos');
            }
            setLoading(false);
          });
        } else {
          try {
            const qProfs = query(
              collection(db, 'usuarios'),
              where('tipo', '==', 'profissional'),
              firestoreLimit(6)
            );
            const snapProfs = await getDocs(qProfs);
            setProfs(snapProfs.docs.map(d => ({ id: d.id, ...d.data() } as Profissional)));
          } catch (err: unknown) {
            const firebaseError = err as { message?: string; code?: string };
            console.error('[Permission Error] Profissionais:', firebaseError.message, firebaseError.code);
            if (firebaseError.code === 'permission-denied') {
              console.error('[Permission Error] Usuário não tem permissão para listar profissionais');
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[Dashboard Error]', err);
        setLoading(false);
      }
    }
    
    carregarDados();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [user?.uid, ehAdmin, ehProfissional, ehColaborador, authLoading]);

  // --- COMPONENTE: DASHBOARD DO COLABORADOR ---
  const renderDashboardColaborador = () => {
    const proximos = agendamentos
      .filter((a: Agendamento) => a.status !== 'cancelado' && a.status !== 'concluido')
      .slice(0, 5);

    // Cálculos financeiros
    const atendimentosConcluidos = agendamentos.filter(a => a.status === 'concluido');
    // Comissão estimada (assumindo 50% como padrão, pode vir do perfil)
    const comissaoPercentual = dadosUsuario?.comissaoPercentual || 50;
    const totalReceita = atendimentosConcluidos.reduce((acc, a) => acc + (Number(a.valor) || 0), 0);
    const totalComissao = totalReceita * (comissaoPercentual / 100);

    return (
      <div className="dashboard-profissional">
        {/* Banner informativo */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Users size={24} />
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Área do Colaborador</h2>
          </div>
          <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
            Esta é uma conta gerenciada por {dadosUsuario?.profissionalNome || 'seu profissional'}. 
            Você pode visualizar seus agendamentos e acessar a agenda.
          </p>
        </div>

        {/* RESUMO FINANCEIRO - Simplificado */}
        <div className="dashboard-section" style={{ marginBottom: '24px' }}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><DollarSign size={20} /> Resumo Financeiro</h2>
            <Link href="/financeiro" style={{ fontSize: '14px', color: '#3b82f6' }}>Ver detalhes →</Link>
          </div>
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22c55e'
              }}>
                <Wallet size={24} />
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Sua Comissão Total</p>
                <p style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '4px 0' }}>
                  R$ {totalComissao.toFixed(2).replace('.', ',')}
                </p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                  {comissaoPercentual}% de comissão • {atendimentosConcluidos.length} atendimentos
                </p>
              </div>
            </div>
            <button 
              onClick={() => router.push('/financeiro')}
              style={{
                padding: '12px 20px',
                background: '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              Ver Extrato
            </button>
          </div>
        </div>

        {/* Estatísticas simplificadas */}
        <div className="dashboard-stats">
          <div className="stat-card" style={{ background: 'rgba(34, 197, 94, 0.15)', borderLeft: '4px solid #22c55e' }}>
            <div className="stat-icon" style={{ color: '#22c55e' }}><Calendar size={24} /></div>
            <div className="stat-info">
              <p className="stat-label" style={{ color: '#94a3b8' }}>Agendamentos Hoje</p>
              <p className="stat-value" style={{ color: '#fff' }}>{agendamentos.filter(a => a.dataHora?.toDate?.().toDateString() === new Date().toDateString()).length}</p>
            </div>
          </div>
          <div className="stat-card" style={{ background: 'rgba(59, 130, 246, 0.15)', borderLeft: '4px solid #3b82f6' }}>
            <div className="stat-icon" style={{ color: '#3b82f6' }}><Clock size={24} /></div>
            <div className="stat-info">
              <p className="stat-label" style={{ color: '#94a3b8' }}>Próximos</p>
              <p className="stat-value" style={{ color: '#fff' }}>{proximos.length}</p>
            </div>
          </div>
        </div>

        {/* Ações rápidas do colaborador */}
        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><Sparkles size={20} /> Acesso Rápido</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => router.push('/agenda')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
              }}
            >
              <Calendar size={18} /> Minha Agenda
            </button>
          </div>
        </div>

        {/* Próximos Atendimentos */}
        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><Activity size={20} /> Seus Próximos Atendimentos</h2>
            <Link href="/agenda" style={{ fontSize: '14px', color: '#3b82f6' }}>Ver todos</Link>
          </div>
          <div className="appointments-list">
            {proximos.length === 0 ? (
              <p className="appointments-empty">Sem agendamentos para você.</p>
            ) : (
              proximos.map(ag => {
                const dataHora = ag.dataHora?.toDate() || new Date();
                const dataStr = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <Link key={ag.id} href={`/agendamentos/${ag.id}`} className="appointment-card">
                    <div className="appointment-avatar">{ag.clienteNome?.[0] || 'C'}</div>
                    <div className="appointment-info">
                      <p className="appointment-name">{ag.clienteNome || 'Cliente'}</p>
                      <p className="appointment-service">{ag.servico || 'Serviço'}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {dataStr} às {horaStr}
                        {ag.valor && ` • R$ ${Number(ag.valor).toFixed(2).replace('.', ',')}`}
                      </p>
                    </div>
                    <div className="appointment-right">
                      <span className={`status-badge-mini status--${ag.status}`}>{ag.status}</span>
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- COMPONENTE: HOME DO CLIENTE ---
  const renderHomeCliente = () => (
    <div className="home-cliente">
      <section className="hc-hero-dashboard">
        <div className="hc-hero-copy">
          <span className="hc-eyebrow">CONECTA SOLUTIONS</span>
          <h1>Encontre o profissional certo para o que você precisa.</h1>
          <p>Compare especialistas, escolha o melhor horário e acompanhe seus serviços em um só lugar.</p>
          <div className="hc-hero-actions">
            <button onClick={() => router.push('/busca')} className="hc-primary-action">
              <Search size={18} /> Buscar profissionais
            </button>
            <button onClick={() => router.push('/agenda')} className="hc-secondary-action">
              <Calendar size={18} /> Meus agendamentos
            </button>
          </div>
        </div>
        <div className="hc-hero-metrics">
          <div><strong>{profs.length}</strong><span>especialistas em destaque</span></div>
          <div><strong>100%</strong><span>perfis verificados</span></div>
          <div><strong>24h</strong><span>acesso à plataforma</span></div>
        </div>
      </section>

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
              {p.bannerPerfil ? <Image src={p.bannerPerfil} alt="Banner" fill sizes="380px" unoptimized /> : <div className="hc-banner-placeholder-gradient" />}
            </div>
            <div className="hc-prof-card-content">
              <div className="hc-prof-avatar-overlap">
                {p.fotoPerfil ? <Image src={p.fotoPerfil} alt={p.nome} width={60} height={60} unoptimized /> : <div className="hc-avatar-fallback">{p.nome?.[0]}</div>}
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
                  <span className="hc-price-val">Ver perfil <ArrowRight size={14} /></span>
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

    // Calcular receita total (agendamentos concluídos com valor)
    const receitaTotal = agendamentos
      .filter(a => a.status === 'concluido')
      .reduce((sum, a) => sum + (Number(a.valor) || 0), 0);

    // Taxa de conversão (pendentes que viraram concluídos)
    const taxaConversao = stats.total > 0 
      ? Math.round((stats.concluidos / stats.total) * 100) 
      : 0;

    const proximos = agendamentos
      .filter(a => a.status === 'pendente' || a.status === 'confirmado')
      .sort((a, b) => (a.dataHora?.seconds || 0) - (b.dataHora?.seconds || 0))
      .slice(0, 5);

    // Dados do profissional logado
    const avaliacaoMedia = dadosUsuario?.avaliacaoMedia || 0;
    const totalAvaliacoes = dadosUsuario?.totalAvaliacoes || 0;

    return (
      <div className="dashboard-body dashboard-body--professional">
        <section className="professional-hero">
          <div>
            <span className="professional-eyebrow">VISÃO GERAL DO NEGÓCIO</span>
            <h1>Olá, {dadosUsuario?.nome?.split(' ')[0] || 'profissional'}.</h1>
            <p>Acompanhe sua operação, organize os próximos atendimentos e mantenha seus serviços sempre disponíveis.</p>
          </div>
          <Link href="/agenda" className="professional-hero-cta">Abrir agenda <ArrowRight size={16} /></Link>
        </section>
        {/* KPI Cards */}
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

        {/* Cards de Receita e Avaliação */}
        <div className="kpi-grid" style={{ marginTop: '16px' }}>
          <Link href="/financeiro" className="kpi-card kpi-card--gold">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><Wallet size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Receita Total</p>
              <p className="kpi-card-value">R$ {receitaTotal.toFixed(2).replace('.', ',')}</p>
            </div>
          </Link>
          <Link href="/avaliacoes" className="kpi-card kpi-card--yellow">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><Star size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Avaliação</p>
              <p className="kpi-card-value">{avaliacaoMedia > 0 ? avaliacaoMedia.toFixed(1) : '-'}</p>
              <p className="kpi-card-subtext">{totalAvaliacoes} avaliações</p>
            </div>
          </Link>
          <div className="kpi-card kpi-card--info">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><TrendingUp size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Taxa de Conversão</p>
              <p className="kpi-card-value">{taxaConversao}%</p>
            </div>
          </div>
          <Link href="/perfil" className="kpi-card kpi-card--pink">
            <div className="kpi-card-header">
              <div className="kpi-card-icon"><User size={22} /></div>
            </div>
            <div className="kpi-card-info">
              <p className="kpi-card-label">Meu Perfil</p>
              <p className="kpi-card-value">Editar</p>
            </div>
          </Link>
        </div>

        {/* Gráfico de Status */}
        {stats.total > 0 && (
          <div className="dashboard-section" style={{ marginTop: '24px' }}>
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title"><BarChart3 size={20} /> Distribuição de Agendamentos</h2>
            </div>
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Barra visual */}
              <div style={{ flex: 1, display: 'flex', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#1e293b' }}>
                {stats.pendentes > 0 && (
                  <div 
                    style={{ 
                      width: `${(stats.pendentes / stats.total) * 100}%`, 
                      background: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.pendentes > 5 && stats.pendentes}
                  </div>
                )}
                {stats.confirmados > 0 && (
                  <div 
                    style={{ 
                      width: `${(stats.confirmados / stats.total) * 100}%`, 
                      background: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.confirmados > 5 && stats.confirmados}
                  </div>
                )}
                {stats.concluidos > 0 && (
                  <div 
                    style={{ 
                      width: `${(stats.concluidos / stats.total) * 100}%`, 
                      background: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.concluidos > 5 && stats.concluidos}
                  </div>
                )}
              </div>
              {/* Legenda */}
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></div>
                  <span style={{ color: '#94a3b8' }}>Pendentes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></div>
                  <span style={{ color: '#94a3b8' }}>Confirmados</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#8b5cf6', borderRadius: '2px' }}></div>
                  <span style={{ color: '#94a3b8' }}>Concluídos</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Atalhos Rápidos */}
        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><Sparkles size={20} /> Ações Rápidas</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', padding: '16px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => router.push('/servicos/novo')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <Plus size={16} /> Novo Serviço
            </button>
            <button 
              onClick={() => router.push('/agenda')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Calendar size={16} /> Minha Agenda
            </button>
            <button 
              onClick={() => router.push('/financeiro')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Wallet size={16} /> Financeiro
            </button>
          </div>
        </div>

        {/* Próximos Atendimentos Melhorado */}
        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title"><Activity size={20} /> Próximos Atendimentos</h2>
            <Link href="/agenda" style={{ fontSize: '14px', color: '#3b82f6' }}>Ver todos</Link>
          </div>
          <div className="appointments-list">
            {proximos.length === 0 ? (
              <div className="appointments-empty">
                <div className="appointments-empty-icon"><Calendar size={24} /></div>
                <strong>Sua agenda está livre</strong>
                <p>Novos atendimentos pendentes ou confirmados aparecerão aqui.</p>
                <Link href="/agenda">Gerenciar disponibilidade <ArrowRight size={14} /></Link>
              </div>
            ) : (
              proximos.map(ag => {
                const dataHora = ag.dataHora?.toDate() || new Date();
                const dataStr = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <Link key={ag.id} href={`/agendamentos/${ag.id}`} className="appointment-card">
                    <div className="appointment-avatar">{ag.clienteNome?.[0] || 'C'}</div>
                    <div className="appointment-info">
                      <p className="appointment-name">{ag.clienteNome || 'Cliente'}</p>
                      <p className="appointment-service">{ag.servico || 'Serviço'}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {dataStr} às {horaStr}
                        {ag.valor && ` • R$ ${Number(ag.valor).toFixed(2).replace('.', ',')}`}
                      </p>
                    </div>
                    <div className="appointment-right">
                      <span className={`status-badge-mini status--${ag.status}`}>{ag.status}</span>
                      <ChevronRight size={16} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <Topbar 
        title={ehProfissional ? 'Painel Profissional' : ehColaborador ? 'Área do Colaborador' : `Olá, ${dadosUsuario?.nome?.split(' ')[0] || 'Cliente'}`} 
        subtitle={hojeStr} 
      />
      <div className="p-6">
        {/* Banner Patrocinado - não mostrar para colaboradores */}
        {!ehColaborador && (
          <div className="mb-6">
            <BannerAd tipo="banner_superior" />
          </div>
        )}
        {loading && !ehColaborador ? <p>Carregando...</p> : (
          ehColaborador ? renderDashboardColaborador() : 
          ehProfissional ? renderDashboardProf() : 
          renderHomeCliente()
        )}
      </div>
    </div>
  );
}
