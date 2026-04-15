'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  getDocs,
  Timestamp,
  FirestoreError
} from 'firebase/firestore';
import {
  User,
  Calendar,
  CreditCard,
  MessageSquare,
  LogIn,
  Edit3,
  Search,
  Eye,
  Smartphone,
  Globe,
  Monitor,
  Clock,
  MapPin,
  Activity,
  Radio,
  RefreshCw
} from 'lucide-react';
import '@/styles/admin-financeiro.css';

interface ActivityLog {
  id: string;
  userId: string;
  userNome: string;
  userEmail: string;
  tipoUsuario: 'cliente' | 'profissional' | 'admin';
  acao: string;
  categoria: 'auth' | 'agendamento' | 'pagamento' | 'perfil' | 'navegacao' | 'chat' | 'sistema';
  plataforma: 'mobile' | 'web' | 'desktop';
  detalhes: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  localizacao?: string;
  timestamp: Timestamp;
  createdAt: Date;
}

const iconePorCategoria = {
  auth: LogIn,
  agendamento: Calendar,
  pagamento: CreditCard,
  perfil: Edit3,
  navegacao: Eye,
  chat: MessageSquare,
  sistema: Activity
};

const corPorCategoria: Record<string, string> = {
  auth: 'badge-blue',
  agendamento: 'badge-green',
  pagamento: 'badge-yellow',
  perfil: 'badge-purple',
  navegacao: 'badge-gray',
  chat: 'badge-pink',
  sistema: 'badge-cyan'
};

const iconePorPlataforma = {
  mobile: Smartphone,
  web: Globe,
  desktop: Monitor
};

