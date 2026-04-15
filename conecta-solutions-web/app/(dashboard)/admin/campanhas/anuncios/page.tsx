'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit2,
  Pause,
  Play,
  Trash2,
  TrendingUp,
  DollarSign,
  MousePointer,
  Users,
  ChevronDown,
  XCircle
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { 
  listarAnuncios, 
  subscribeAnuncios, 
  Anuncio, 
  StatusAnuncio,
  TipoAnuncio,
  atualizarAnuncio,
  deleteAnuncio,
  excluirAnuncio
} from '@/lib/anuncioService';

const statusLabels: Record<StatusAnuncio, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: '#6B7280' },
  pendente: { label: 'Pendente', color: '#F59E0B' },
  ativo: { label: 'Ativo', color: '#10B981' },
  pausado: { label: 'Pausado', color: '#EF4444' },
  expirado: { label: 'Expirado', color: '#8B5CF6' },
  reprovado: { label: 'Reprovado', color: '#DC2626' }
};

const tipoLabels: Record<TipoAnuncio, string> = {
  banner_superior: 'Banner Superior',
  banner_lateral: 'Banner Lateral',
  card: 'Card',
  banner_full: 'Banner Full',
  modal: 'Modal Pop-up',
  push: 'Push Notification',
  story: 'Story'
};

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<StatusAnuncio | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<TipoAnuncio | ''>('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar inicial
    carregarAnuncios();
    
    // Subscribe em tempo real
    const unsubscribe = subscribeAnuncios((data) => {
      setAnuncios(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const carregarAnuncios = async () => {
    try {
      const data = await listarAnuncios();
      setAnuncios(data);
    } catch (err) {
      console.error('Erro ao carregar anúncios:', err);
    } finally {
      setLoading(false);
    }
  };

  const pausarReativar = async (anuncio: Anuncio) => {
    const novoStatus = anuncio.status === 'ativo' ? 'pausado' : 'ativo';
    try {
      await atualizarAnuncio(anuncio.id!, { status: novoStatus });
    } catch (err) {
      alert('Erro ao alterar status do anúncio');
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este anúncio?')) return;
    try {
      await excluirAnuncio(id);
    } catch (err) {
      alert('Erro ao excluir anúncio');
    }
  };

  const anunciosFiltrados = anuncios.filter(a => {
    const matchStatus = !filtroStatus || a.status === filtroStatus;
    const matchTipo = !filtroTipo || a.tipo === filtroTipo;
    const matchBusca = !busca || 
      a.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      a.tituloAnuncio?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchTipo && matchBusca;
  });

  // Métricas gerais
  const totalAtivos = anuncios.filter(a => a.status === 'ativo').length;
  const totalImpressoes = anuncios.reduce((acc, a) => acc + (a.metricas?.impressoes || 0), 0);
  const totalCliques = anuncios.reduce((acc, a) => acc + (a.metricas?.cliques || 0), 0);
  const totalGasto = anuncios.reduce((acc, a) => acc + (a.metricas?.gastoTotal || 0), 0);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando anúncios...</p>
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
            <Megaphone size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Anúncios Patrocinados
          </h1>
          <p className="admin-subtitle">Gerencie campanhas publicitárias de empresas parceiras</p>
        </div>
        <Link href="/admin/campanhas/anuncios/novo" className="btn-primary">
          <Plus size={18} />
          Novo Anúncio
        </Link>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card success">
          <div className="kpi-icon"><Megaphone size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Anúncios Ativos</span>
            <span className="kpi-value">{totalAtivos}</span>
          </div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-icon"><Eye size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Impressões</span>
            <span className="kpi-value">{totalImpressoes.toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon"><MousePointer size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Cliques</span>
            <span className="kpi-value">{totalCliques.toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><DollarSign size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Faturamento Total</span>
            <span className="kpi-value">R$ {totalGasto.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16, 
        marginBottom: 24,
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #1a1f2e 0%, #111827 100%)',
        borderRadius: 16,
        border: '1px solid #374151',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: 2, minWidth: 280 }}>
          <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar anúncio por título..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px 14px 48px',
              background: '#0B0F1A',
              border: '2px solid #374151',
              borderRadius: 12,
              color: '#F9FAFB',
              fontSize: 15,
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
            onBlur={(e) => e.target.style.borderColor = '#374151'}
          />
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 40, background: '#374151' }} />
        
        {/* Filtro Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <label style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Status
          </label>
          <div style={{ position: 'relative' }}>
            <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8B5CF6', pointerEvents: 'none' }} />
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusAnuncio)}
              style={{
                width: '100%',
                padding: '12px 36px 12px 40px',
                background: '#0B0F1A',
                border: '2px solid #374151',
                borderRadius: 10,
                color: '#F9FAFB',
                fontSize: 14,
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#8B5CF6'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            >
              <option value="">Todos os status</option>
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Filtro Tipo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <label style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Tipo
          </label>
          <div style={{ position: 'relative' }}>
            <Megaphone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#3B82F6', pointerEvents: 'none' }} />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoAnuncio)}
              style={{
                width: '100%',
                padding: '12px 36px 12px 40px',
                background: '#0B0F1A',
                border: '2px solid #374151',
                borderRadius: 10,
                color: '#F9FAFB',
                fontSize: 14,
                cursor: 'pointer',
                appearance: 'none',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
            >
              <option value="">Todos os tipos</option>
              {Object.entries(tipoLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Botão Limpar Filtros */}
        {(busca || filtroStatus || filtroTipo) && (
          <button
            onClick={() => {
              setBusca('');
              setFiltroStatus('');
              setFiltroTipo('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'transparent',
              border: '2px solid #EF4444',
              borderRadius: 10,
              color: '#EF4444',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginLeft: 'auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EF4444';
              e.currentTarget.style.color = '#FFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#EF4444';
            }}
          >
            <XCircle size={18} />
            Limpar
          </button>
        )}
      </div>

      {/* Lista de Anúncios */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Anúncio</th>
              <th>Tipo</th>
              <th>Modelo</th>
              <th>Status</th>
              <th>Impressões</th>
              <th>Cliques</th>
              <th>CTR</th>
              <th>Gasto</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {anunciosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>
                  <Megaphone size={48} style={{ color: '#6B7280', marginBottom: 16 }} />
                  <p style={{ color: '#9CA3AF' }}>Nenhum anúncio encontrado</p>
                </td>
              </tr>
            ) : (
              anunciosFiltrados.map((anuncio) => (
                <tr key={anuncio.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {anuncio.imagemUrl && (
                        <img 
                          src={anuncio.imagemUrl} 
                          alt="" 
                          style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 500 }}>{anuncio.tituloAnuncio || anuncio.titulo}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>{anuncio.ctaTexto}</div>
                      </div>
                    </div>
                  </td>
                  <td>{tipoLabels[anuncio.tipo]}</td>
                  <td style={{ textTransform: 'uppercase' }}>{anuncio.modeloCobranca}</td>
                  <td>
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: `${statusLabels[anuncio.status].color}20`,
                        color: statusLabels[anuncio.status].color,
                        borderColor: statusLabels[anuncio.status].color
                      }}
                    >
                      {statusLabels[anuncio.status].label}
                    </span>
                  </td>
                  <td>{(anuncio.metricas?.impressoes || 0).toLocaleString()}</td>
                  <td>{(anuncio.metricas?.cliques || 0).toLocaleString()}</td>
                  <td>{(anuncio.metricas?.ctr || 0).toFixed(2)}%</td>
                  <td>R$ {(anuncio.metricas?.gastoTotal || 0).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link 
                        href={`/admin/campanhas/anuncios/${anuncio.id}`}
                        className="btn-icon"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </Link>
                      
                      {(anuncio.status === 'ativo' || anuncio.status === 'pausado') && (
                        <button
                          onClick={() => pausarReativar(anuncio)}
                          className="btn-icon"
                          title={anuncio.status === 'ativo' ? 'Pausar' : 'Reativar'}
                        >
                          {anuncio.status === 'ativo' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                      )}
                      
                      <button
                        onClick={() => excluir(anuncio.id!)}
                        className="btn-icon danger"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
