'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Plus, 
  Search, 
  Phone,
  Mail,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  Ban,
  User
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { 
  listarAnunciantes, 
  subscribeAnunciantes, 
  Anunciante, 
  StatusAnunciante,
  atualizarAnunciante
} from '@/lib/anuncioService';

const statusLabels: Record<StatusAnunciante, { label: string; color: string; icon: any }> = {
  ativo: { label: 'Ativo', color: '#10B981', icon: CheckCircle },
  inadimplente: { label: 'Inadimplente', color: '#EF4444', icon: AlertCircle },
  bloqueado: { label: 'Bloqueado', color: '#DC2626', icon: Ban },
  pendente: { label: 'Pendente', color: '#F59E0B', icon: AlertCircle }
};

export default function AnunciantesPage() {
  const [anunciantes, setAnunciantes] = useState<Anunciante[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<StatusAnunciante | ''>('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarAnunciantes();
    const unsubscribe = subscribeAnunciantes((data) => {
      setAnunciantes(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const carregarAnunciantes = async () => {
    try {
      const data = await listarAnunciantes(filtroStatus ? { status: filtroStatus } : undefined);
      setAnunciantes(data);
    } catch (err) {
      console.error('Erro ao carregar anunciantes:', err);
    } finally {
      setLoading(false);
    }
  };

  const alterarStatus = async (id: string, novoStatus: StatusAnunciante) => {
    try {
      await atualizarAnunciante(id, { status: novoStatus });
    } catch (err) {
      alert('Erro ao alterar status');
    }
  };

  const anunciantesFiltrados = anunciantes.filter(a => {
    const matchBusca = !busca || 
      a.nomeFantasia?.toLowerCase().includes(busca.toLowerCase()) ||
      a.razaoSocial?.toLowerCase().includes(busca.toLowerCase()) ||
      a.cnpj?.includes(busca);
    return matchBusca;
  });

  // Métricas
  const totalAtivos = anunciantes.filter(a => a.status === 'ativo').length;
  const totalInadimplentes = anunciantes.filter(a => a.status === 'inadimplente').length;
  const totalPendentes = anunciantes.filter(a => a.status === 'pendente').length;
  const totalSaldo = anunciantes.reduce((acc, a) => acc + (a.saldoCreditos || 0), 0);
  const totalFaturado = anunciantes.reduce((acc, a) => acc + (a.totalFaturado || 0), 0);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando anunciantes...</p>
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
            <Building2 size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Anunciantes
          </h1>
          <p className="admin-subtitle">Gerencie empresas parceiras e seus créditos</p>
        </div>
        <Link href="/admin/campanhas/anunciantes/novo" className="btn-primary">
          <Plus size={18} />
          Novo Anunciante
        </Link>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card success">
          <div className="kpi-icon"><Building2 size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Anunciantes Ativos</span>
            <span className="kpi-value">{totalAtivos}</span>
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon"><AlertCircle size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Pendentes</span>
            <span className="kpi-value">{totalPendentes}</span>
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><DollarSign size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Saldo Total</span>
            <span className="kpi-value">R$ {totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-icon"><DollarSign size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Faturado Total</span>
            <span className="kpi-value">R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        marginBottom: 24,
        padding: 16,
        background: '#111827',
        borderRadius: 12,
        border: '1px solid #1F2937'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="text"
            placeholder="Buscar por nome, razão social ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              background: '#0B0F1A',
              border: '1px solid #1F2937',
              borderRadius: 8,
              color: '#F9FAFB',
              fontSize: 14
            }}
          />
        </div>
        
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusAnunciante)}
          style={{
            padding: '10px 16px',
            background: '#0B0F1A',
            border: '1px solid #1F2937',
            borderRadius: 8,
            color: '#F9FAFB',
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Anunciante</th>
              <th>Contato</th>
              <th>Status</th>
              <th>Saldo</th>
              <th>Gasto Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {anunciantesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>
                  <Building2 size={48} style={{ color: '#6B7280', marginBottom: 16 }} />
                  <p style={{ color: '#9CA3AF' }}>Nenhum anunciante encontrado</p>
                </td>
              </tr>
            ) : (
              anunciantesFiltrados.map((a) => {
                const StatusIcon = statusLabels[a.status].icon;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong>{a.nomeFantasia}</strong>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{a.razaoSocial}</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>CNPJ: {a.cnpj}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <User size={14} /> {a.contatoNome}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                          <Mail size={12} /> {a.contatoEmail}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280' }}>
                          <Phone size={12} /> {a.contatoTelefone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: `${statusLabels[a.status].color}20`,
                          color: statusLabels[a.status].color,
                          borderColor: statusLabels[a.status].color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <StatusIcon size={14} />
                        {statusLabels[a.status].label}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        color: (a.saldoCreditos || 0) > 0 ? '#10B981' : '#EF4444',
                        fontWeight: 600 
                      }}>
                        R$ {(a.saldoCreditos || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>R$ {(a.totalGasto || 0).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link 
                          href={`/admin/campanhas/anunciantes/${a.id}`}
                          className="btn-icon"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </Link>
                        
                        {a.status === 'ativo' ? (
                          <button
                            onClick={() => alterarStatus(a.id!, 'bloqueado')}
                            className="btn-icon danger"
                            title="Bloquear"
                          >
                            <Ban size={16} />
                          </button>
                        ) : a.status === 'bloqueado' ? (
                          <button
                            onClick={() => alterarStatus(a.id!, 'ativo')}
                            className="btn-icon success"
                            title="Ativar"
                          >
                            <CheckCircle size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