export default function MonitorAtividadesPage() {
  const [atividades, setAtividades] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroPlataforma, setFiltroPlataforma] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [usuariosOnline, setUsuariosOnline] = useState(0);
  const [stats, setStats] = useState({
    totalHoje: 0,
    mobile: 0,
    web: 0,
    desktop: 0,
    clientes: 0,
    profissionais: 0
  });
  const [modoFallback, setModoFallback] = useState(false);
  const [erroPermissao, setErroPermissao] = useState<string>('');
  const { ehAdmin } = useAuth();

  const atualizarStats = useCallback((data: ActivityLog[]) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const hojeAtividades = data.filter(a => a.createdAt >= hoje);
    const usuariosUnicos = new Set(data.map(a => a.userId)).size;

    setStats({
      totalHoje: hojeAtividades.length,
      mobile: data.filter(a => a.plataforma === 'mobile').length,
      web: data.filter(a => a.plataforma === 'web').length,
      desktop: data.filter(a => a.plataforma === 'desktop').length,
      clientes: data.filter(a => a.tipoUsuario === 'cliente').length,
      profissionais: data.filter(a => a.tipoUsuario === 'profissional').length
    });

    setUsuariosOnline(usuariosUnicos);
  }, []);

  // Função para carregar dados manualmente (fallback)
  const carregarDados = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'activityLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp)
        } as ActivityLog;
      });

      setAtividades(data);
      setLoading(false);
      atualizarStats(data);
      setModoFallback(true);
      console.log(`[Monitor] ${data.length} atividades carregadas (getDocs)`);
    } catch (err) {
      const errorMsg = err instanceof FirestoreError ? err.message : String(err);
      console.error('[Monitor] Erro ao carregar:', errorMsg);
      setErroPermissao(errorMsg);
      setLoading(false);
    }
  }, [atualizarStats]);

  useEffect(() => {
    console.log('[Monitor] Iniciando...');
    
    // Tentar usar onSnapshot primeiro
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d,
            createdAt: d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp)
          } as ActivityLog;
        });

        setAtividades(data);
        setLoading(false);
        atualizarStats(data);
        console.log(`[Monitor] ${data.length} atividades (real-time)`);
      }, (error) => {
        console.warn('[Monitor] onSnapshot falhou:', error.message);
        setErroPermissao(error.message);
        // Não tentar fallback para evitar múltiplos erros
        setLoading(false);
      });
    } catch (err) {
      console.warn('[Monitor] Erro ao iniciar onSnapshot:', err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [carregarDados, atualizarStats]);

  const formatarTempo = (date: Date) => {
    const agora = new Date();
    const diff = agora.getTime() - date.getTime();
    const segundos = Math.floor(diff / 1000);
    const minutos = Math.floor(segundos / 60);
    const horas = Math.floor(minutos / 60);

    if (segundos < 60) return 'agora';
    if (minutos < 60) return `${minutos}m`;
    if (horas < 24) return `${horas}h`;
    return date.toLocaleDateString('pt-BR');
  };

  const atividadesFiltradas = atividades.filter(a => {
    const matchCategoria = filtroCategoria === 'todas' || a.categoria === filtroCategoria;
    const matchPlataforma = filtroPlataforma === 'todas' || a.plataforma === filtroPlataforma;
    const matchBusca = busca === '' || 
      (a.userNome?.toLowerCase().includes(busca.toLowerCase()) ?? false) ||
      (a.acao?.toLowerCase().includes(busca.toLowerCase()) ?? false) ||
      (typeof a.detalhes?.pagina === 'string' && a.detalhes.pagina.toLowerCase().includes(busca.toLowerCase()));
    
    return matchCategoria && matchPlataforma && matchBusca;
  });

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando monitor de atividades...</p>
          {erroPermissao && (
            <p style={{ color: '#EF4444', marginTop: 16, maxWidth: 400, textAlign: 'center' }}>
              Erro: {erroPermissao}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (erroPermissao && atividades.length === 0) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              <Radio size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
              Monitor de Atividades
            </h1>
            <p className="admin-subtitle">Acompanhe em tempo real tudo que acontece no sistema</p>
          </div>
        </div>
        
        <div style={{
          padding: 40,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 16,
          textAlign: 'center',
          maxWidth: 600,
          margin: '40px auto'
        }}>
          <h2 style={{ color: '#EF4444', marginBottom: 16 }}>⚠️ Erro de Permissão</h2>
          <p style={{ marginBottom: 24, color: '#CBD5E1' }}>
            <strong>Mensagem:</strong> {erroPermissao}
          </p>
          
          <div style={{ textAlign: 'left', background: '#0B0F1A', padding: 20, borderRadius: 12, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>🔧 Soluções:</h3>
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Verifique se você é admin em <a href="/admin/diagnostico" style={{ color: '#3B82F6' }}>/admin/diagnostico</a></li>
              <li>Adicione <code>isAdmin: true</code> no seu documento no Firestore</li>
              <li>Deploy das regras: <code>firebase deploy --only firestore:rules</code></li>
            </ol>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">
            <Radio size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Monitor de Atividades
          </h1>
          <p className="admin-subtitle">Acompanhe em tempo real tudo que acontece no sistema</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={carregarDados}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
            title="Recarregar dados"
          >
            <RefreshCw size={16} />
            Recarregar
          </button>
          <div className={`badge ${modoFallback ? 'badge-yellow' : 'badge-green'}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ 
              width: 8, 
              height: 8, 
              background: modoFallback ? '#F59E0B' : '#10B981', 
              borderRadius: '50%', 
              display: 'inline-block',
              animation: modoFallback ? 'none' : 'pulse 2s infinite'
            }}></span>
            {modoFallback ? 'MODO MANUAL' : 'AO VIVO'}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-icon">
            <User size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Usuários Online</span>
            <span className="kpi-value">{usuariosOnline}</span>
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon">
            <Activity size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Atividades Hoje</span>
            <span className="kpi-value">{stats.totalHoje}</span>
          </div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon">
            <Smartphone size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Mobile / Web</span>
            <span className="kpi-value">{stats.mobile} / {stats.web}</span>
          </div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-icon">
            <Calendar size={24} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Clientes / Profs</span>
            <span className="kpi-value">{stats.clientes} / {stats.profissionais}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar usuário, ação ou página..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="filter-select"
          >
            <option value="todas">Todas categorias</option>
            <option value="auth">Autenticação</option>
            <option value="agendamento">Agendamento</option>
            <option value="pagamento">Pagamento</option>
            <option value="perfil">Perfil</option>
            <option value="navegacao">Navegação</option>
            <option value="chat">Chat</option>
          </select>

          <select
            value={filtroPlataforma}
            onChange={(e) => setFiltroPlataforma(e.target.value)}
            className="filter-select"
          >
            <option value="todas">Todas plataformas</option>
            <option value="mobile">Mobile</option>
            <option value="web">Web</option>
            <option value="desktop">Desktop</option>
          </select>
        </div>
      </div>

      {/* Lista de Atividades */}
      <div className="data-table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={20} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Atividades em Tempo Real</h3>
          <span className="badge badge-blue">{atividadesFiltradas.length} registros</span>
        </div>

        {atividadesFiltradas.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <Activity size={48} />
            <p>Nenhuma atividade encontrada</p>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 8 }}>
              As atividades aparecerão aqui quando usuários interagirem com o sistema
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {atividadesFiltradas.map((atividade) => {
              const IconeCategoria = iconePorCategoria[atividade.categoria] || Activity;
              const IconePlataforma = iconePorPlataforma[atividade.plataforma] || Globe;
              const corCategoria = corPorCategoria[atividade.categoria] || 'badge-gray';

              return (
                <div
                  key={atividade.id}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #1E293B',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                    transition: 'background 0.2s',
                    ':hover': { background: 'rgba(30, 41, 59, 0.5)' }
                  }}
                  className="activity-row"
                >
                  {/* Ícone da categoria */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: atividade.categoria === 'auth' ? 'rgba(59, 130, 246, 0.2)' :
                               atividade.categoria === 'agendamento' ? 'rgba(34, 197, 94, 0.2)' :
                               atividade.categoria === 'pagamento' ? 'rgba(245, 158, 11, 0.2)' :
                               atividade.categoria === 'perfil' ? 'rgba(168, 85, 247, 0.2)' :
                               'rgba(100, 116, 139, 0.2)',
                    color: atividade.categoria === 'auth' ? '#60A5FA' :
                          atividade.categoria === 'agendamento' ? '#4ADE80' :
                          atividade.categoria === 'pagamento' ? '#FBBF24' :
                          atividade.categoria === 'perfil' ? '#A78BFA' :
                          '#94A3B8'
                  }}>
                    <IconeCategoria size={20} />
                  </div>

                  {/* Conteúdo */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#F1F5F9' }}>
                        {atividade.userNome || 'Usuário'}
                      </span>
                      <span className={`badge ${corCategoria}`}>
                        {atividade.tipoUsuario}
                      </span>
                      <span style={{ color: '#64748B' }}>•</span>
                      <span style={{ color: '#CBD5E1' }}>{atividade.acao}</span>
                    </div>

                    {/* Detalhes */}
                    {atividade.detalhes && Object.keys(atividade.detalhes).length > 0 && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {atividade.detalhes.pagina && (
                          <span style={{ fontSize: 12, background: '#0B0F1A', padding: '4px 8px', borderRadius: 4, color: '#94A3B8' }}>
                            📄 {String(atividade.detalhes.pagina)}
                          </span>
                        )}
                        {atividade.detalhes.servico && (
                          <span style={{ fontSize: 12, background: '#0B0F1A', padding: '4px 8px', borderRadius: 4, color: '#94A3B8' }}>
                            💇 {String(atividade.detalhes.servico)}
                          </span>
                        )}
                        {atividade.detalhes.profissional && (
                          <span style={{ fontSize: 12, background: '#0B0F1A', padding: '4px 8px', borderRadius: 4, color: '#94A3B8' }}>
                             {String(atividade.detalhes.profissional)}
                          </span>
                        )}
                        {atividade.detalhes.valor && (
                          <span style={{ fontSize: 12, background: '#0B0F1A', padding: '4px 8px', borderRadius: 4, color: '#4ADE80' }}>
                            R$ {String(atividade.detalhes.valor)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 12, color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconePlataforma size={12} />
                        {atividade.plataforma}
                      </span>
                      {atividade.localizacao && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} />
                          {atividade.localizacao}
                        </span>
                      )}
                      <span style={{ fontFamily: 'monospace' }}>
                        ID: {atividade.userId?.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                      {formatarTempo(atividade.createdAt)}
                    </span>
                    <p style={{ fontSize: 11, color: '#64748B', margin: '4px 0 0 0' }}>
                      {atividade.createdAt.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dica */}
      <div style={{
        marginTop: 20,
        padding: 16,
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <Activity size={20} style={{ color: '#60A5FA', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 14, color: '#93C5FD' }}>
          <strong>Dica:</strong> O sistema registra automaticamente login, navegação, agendamentos, 
          pagamentos e alterações de perfil. Os dados aparecem aqui em tempo real.
        </p>
      </div>
    </div>
  );
}
