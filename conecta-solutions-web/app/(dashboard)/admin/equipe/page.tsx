'use client';

import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Users,
  Plus,
  Shield,
  ShieldCheck,
  UserX,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Crown,
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import '@/styles/admin-equipe.css';

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  cargo: 'admin' | 'supervisor' | 'suporte' | 'financeiro' | 'marketing';
  permissoes: string[];
  status: 'ativo' | 'inativo' | 'ferias';
  dataEntrada: any;
  ultimoAcesso?: any;
  foto?: string;
}

export default function EquipeAdminPage() {
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState('');
  const [novoMembro, setNovoMembro] = useState({
    nome: '',
    email: '',
    telefone: '',
    cargo: 'suporte' as const,
    permissoes: ['suporte']
  });

  useEffect(() => {
    const q = query(collection(db, 'equipeAdmin'), where('status', '!=', 'removido'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MembroEquipe[];
      setMembros(data);
    });
    return () => unsubscribe();
  }, []);

  const adicionarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'equipeAdmin'), {
      ...novoMembro,
      status: 'ativo',
      dataEntrada: serverTimestamp()
    });
    setShowModal(false);
    setNovoMembro({ nome: '', email: '', telefone: '', cargo: 'suporte', permissoes: ['suporte'] });
  };

  const alterarStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'equipeAdmin', id), { status });
  };

  const membrosFiltrados = membros.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.email.toLowerCase().includes(busca.toLowerCase()) ||
    m.cargo.toLowerCase().includes(busca.toLowerCase())
  );

  const getCargoIcon = (cargo: string) => {
    switch (cargo) {
      case 'admin': return <Crown size={16} className="cargo-admin" />;
      case 'supervisor': return <ShieldCheck size={16} className="cargo-supervisor" />;
      default: return <Shield size={16} className="cargo-padrao" />;
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Equipe Administrativa</h1>
          <p className="admin-subtitle">Gestão da equipe do Quartel General</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Novo Membro
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <Users size={24} />
          <div className="kpi-info">
            <span className="kpi-label">Total Equipe</span>
            <span className="kpi-value">{membros.length}</span>
          </div>
        </div>
        <div className="kpi-card success">
          <CheckCircle size={24} />
          <div className="kpi-info">
            <span className="kpi-label">Ativos</span>
            <span className="kpi-value">{membros.filter(m => m.status === 'ativo').length}</span>
          </div>
        </div>
        <div className="kpi-card warning">
          <Shield size={24} />
          <div className="kpi-info">
            <span className="kpi-label">Administradores</span>
            <span className="kpi-value">{membros.filter(m => m.cargo === 'admin').length}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, email ou cargo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Membros */}
      <div className="equipe-grid">
        {membrosFiltrados.length === 0 ? (
          <div className="empty-state">
            <Users size={64} />
            <h3>Nenhum membro na equipe</h3>
            <p>Adicione o primeiro membro administrativo</p>
          </div>
        ) : (
          membrosFiltrados.map((membro) => (
            <div key={membro.id} className={`membro-card ${membro.status}`}>
              <div className="membro-header">
                <div className="membro-avatar">
                  {membro.foto ? (
                    <img src={membro.foto} alt={membro.nome} />
                  ) : (
                    <div className="avatar-placeholder">
                      {membro.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`status-indicator ${membro.status}`} />
                </div>
                <div className="membro-info">
                  <h3>{membro.nome}</h3>
                  <div className="membro-cargo">
                    {getCargoIcon(membro.cargo)}
                    <span>{membro.cargo}</span>
                  </div>
                </div>
              </div>
              <div className="membro-contato">
                <div className="contato-item">
                  <Mail size={14} />
                  <span>{membro.email}</span>
                </div>
                {membro.telefone && (
                  <div className="contato-item">
                    <Phone size={14} />
                    <span>{membro.telefone}</span>
                  </div>
                )}
              </div>
              <div className="membro-permissoes">
                {membro.permissoes.map((p, i) => (
                  <span key={i} className="permissao-tag">{p}</span>
                ))}
              </div>
              <div className="membro-acoes">
                {membro.status === 'ativo' ? (
                  <button
                    className="btn-acao inativar"
                    onClick={() => alterarStatus(membro.id, 'inativo')}
                  >
                    <UserX size={16} />
                    Inativar
                  </button>
                ) : (
                  <button
                    className="btn-acao ativar"
                    onClick={() => alterarStatus(membro.id, 'ativo')}
                  >
                    <CheckCircle size={16} />
                    Ativar
                  </button>
                )}
                <button
                  className="btn-acao excluir"
                  onClick={() => deleteDoc(doc(db, 'equipeAdmin', membro.id))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Novo Membro */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Novo Membro da Equipe</h2>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={adicionarMembro} className="modal-form">
              <div className="form-group">
                <label>Nome Completo</label>
                <input
                  type="text"
                  value={novoMembro.nome}
                  onChange={(e) => setNovoMembro({ ...novoMembro, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  value={novoMembro.email}
                  onChange={(e) => setNovoMembro({ ...novoMembro, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="tel"
                  value={novoMembro.telefone}
                  onChange={(e) => setNovoMembro({ ...novoMembro, telefone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <select
                  value={novoMembro.cargo}
                  onChange={(e) => setNovoMembro({ ...novoMembro, cargo: e.target.value as any })}
                >
                  <option value="admin">Administrador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="suporte">Suporte</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="marketing">Marketing</option>
                </select>
              </div>
              <div className="modal-acoes">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
