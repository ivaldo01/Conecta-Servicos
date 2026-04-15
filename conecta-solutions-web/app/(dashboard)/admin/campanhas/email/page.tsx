'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Mail, 
  Plus, 
  Search,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  Users,
  MessageSquare,
  MousePointer
} from 'lucide-react';
import '@/styles/admin-campanhas.css';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';

interface CampanhaEmail {
  id?: string;
  titulo: string;
  assunto: string;
  conteudo: string;
  status: 'rascunho' | 'agendada' | 'enviando' | 'concluida' | 'cancelada';
  segmento: string[];
  agendamento?: Timestamp;
  enviadoEm?: Timestamp;
  metricas: {
    total: number;
    enviados: number;
    abertos: number;
    cliques: number;
    falhas: number;
    taxaAbertura: number;
    taxaClique: number;
  };
  createdAt: Timestamp;
}

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: 'Rascunho', color: '#6B7280', icon: Clock },
  agendada: { label: 'Agendada', color: '#3B82F6', icon: Clock },
  enviando: { label: 'Enviando...', color: '#F59E0B', icon: Send },
  concluida: { label: 'Concluída', color: '#10B981', icon: CheckCircle },
  cancelada: { label: 'Cancelada', color: '#EF4444', icon: XCircle }
};

const segmentos = [
  { value: 'todos', label: 'Todos os usuários' },
  { value: 'clientes', label: 'Apenas Clientes' },
  { value: 'profissionais', label: 'Apenas Profissionais' },
  { value: 'ativos', label: 'Usuários Ativos' },
  { value: 'inativos', label: 'Usuários Inativos' },
  { value: 'vip', label: 'Assinantes VIP' },
  { value: 'novos', label: 'Novos Cadastros' }
];

export default function CampanhasEmailPage() {
  const [campanhas, setCampanhas] = useState<CampanhaEmail[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const campanhasRef = collection(db, 'campanhasEmail');
    const q = query(campanhasRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CampanhaEmail[];
      setCampanhas(data);
      setLoading(false);
    }, (error) => {
      console.error('[Campanhas Email] Erro:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const campanhasFiltradas = campanhas.filter(c => {
    const matchStatus = !filtroStatus || c.status === filtroStatus;
    const matchBusca = !busca || 
      c.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      c.assunto?.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  // Métricas
  const totalCampanhas = campanhas.length;
  const totalEnviados = campanhas.reduce((acc, c) => acc + (c.metricas?.enviados || 0), 0);
  const totalAbertos = campanhas.reduce((acc, c) => acc + (c.metricas?.abertos || 0), 0);
  const taxaMediaAbertura = campanhas.length > 0 
    ? campanhas.reduce((acc, c) => acc + (c.metricas?.taxaAbertura || 0), 0) / campanhas.length 
    : 0;

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Carregando campanhas...</p>
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
            <Mail size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
            Campanhas de Email
          </h1>
          <p className="admin-subtitle">Crie e gerencie campanhas de email marketing</p>
        </div>
        <Link href="/admin/campanhas/email/nova" className="btn-primary">
          <Plus size={18} />
          Nova Campanha
        </Link>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card info">
          <div className="kpi-icon"><Send size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Campanhas</span>
            <span className="kpi-value">{totalCampanhas}</span>
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon"><Mail size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Emails Enviados</span>
            <span className="kpi-value">{totalEnviados.toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon"><Eye size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Total Abertos</span>
            <span className="kpi-value">{totalAbertos.toLocaleString()}</span>
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon"><BarChart3 size={24} /></div>
          <div className="kpi-info">
            <span className="kpi-label">Taxa Média Abertura</span>
            <span className="kpi-value">{taxaMediaAbertura.toFixed(1)}%</span>
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
            placeholder="Buscar campanha..."
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
          onChange={(e) => setFiltroStatus(e.target.value)}
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
              <th>Campanha</th>
              <th>Segmento</th>
              <th>Status</th>
              <th>Destinatários</th>
              <th>Abertos</th>
              <th>Cliques</th>
              <th>Taxa</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {campanhasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                  <Mail size={48} style={{ color: '#6B7280', marginBottom: 16 }} />
                  <p style={{ color: '#9CA3AF' }}>Nenhuma campanha encontrada</p>
                </td>
              </tr>
            ) : (
              campanhasFiltradas.map((c) => {
                const StatusIcon = statusLabels[c.status]?.icon || Clock;
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <strong>{c.titulo}</strong>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.assunto}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12 }}>
                        {c.segmento?.map(s => segmentos.find(seg => seg.value === s)?.label).join(', ') || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="badge" 
                        style={{ 
                          backgroundColor: `${statusLabels[c.status]?.color || '#6B7280'}20`,
                          color: statusLabels[c.status]?.color || '#6B7280',
                          borderColor: statusLabels[c.status]?.color || '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <StatusIcon size={14} />
                        {statusLabels[c.status]?.label || c.status}
                      </span>
                    </td>
                    <td>{(c.metricas?.total || 0).toLocaleString()}</td>
                    <td>{(c.metricas?.abertos || 0).toLocaleString()}</td>
                    <td>{(c.metricas?.cliques || 0).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                          {(c.metricas?.taxaAbertura || 0).toFixed(1)}% abertura
                        </span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>
                          {(c.metricas?.taxaClique || 0).toFixed(1)}% cliques
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Link 
                          href={`/admin/campanhas/email/${c.id}`}
                          className="btn-icon"
                          title="Ver detalhes"
                        >
                          <Eye size={16} />
                        </Link>
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
