'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  writeBatch, getDoc, Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import {
  Users, Plus, X, Edit2, Trash2,
  Phone, Mail, Briefcase, CheckCircle, XCircle,
  Shield, Camera, Copy, Lock, Scissors, Check, Calendar, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/equipe.css';

// Configuração Cloudinary (mesma do mobile e outras telas)
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';

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
  servicosHabilitados?: string[]; // Mobile usa IDs
  nivelAcesso?: NivelAcesso;
  ativo?: boolean;
  fotoUrl?: string;
  bannerUrl?: string; // Banner/capa do colaborador
  profissionalId?: string;
  clinicaId?: string; // Mobile usa clinicaId
  criadoEm?: Timestamp;
  conectaId?: string; // CID do mobile
  fonte?: 'web' | 'mobile';
}

interface FormColaborador {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  servicos: string[];
  nivelAcesso: NivelAcesso;
  senhaTemporaria: string;
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

/** Gera ConectaID único no formato CSXXXXXX (mesmo do mobile) */
async function gerarConectaIdUnico(): Promise<string> {
  let unico = false;
  let cid = '';
  
  while (!unico) {
    const randomNumbers = Math.floor(100000 + Math.random() * 900000);
    cid = `CS${randomNumbers}`;
    
    // Verifica se já existe
    const q = query(collection(db, 'usuarios'), where('conectaId', '==', cid));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      unico = true;
    }
  }
  
  return cid;
}

const NIVEIS: Record<NivelAcesso, { label: string; cor: string; descricao: string }> = {
  leitura:    { label: 'Leitura',    cor: '#64748B', descricao: 'Visualiza agendamentos e clientes' },
  operacao:   { label: 'Operação',   cor: '#3B82F6', descricao: 'Cria e edita agendamentos' },
  financeiro: { label: 'Financeiro', cor: '#F59E0B', descricao: 'Acessa relatórios e financeiro' },
  admin:      { label: 'Admin',      cor: '#8B5CF6', descricao: 'Acesso completo à gestão' },
};

// ============================================================
// CONFIGURAÇÕES DE PLANO VIP
// ============================================================
const PLANOS_PROFISSIONAL: Record<string, { name: string; maxEmployees: number; verifiedBadge: boolean }> = {
  'pro_iniciante': { name: 'Iniciante', maxEmployees: 0, verifiedBadge: false },
  'pro_profissional': { name: 'Profissional', maxEmployees: 3, verifiedBadge: true },
  'pro_empresa': { name: 'Empresa', maxEmployees: 10, verifiedBadge: true },
  'pro_franquia': { name: 'Franquia', maxEmployees: Infinity, verifiedBadge: true },
};

function getPlanoAtual(planoId?: string) {
  return PLANOS_PROFISSIONAL[planoId || 'pro_iniciante'] || PLANOS_PROFISSIONAL['pro_iniciante'];
}

function podeCadastrarFuncionario(planoId: string, totalAtual: number): boolean {
  const plano = getPlanoAtual(planoId);
  return totalAtual < plano.maxEmployees;
}

