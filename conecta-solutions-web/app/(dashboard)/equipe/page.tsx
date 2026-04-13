'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import {
  Users, Plus, X, Edit2, Trash2,
  Phone, Mail, Briefcase, CheckCircle, XCircle,
  Shield, Camera, Copy, Lock, Scissors, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/equipe.css';

// ============================================================
// TIPOS
// ============================================================
type NivelAcesso = 'leitura' | 'operacao' | 'financeiro' | 'admin';

interface ServicoDisponivel {
  id: string;
  nome: string;
}

interface Colaborador {
  id: string;
  uid: string;              
  nome?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  servicos?: string[];
  nivelAcesso?: NivelAcesso;
  ativo?: boolean;
  fotoUrl?: string;
  profissionalId?: string;
  criadoEm?: any;
}

interface FormColaborador {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  servicos: string[];
  nivelAcesso: NivelAcesso;
  senhaTemporaria: string; // Novo Campo
}

const FORM_VAZIO: FormColaborador = {
  nome: '', email: '', telefone: '', cargo: '', servicos: [], nivelAcesso: 'operacao', senhaTemporaria: ''
};

// ============================================================
// HELPERS
// ============================================================
function gerarUID(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CS-${rand(4)}-${rand(6)}`;
}

/** Gera senha temporária segura */
function gerarSenhaAleatoria(): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let retVal = "";
  for (let i = 0, n = charset.length; i < 8; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

const NIVEIS: Record<NivelAcesso, { label: string; cor: string; descricao: string }> = {
  leitura:    { label: 'Leitura',    cor: '#64748B', descricao: 'Visualiza agendamentos e clientes' },
  operacao:   { label: 'Operação',   cor: '#3B82F6', descricao: 'Cria e edita agendamentos' },
  financeiro: { label: 'Financeiro', cor: '#F59E0B', descricao: 'Acessa relatórios e financeiro' },
  admin:      { label: 'Admin',      cor: '#8B5CF6', descricao: 'Acesso completo à gestão' },
};

// ============================================================
// PÁGINA DE EQUIPE
// ============================================================
export default function EquipePage() {
  const { dadosUsuario } = useAuth();
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoDisponivel[]>([]);
  const [loading, setLoading]             = useState(true);
  const [modalAberto, setModalAberto]     = useState(false);
  const [editando, setEditando]           = useState<Colaborador | null>(null);
  const [form, setForm]                   = useState<FormColaborador>(FORM_VAZIO);
  const [salvando, setSalvando]           = useState(false);
  const [fotoFile, setFotoFile]           = useState<File | null>(null);
  const [fotoPreview, setFotoPreview]     = useState<string>('');

  // Carrega colaboradores e serviços
  const carregarDados = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      // 1. Carrega Colaboradores
      const qColabs = query(
        collection(db, 'colaboradores'),
        where('profissionalId', '==', dadosUsuario.uid)
      );
      const snapColabs = await getDocs(qColabs);
      setColaboradores(snapColabs.docs.map(d => ({ id: d.id, ...d.data() } as Colaborador)));

      // 2. Carrega Serviços do Gestor
      const snapServs = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'servicos'));
      const listaServs = snapServs.docs
        .map(d => ({ id: d.id, nome: d.data().nome } as ServicoDisponivel))
        .sort((a,b) => a.nome.localeCompare(b.nome));
      setServicosDisponiveis(listaServs);

    } catch (err) {
      console.error('[Equipe]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const abrirModal = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditando(colaborador);
      setForm({
        nome:            colaborador.nome            || '',
        email:           colaborador.email           || '',
        telefone:        colaborador.telefone        || '',
        cargo:           colaborador.cargo           || '',
        servicos:        colaborador.servicos        || [],
        nivelAcesso:     colaborador.nivelAcesso     || 'operacao',
        senhaTemporaria: (colaborador as any).senhaTemporaria || '',
      });
      setFotoPreview(colaborador.fotoUrl || '');
    } else {
      setEditando(null);
      setForm(FORM_VAZIO);
      setFotoPreview('');
    }
    setFotoFile(null);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
    setFotoFile(null);
    setFotoPreview('');
  };

  const setField = (campo: keyof FormColaborador) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }));

  // Alterna a seleção de um serviço
  const toggleServico = (nome: string) => {
    setForm(prev => {
      const existe = prev.servicos.includes(nome);
      if (existe) {
        return { ...prev, servicos: prev.servicos.filter(s => s !== nome) };
      }
      return { ...prev, servicos: [...prev.servicos, nome] };
    });
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Informe o nome do colaborador.'); return; }
    if (!dadosUsuario?.uid) {
      toast.error('Sessão expirada. Por favor, faça login novamente.');
      return;
    }

    setSalvando(true);
    console.log('[Equipe] Iniciando processo de salvamento...');

    try {
      let fotoUrl = editando?.fotoUrl || '';

      if (fotoFile) {
        console.log('[Equipe] Fazendo upload da foto...');
        const ext = fotoFile.name.split('.').pop();
        const storageRef = ref(storage, `colaboradores/${dadosUsuario.uid}/${Date.now()}.${ext}`);
        await uploadBytes(storageRef, fotoFile);
        fotoUrl = await getDownloadURL(storageRef);
      }

      const dados = {
        nome:           form.nome.trim(),
        email:          form.email.trim().toLowerCase(), // E-mail sempre minúsculo
        telefone:       form.telefone.trim(),
        cargo:          form.cargo.trim(),
        servicos:       form.servicos,
        nivelAcesso:    form.nivelAcesso,
        fotoUrl,
        profissionalId: dadosUsuario.uid,
        senhaTemporaria: form.senhaTemporaria.trim() || '123456',
      };

      console.log('[Equipe] Gravando no Firestore...');
      if (editando) {
        await updateDoc(doc(db, 'colaboradores', editando.id), dados);
        toast.success('Colaborador atualizado!');
      } else {
        const uidGenerado = gerarUID();
        await addDoc(collection(db, 'colaboradores'), {
          ...dados,
          uid: uidGenerado,
          ativo: true,
          precisaTrocarSenha: true, // Força a troca no primeiro acesso
          criadoEm: serverTimestamp(),
        });
        toast.success(`Colaborador adicionado! ID: ${uidGenerado}`);
      }
      
      fecharModal();
      await carregarDados();
    } catch (err: any) {
      console.error('[Equipe] Erro detalhado ao salvar:', err);
      if (err.code === 'permission-denied') {
        toast.error('Erro de permissão: Sua sessão pode ter expirado.');
      } else {
        toast.error('Não foi possível salvar os dados.');
      }
    } finally {
      setSalvando(false);
      console.log('[Equipe] Processo de salvamento finalizado.');
    }
  };

  const alternarAtivo = async (c: Colaborador) => {
    try {
      await updateDoc(doc(db, 'colaboradores', c.id), { ativo: !c.ativo });
      toast.success(`${c.nome} ${c.ativo ? 'desativado' : 'ativado'}.`);
      carregarDados();
    } catch { toast.error('Erro ao alterar status.'); }
  };

  const excluir = async (c: Colaborador) => {
    if (!confirm(`Remover ${c.nome} da equipe?`)) return;
    try {
      await deleteDoc(doc(db, 'colaboradores', c.id));
      toast.success('Colaborador removido.');
      carregarDados();
    } catch { toast.error('Erro ao remover.'); }
  };

  const ativos   = colaboradores.filter(c => c.ativo !== false);
  const inativos = colaboradores.filter(c => c.ativo === false);

  return (
    <div className="eq-page">
      <Topbar
        title="Gestão de Equipe"
        subtitle="Cadastre colaboradores e defina seus níveis de acesso"
        action={
          <button className="btn-primary" onClick={() => abrirModal()}>
            <Plus size={15} /> Novo Colaborador
          </button>
        }
      />

      <div className="eq-body">
        <div className="eq-resumo">
          <div className="eq-resumo-card eq-resumo-card--azul"><Users size={20} /><div><p className="eq-resumo-num">{colaboradores.length}</p><p className="eq-resumo-label">Total</p></div></div>
          <div className="eq-resumo-card eq-resumo-card--verde"><CheckCircle size={20} /><div><p className="eq-resumo-num">{ativos.length}</p><p className="eq-resumo-label">Ativos</p></div></div>
          <div className="eq-resumo-card eq-resumo-card--cinza"><XCircle size={20} /><div><p className="eq-resumo-num">{inativos.length}</p><p className="eq-resumo-label">Inativos</p></div></div>
        </div>

        <div className="eq-legend">
          {(Object.entries(NIVEIS) as [NivelAcesso, any][]).map(([key, val]) => (
            <div key={key} className="eq-legend-item">
              <span className="eq-legend-dot" style={{ background: val.cor }} />
              <span className="eq-legend-label"><strong>{val.label}</strong> — {val.descricao}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="eq-grid">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}</div>
        ) : colaboradores.length === 0 ? (
          <div className="eq-vazio"><Users size={44} /><p>Nenhum colaborador cadastrado ainda.</p>
            <button className="btn-primary" onClick={() => abrirModal()}><Plus size={15} /> Adicionar primeiro colaborador</button>
          </div>
        ) : (
          <>
            {ativos.length > 0 && (
              <div className="eq-secao">
                <h2 className="eq-secao-titulo"><CheckCircle size={15} className="eq-icon--verde" /> Ativos</h2>
                <div className="eq-grid">{ativos.map(c => <CardColaborador key={c.id} c={c} iniciais={c.nome?.[0] || 'C'} onEditar={() => abrirModal(c)} onExcluir={() => excluir(c)} onAlternar={() => alternarAtivo(c)} />)}</div>
              </div>
            )}
            {inativos.length > 0 && (
              <div className="eq-secao">
                <h2 className="eq-secao-titulo"><XCircle size={15} /> Inativos</h2>
                <div className="eq-grid">{inativos.map(c => <CardColaborador key={c.id} c={c} iniciais={c.nome?.[0] || 'C'} onEditar={() => abrirModal(c)} onExcluir={() => excluir(c)} onAlternar={() => alternarAtivo(c)} />)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {modalAberto && (
        <div className="eq-modal-overlay" onClick={fecharModal}>
          <div className="eq-modal" onClick={e => e.stopPropagation()}>
            <div className="eq-modal-header">
              <h3>{editando ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
              <button className="btn-icon" onClick={fecharModal}><X size={18} /></button>
            </div>

            <div className="eq-modal-body">
              <div className="eq-foto-upload">
                <div className="eq-foto-preview">
                  {fotoPreview ? <img src={fotoPreview} alt="Preview" /> : <div className="eq-foto-placeholder">{form.nome?.[0]?.toUpperCase() || '?'}</div>}
                  <label className="eq-foto-btn" title="Trocar foto"><Camera size={14} /><input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} /></label>
                </div>
                <p className="eq-foto-hint">Foto opcional do colaborador</p>
              </div>

              <div className="campo-grupo"><label className="campo-label">Nome *</label><input className="campo-input" value={form.nome} onChange={setField('nome')} placeholder="Nome completo" /></div>

              <div className="campo-row">
                <div className="campo-grupo"><label className="campo-label"><Mail size={12} /> E-mail</label><input className="campo-input" type="email" value={form.email} onChange={setField('email')} placeholder="email@exemplo.com" /></div>
                <div className="campo-grupo"><label className="campo-label"><Phone size={12} /> Telefone</label><input className="campo-input" value={form.telefone} onChange={setField('telefone')} placeholder="(00) 00000-0000" /></div>
              </div>

              <div className="campo-row">
                <div className="campo-grupo"><label className="campo-label"><Briefcase size={12} /> Cargo</label><input className="campo-input" value={form.cargo} onChange={setField('cargo')} placeholder="Cargo do colaborador" /></div>
                <div className="campo-grupo">
                  <label className="campo-label"><Lock size={12} /> Senha Temporária</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      className="campo-input" 
                      value={form.senhaTemporaria} 
                      onChange={setField('senhaTemporaria')} 
                      placeholder="Mínimo 6 caracteres" 
                    />
                    <button 
                      type="button"
                      className="btn-secondary" 
                      style={{ padding: '0 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                      onClick={() => setForm(f => ({ ...f, senhaTemporaria: gerarSenhaAleatoria() }))}
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              <div className="campo-row">
                <div className="campo-grupo"><label className="campo-label"><Lock size={12} /> Nível de Acesso</label>
                  <select className="campo-input" value={form.nivelAcesso} onChange={setField('nivelAcesso')}>
                    {(Object.entries(NIVEIS) as [NivelAcesso, any][]).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                  </select>
                </div>
              </div>

              {/* SELETOR DE SERVIÇOS HABILITADOS */}
              <div className="campo-grupo">
                <label className="campo-label"><Scissors size={12} /> Serviços Habilitados</label>
                {servicosDisponiveis.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '12px' }}>Nenhum serviço cadastrado no seu sistema.</p>
                ) : (
                  <div className="eq-servicos-selector">
                    {servicosDisponiveis.map(s => {
                      const selecionado = form.servicos.includes(s.nome);
                      return (
                        <div key={s.id} className={`eq-servico-chip ${selecionado ? 'eq-servico-chip--active' : ''}`} onClick={() => toggleServico(s.nome)}>
                          {selecionado ? <Check size={12} /> : <Plus size={12} />}
                          <span>{s.nome}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="eq-modal-footer">
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Colaborador'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardColaborador({ c, iniciais, onEditar, onExcluir, onAlternar }: { c: Colaborador; iniciais: string; onEditar: () => void; onExcluir: () => void; onAlternar: () => void; }) {
  const nivel = c.nivelAcesso ? NIVEIS[c.nivelAcesso] : NIVEIS.operacao;
  return (
    <div className={`eq-card ${c.ativo === false ? 'eq-card--inativo' : ''}`}>
      <div className="eq-card-topo">
        {c.fotoUrl ? <img src={c.fotoUrl} alt={c.nome} className="eq-avatar-foto" /> : <div className="eq-avatar">{iniciais}</div>}
        <div className="eq-card-info">
          <h3 className="eq-card-nome">{c.nome}</h3>
          {c.cargo && <p className="eq-card-cargo"><Briefcase size={11} /> {c.cargo}</p>}
        </div>
        <span className={`eq-status ${c.ativo !== false ? 'eq-status--ativo' : 'eq-status--inativo'}`}>{c.ativo !== false ? 'Ativo' : 'Inativo'}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div className="eq-nivel-badge" style={{ borderColor: nivel.cor, color: nivel.cor }}><Shield size={11} /> {nivel.label}</div>
        {c.uid && <div className="eq-uid-badge" onClick={() => { navigator.clipboard.writeText(c.uid); toast.success('ID Copiado!'); }}><Copy size={11} /> {c.uid}</div>}
      </div>
      {c.servicos && c.servicos.length > 0 && (
        <div className="eq-servicos">{c.servicos.map(s => <span key={s} className="eq-servico-tag">{s}</span>)}</div>
      )}
      <div className="eq-acoes">
        <button className="btn-icon btn-icon--ghost" onClick={onEditar}><Edit2 size={14} /></button>
        <button className={`btn-icon ${c.ativo !== false ? 'btn-icon--warn' : 'btn-icon--ghost'}`} onClick={onAlternar}>{c.ativo !== false ? <XCircle size={14} /> : <CheckCircle size={14} />}</button>
        <button className="btn-icon btn-icon--delete" onClick={onExcluir}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