function getInfoLimite(planoId: string, totalAtual: number): { texto: string; atingiuLimite: boolean } {
  const plano = getPlanoAtual(planoId);
  if (plano.maxEmployees === Infinity) {
    return { texto: `${totalAtual} funcionários (ilimitado)`, atingiuLimite: false };
  }
  return {
    texto: `${totalAtual} de ${plano.maxEmployees} funcionários`,
    atingiuLimite: totalAtual >= plano.maxEmployees
  };
}

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
  const [bannerFile, setBannerFile]       = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [planoInfo, setPlanoInfo]         = useState<{ id: string; name: string; max: number; verifiedBadge: boolean } | null>(null);

  // Carrega colaboradores e serviços
  const carregarDados = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      // 1. Carrega Plano do usuário
      const planoId = dadosUsuario?.planoAtivo || 'pro_iniciante';
      const plano = getPlanoAtual(planoId);
      setPlanoInfo({ id: planoId, name: plano.name, max: plano.maxEmployees, verifiedBadge: plano.verifiedBadge });

      // 2. Carrega Colaboradores de múltiplas fontes
      let allColabsRaw: Colaborador[] = [];
      
      // 2a. Coleção 'colaboradores' (Web)
      try {
        const qColabs = query(
          collection(db, 'colaboradores'),
          where('profissionalId', '==', dadosUsuario.uid)
        );
        const snapColabs = await getDocs(qColabs);
        const colabsWeb = snapColabs.docs.map(d => ({ 
          id: d.id, 
          fonte: 'web' as const,
          ...d.data() 
        } as Colaborador));
        allColabsRaw = [...allColabsRaw, ...colabsWeb];
        console.log(`[Equipe] Colaboradores (web): ${colabsWeb.length}`);
      } catch (e) {
        console.warn('[Equipe] Coleção colaboradores não encontrada');
      }

      // 2b. Subcoleção 'usuarios/{uid}/colaboradores' (Mobile)
      try {
        const snapMobile = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'colaboradores'));
        const colabsMobile = snapMobile.docs.map(d => ({ 
          id: d.id, 
          fonte: 'mobile' as const,
          ...d.data() 
        } as Colaborador));
        allColabsRaw = [...allColabsRaw, ...colabsMobile];
        console.log(`[Equipe] Colaboradores (mobile): ${colabsMobile.length}`);
      } catch (e) {
        console.warn('[Equipe] Subcoleção colaboradores não encontrada');
      }
      
      // Normalizar colaboradores (merge servicos e servicosHabilitados)
      const colabsNormalizados = allColabsRaw.map(c => {
        // Converter servicosHabilitados (IDs mobile) para nomes se possível
        let servicosNomes = c.servicos || [];
        if (c.servicosHabilitados && c.servicosHabilitados.length > 0) {
          // Vamos mapear IDs para nomes depois de carregar serviços
        }
        return {
          ...c,
          servicos: servicosNomes,
          ativo: c.ativo !== false, // Default true
        };
      });
      
      console.log(`[Equipe] Total colaboradores combinados: ${colabsNormalizados.length}`);
      setColaboradores(colabsNormalizados);

      // 3. Carrega Serviços do Gestor
      const snapServs = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'servicos'));
      const listaServs = snapServs.docs
        .map(d => ({ id: d.id, nome: d.data().nome } as ServicoDisponivel))
        .sort((a,b) => a.nome.localeCompare(b.nome));
      setServicosDisponiveis(listaServs);
      
      // 4. Normalizar servicosHabilitados para nomes se houver serviços carregados
      if (listaServs.length > 0) {
        setColaboradores(prev => prev.map(c => {
          if (c.servicosHabilitados && c.servicosHabilitados.length > 0) {
            const nomes = c.servicosHabilitados
              .map(id => listaServs.find(s => s.id === id)?.nome)
              .filter(Boolean) as string[];
            return { ...c, servicos: [...new Set([...(c.servicos || []), ...nomes])] };
          }
          return c;
        }));
      }

    } catch (err) {
      console.error('[Equipe]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const abrirModal = (colaborador?: Colaborador) => {
    if (colaborador) {
      setForm({
        nome: colaborador.nome || '',
        email: colaborador.email || '',
        telefone: colaborador.telefone || '',
        cargo: colaborador.cargo || '',
        servicos: colaborador.servicos || [],
        nivelAcesso: colaborador.nivelAcesso || 'operacao',
        senhaTemporaria: ''
      });
      setEditando(colaborador);
      setFotoPreview(colaborador.fotoUrl || '');
      setBannerPreview(colaborador.bannerUrl || '');
    } else {
      setForm(FORM_VAZIO);
      setEditando(null);
      setFotoPreview('');
      setFotoFile(null);
      setBannerPreview('');
      setBannerFile(null);
    }
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
    setFotoPreview('');
    setFotoFile(null);
    setBannerPreview('');
    setBannerFile(null);
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

  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
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
      let bannerUrl = editando?.bannerUrl || '';

      // Upload foto para Cloudinary
      if (fotoFile) {
        console.log('[Equipe] Fazendo upload da foto para Cloudinary...', fotoFile.name);
        try {
          const formData = new FormData();
          formData.append('file', fotoFile);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', 'colaboradores/fotos');

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
          );
          const data = await response.json();

          if (data.secure_url) {
            fotoUrl = data.secure_url;
            console.log('[Equipe] Foto URL:', fotoUrl);
          } else {
            throw new Error(data.error?.message || 'Upload failed');
          }
        } catch (fotoErr: any) {
          console.error('[Equipe] Erro no upload da foto:', fotoErr);
          toast.error('Erro ao salvar foto: ' + fotoErr.message);
        }
      }

      // Upload banner para Cloudinary
      if (bannerFile) {
        console.log('[Equipe] Fazendo upload do banner para Cloudinary...', bannerFile.name);
        try {
          const formData = new FormData();
          formData.append('file', bannerFile);
          formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
          formData.append('folder', 'colaboradores/banners');

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            { method: 'POST', body: formData }
          );
          const data = await response.json();

          if (data.secure_url) {
            bannerUrl = data.secure_url;
            console.log('[Equipe] Banner URL:', bannerUrl);
          } else {
            throw new Error(data.error?.message || 'Upload failed');
          }
        } catch (bannerErr: any) {
          console.error('[Equipe] Erro no upload do banner:', bannerErr);
          toast.error('Erro ao salvar banner: ' + bannerErr.message);
        }
      }

      const dados = {
        nome:           form.nome.trim(),
        email:          form.email.trim().toLowerCase(),
        telefone:       form.telefone.trim(),
        cargo:          form.cargo.trim(),
        servicos:       form.servicos,
        nivelAcesso:    form.nivelAcesso,
        fotoUrl,
        bannerUrl,
        profissionalId: dadosUsuario.uid,
        senhaTemporaria: form.senhaTemporaria.trim() || '123456',
      };

      console.log('[Equipe] Dados a serem salvos:', { ...dados, fotoUrl, bannerUrl });
      
      if (editando) {
        // Atualiza apenas na coleção colaboradores (já existe)
        await updateDoc(doc(db, 'colaboradores', editando.id), dados);
        toast.success('Colaborador atualizado!');
      } else {
        // NOVO: Cria em múltiplos lugares igual o mobile faz
        const uidGenerado = gerarUID();
        const cid = await gerarConectaIdUnico();
        const colaboradorId = uidGenerado; // ID do colaborador (mesmo UID do doc)
        
        const batch = writeBatch(db);
        const now = serverTimestamp();
        
        // 1. Coleção colaboradores (WEB) - precisa de profissionalId para query no mobile
        const colabRef = doc(collection(db, 'colaboradores'));
        batch.set(colabRef, {
          ...dados,
          uid: uidGenerado,
          profissionalId: dadosUsuario.uid, // ID do gestor (para mobile buscar)
          conectaId: cid,
          ativo: true,
          precisaTrocarSenha: true,
          criadoEm: now,
        });
        
        // 2. Perfil principal do colaborador (MOBILE usa aqui)
        const usuarioRef = doc(db, 'usuarios', colaboradorId);
        batch.set(usuarioRef, {
          uid: colaboradorId,
          nome: form.nome.trim(),
          nomeCompleto: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          tipo: 'profissional',
          perfil: 'colaborador',
          clinicaId: dadosUsuario.uid, // ID do gestor
          conectaId: cid,
          fotoUrl: fotoUrl || null,
          bannerUrl: bannerUrl || null,
          fotoPerfil: fotoUrl || null,     // Compatibilidade AgendamentoFinal.js
          bannerPerfil: bannerUrl || null, // Compatibilidade AgendamentoFinal.js
          telefone: form.telefone.trim() || null,
          cargo: form.cargo.trim() || null,
          servicosHabilitados: form.servicos, // Mobile usa IDs de serviço
          nivelAcesso: form.nivelAcesso,
          ativo: true,
          createdAt: now,
        });
        
        // 3. Subcoleção na equipe do gestor (MOBILE usa aqui)
        const subcolabRef = doc(db, 'usuarios', dadosUsuario.uid, 'colaboradores', colaboradorId);
        batch.set(subcolabRef, {
          id: colaboradorId,
          nome: form.nome.trim(),
          email: form.email.trim().toLowerCase(),
          conectaId: cid,
          fotoUrl: fotoUrl || null,
          bannerUrl: bannerUrl || null,
          fotoPerfil: fotoUrl || null,     // Compatibilidade AgendamentoFinal.js
          bannerPerfil: bannerUrl || null, // Compatibilidade AgendamentoFinal.js
          servicosHabilitados: form.servicos,
          nivelAcesso: form.nivelAcesso,
          ativo: true,
          dataCriacao: now,
        });
        
        // 4. Saldo inicial (MOBILE cria isso)
        const saldoRef = doc(db, 'saldos', colaboradorId);
        batch.set(saldoRef, {
          usuarioId: colaboradorId,
          saldo: 0,
          saldoBloqueado: 0,
          ultimaAtualizacao: now,
        });
        
        await batch.commit();
        console.log('[Equipe] Batch commit realizado com sucesso');
        toast.success(`Colaborador adicionado! CID: ${cid}`);
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
          planoInfo && planoInfo.max > 0 ? (
            <button 
              className="btn-primary" 
              onClick={() => {
                if (!podeCadastrarFuncionario(planoInfo.id, colaboradores.length)) {
                  toast.error(`Limite atingido: ${planoInfo.max} funcionários no plano ${planoInfo.name}`);
                  return;
                }
                abrirModal();
              }}
              disabled={!podeCadastrarFuncionario(planoInfo.id, colaboradores.length)}
            >
              <Plus size={15} /> Novo Colaborador
            </button>
          ) : null
        }
      />

      <div className="eq-body">
        {/* Card de limite do plano */}
        {planoInfo && planoInfo.max > 0 && (
          <div className={`eq-limite-banner ${getInfoLimite(planoInfo.id, colaboradores.length).atingiuLimite ? 'eq-limite-atingido' : ''}`}>
            <div className="eq-limite-info">
              <Shield size={18} />
              <span>{getInfoLimite(planoInfo.id, colaboradores.length).texto}</span>
            </div>
            <span className="eq-plano-badge">{planoInfo.name}</span>
          </div>
        )}

        {/* Bloqueio para plano Iniciante (limite=0) */}
        {planoInfo && planoInfo.max === 0 && (
          <div className="eq-premium-lock">
            <div className="eq-lock-icon"><Lock size={40} /></div>
            <h3>Funcionalidade Premium</h3>
            <p>O gerenciamento de equipe está disponível apenas nos planos VIP (Profissional, Empresa e Franquia).</p>
            <button className="btn-primary" onClick={() => window.location.href = '/vip'}>
              <Shield size={16} /> Conhecer Planos VIP
            </button>
          </div>
        )}

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
            {planoInfo && planoInfo.max > 0 && podeCadastrarFuncionario(planoInfo.id, colaboradores.length) && (
              <button className="btn-primary" onClick={() => abrirModal()}><Plus size={15} /> Adicionar primeiro colaborador</button>
            )}
            {planoInfo && planoInfo.max > 0 && !podeCadastrarFuncionario(planoInfo.id, colaboradores.length) && (
              <p className="eq-limite-msg">Limite de {planoInfo.max} funcionários atingido no plano {planoInfo.name}</p>
            )}
          </div>
        ) : (
          <>
            {ativos.length > 0 && (
              <div className="eq-secao">
                <h2 className="eq-secao-titulo"><CheckCircle size={15} className="eq-icon--verde" /> Ativos</h2>
                <div className="eq-grid">{ativos.map(c => <CardColaborador key={c.id} c={c} iniciais={c.nome?.[0] || 'C'} onEditar={() => abrirModal(c)} onExcluir={() => excluir(c)} onAlternar={() => alternarAtivo(c)} planoVerified={planoInfo?.verifiedBadge} />)}</div>
              </div>
            )}
            {inativos.length > 0 && (
              <div className="eq-secao">
                <h2 className="eq-secao-titulo"><XCircle size={15} /> Inativos</h2>
                <div className="eq-grid">{inativos.map(c => <CardColaborador key={c.id} c={c} iniciais={c.nome?.[0] || 'C'} onEditar={() => abrirModal(c)} onExcluir={() => excluir(c)} onAlternar={() => alternarAtivo(c)} planoVerified={planoInfo?.verifiedBadge} />)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {modalAberto && (
        <div className="eq-modal-overlay" onClick={fecharModal}>
          <div className="eq-modal eq-modal--premium" onClick={e => e.stopPropagation()}>
            <div className="eq-modal-header">
              <div className="eq-modal-title">
                <div className="eq-modal-icon">{editando ? <Edit2 size={22} /> : <Plus size={22} />}</div>
                <div>
                  <h3>{editando ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                  <p className="eq-modal-subtitle">{editando ? 'Atualize as informações do colaborador' : 'Cadastre um novo membro da equipe'}</p>
                </div>
              </div>
              <button className="btn-icon eq-modal-close" onClick={fecharModal}><X size={18} /></button>
            </div>

            <div className="eq-modal-body">
              {/* SEÇÃO: FOTOS E MÍDIAS */}
              <div className="eq-secao-modal eq-secao-midia">
                {/* Banner (fundo) */}
                <div className="eq-banner-container">
                  <div className="eq-banner-full">
                    {bannerPreview ? (
                      <img src={bannerPreview} alt="Banner" />
                    ) : (
                      <div className="eq-banner-placeholder-full">
                        <ImageIcon size={24} />
                        <span>Adicionar banner</span>
                      </div>
                    )}
                    <label className="eq-banner-upload-btn" title="Trocar banner">
                      <Camera size={12} />
                      <input type="file" accept="image/*" onChange={handleBanner} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {/* Foto de Perfil (sobrepondo o banner) */}
                  <div className="eq-foto-overlay">
                    <div className="eq-foto-preview eq-foto-preview--overlay">
                      {fotoPreview ? (
                        <img src={fotoPreview} alt="Preview" />
                      ) : (
                        <div className="eq-foto-placeholder">{form.nome?.[0]?.toUpperCase() || '?'}</div>
                      )}
                      <label className="eq-foto-btn-overlay" title="Trocar foto">
                        <Camera size={12} />
                        <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO: INFORMAÇÕES PESSOAIS */}
              <div className="eq-secao-modal">
                <div className="eq-secao-header">
                  <Users size={14} />
                  <span>Informações Pessoais</span>
                </div>
                <div className="campo-grupo"><label className="campo-label">Nome completo *</label><input className="campo-input" value={form.nome} onChange={setField('nome')} placeholder="Digite o nome completo" /></div>

                <div className="campo-row">
                  <div className="campo-grupo"><label className="campo-label"><Mail size={12} /> E-mail</label><input className="campo-input" type="email" value={form.email} onChange={setField('email')} placeholder="exemplo@email.com" /></div>
                  <div className="campo-grupo"><label className="campo-label"><Phone size={12} /> Telefone</label><input className="campo-input" value={form.telefone} onChange={setField('telefone')} placeholder="(00) 00000-0000" /></div>
                </div>

                <div className="campo-grupo"><label className="campo-label"><Briefcase size={12} /> Cargo / Função</label><input className="campo-input" value={form.cargo} onChange={setField('cargo')} placeholder="Ex: Cabeleireiro, Manicure, etc." /></div>
              </div>

              {/* SEÇÃO: ACESSO E SEGURANÇA */}
              <div className="eq-secao-modal">
                <div className="eq-secao-header">
                  <Shield size={14} />
                  <span>Acesso e Segurança</span>
                </div>
                <div className="campo-row">
                  <div className="campo-grupo campo-grupo--flex2">
                    <label className="campo-label"><Lock size={12} /> Senha Temporária</label>
                    <div className="eq-senha-input-group">
                      <input 
                        className="campo-input" 
                        type="password"
                        value={form.senhaTemporaria} 
                        onChange={setField('senhaTemporaria')} 
                        placeholder="Mínimo 6 caracteres" 
                      />
                      <button 
                        type="button"
                        className="btn-secondary btn-gerar-senha" 
                        onClick={() => setForm(f => ({ ...f, senhaTemporaria: gerarSenhaAleatoria() }))}
                      >
                        <RefreshCw size={12} /> Gerar
                      </button>
                    </div>
                    <p className="campo-hint">O colaborador deve trocar esta senha no primeiro acesso</p>
                  </div>
                  <div className="campo-grupo">
                    <label className="campo-label"><Shield size={12} /> Nível de Acesso</label>
                    <select className="campo-input campo-input--select" value={form.nivelAcesso} onChange={setField('nivelAcesso')}>
                      {(Object.entries(NIVEIS) as [NivelAcesso, any][]).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                    </select>
                    <p className="campo-hint" style={{ color: NIVEIS[form.nivelAcesso].cor }}>{NIVEIS[form.nivelAcesso].descricao}</p>
                  </div>
                </div>
              </div>

              {/* SEÇÃO: SERVIÇOS */}
              <div className="eq-secao-modal">
                <div className="eq-secao-header">
                  <Scissors size={14} />
                  <span>Serviços Habilitados</span>
                  <span className="eq-servicos-contador">{form.servicos.length} selecionado{form.servicos.length !== 1 ? 's' : ''}</span>
                </div>
                {servicosDisponiveis.length === 0 ? (
                  <div className="eq-servicos-vazio">
                    <Scissors size={24} />
                    <p>Nenhum serviço cadastrado no seu sistema.</p>
                    <button className="btn-link" onClick={() => window.location.href = '/servicos'}>Cadastrar serviços</button>
                  </div>
                ) : (
                  <div className="eq-servicos-selector eq-servicos-selector--grid">
                    {servicosDisponiveis.map(s => {
                      const selecionado = form.servicos.includes(s.nome);
                      return (
                        <div key={s.id} className={`eq-servico-card ${selecionado ? 'eq-servico-card--active' : ''}`} onClick={() => toggleServico(s.nome)}>
                          <div className="eq-servico-card-check">{selecionado && <Check size={14} />}</div>
                          <span className="eq-servico-card-nome">{s.nome}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="eq-modal-footer">
              <button className="btn-secondary btn-cancelar" onClick={fecharModal}>
                <X size={14} /> Cancelar
              </button>
              <button className="btn-primary btn-salvar" onClick={salvar} disabled={salvando}>
                {salvando ? <><span className="spinner" /> Salvando...</> : <><Check size={14} /> {editando ? 'Salvar Alterações' : 'Cadastrar Colaborador'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CardColaborador({ c, iniciais, onEditar, onExcluir, onAlternar, planoVerified }: { c: Colaborador; iniciais: string; onEditar: () => void; onExcluir: () => void; onAlternar: () => void; planoVerified?: boolean }) {
  const nivel = c.nivelAcesso ? NIVEIS[c.nivelAcesso] : NIVEIS.operacao;
  const isMobile = c.fonte === 'mobile' || c.clinicaId;
  
  return (
    <div className={`eq-card ${c.ativo === false ? 'eq-card--inativo' : ''} ${isMobile ? 'eq-card--mobile' : ''}`}>
      <div className="eq-card-topo">
        {c.fotoUrl ? <img src={c.fotoUrl} alt={c.nome} className="eq-avatar-foto" /> : <div className="eq-avatar">{iniciais}</div>}
        <div className="eq-card-info">
          <h3 className="eq-card-nome">
            {c.nome}
            {planoVerified && <span className="eq-verified-badge" title="Verificado"><CheckCircle size={12} /></span>}
          </h3>
          {c.cargo && <p className="eq-card-cargo"><Briefcase size={11} /> {c.cargo}</p>}
          {c.email && <p className="eq-card-email"><Mail size={10} /> {c.email}</p>}
        </div>
        <span className={`eq-status ${c.ativo !== false ? 'eq-status--ativo' : 'eq-status--inativo'}`}>{c.ativo !== false ? 'Ativo' : 'Inativo'}</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="eq-nivel-badge" style={{ borderColor: nivel.cor, color: nivel.cor }}><Shield size={11} /> {nivel.label}</div>
        {c.conectaId && (
          <div className="eq-cid-badge" onClick={() => { navigator.clipboard.writeText(c.conectaId!); toast.success('Conecta ID Copiado!'); }} title="Clique para copiar">
            <Copy size={10} /> CID: {c.conectaId}
          </div>
        )}
        {isMobile && <span className="eq-fonte-badge">Mobile</span>}
      </div>
      {c.servicos && c.servicos.length > 0 && (
        <div className="eq-servicos">{c.servicos.map(s => <span key={s} className="eq-servico-tag">{s}</span>)}</div>
      )}
      <div className="eq-acoes">
        <button className="btn-icon btn-icon--ghost" onClick={onEditar} title="Editar"><Edit2 size={14} /></button>
        <button className="btn-icon btn-icon--agenda" onClick={() => window.location.href = `/agenda?colaborador=${c.id}`} title="Configurar Agenda">
          <Calendar size={14} />
        </button>
        <button className={`btn-icon ${c.ativo !== false ? 'btn-icon--warn' : 'btn-icon--ghost'}`} onClick={onAlternar} title={c.ativo !== false ? 'Desativar' : 'Ativar'}>
          {c.ativo !== false ? <XCircle size={14} /> : <CheckCircle size={14} />}
        </button>
        <button className="btn-icon btn-icon--delete" onClick={onExcluir} title="Remover"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}
