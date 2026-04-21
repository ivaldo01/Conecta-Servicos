'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Plus, Pencil, Trash2, X, Check, Scissors, Clock, DollarSign, Search, Upload, ImageIcon } from 'lucide-react';
// Configuração Cloudinary (mesma do mobile)
const CLOUDINARY_CLOUD_NAME = 'dctnkaktn';
const CLOUDINARY_UPLOAD_PRESET = 'Conecta-Solutions';
import toast from 'react-hot-toast';
import '@/styles/servicos.css';

// ============================================================
// TIPOS
// ============================================================
interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;      // em minutos
  descricao?: string;
  ativo?: boolean;
  fotoUrl?: string;
  categoria?: string;
}

interface FormServico {
  nome: string;
  preco: string;
  duracao: string;
  descricao: string;
  fotoUrl: string;
  categoria: string;
}

const FORM_INICIAL: FormServico = { nome: '', preco: '', duracao: '60', descricao: '', fotoUrl: '', categoria: '' };

// ============================================================
// COMPONENTE PRINCIPAL — SERVIÇOS
// ============================================================
export default function ServicosPage() {
  const { dadosUsuario } = useAuth();
  const [servicos, setServicos]       = useState<Servico[]>([]);
  const [loading, setLoading]         = useState(true);
  const [salvando, setSalvando]       = useState(false);
  const [busca, setBusca]             = useState('');
  const [ordenacao, setOrdenacao]       = useState<'nome' | 'preco_maior' | 'preco_menor' | 'duracao'>('nome');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando]       = useState<Servico | null>(null);
  const [form, setForm]               = useState<FormServico>(FORM_INICIAL);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  // Carrega serviços do Firestore
  const carregarServicos = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios', dadosUsuario.uid, 'servicos'));
      setServicos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Servico)));
    } catch (err) {
      console.error('[Serviços]', err);
      toast.error('Erro ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario]);

  useEffect(() => { carregarServicos(); }, [carregarServicos]);

  // Abre modal para novo serviço
  const abrirNovo = () => {
    setEditando(null);
    setForm(FORM_INICIAL);
    setModalAberto(true);
  };

  // Abre modal para editar
  const abrirEditar = (s: Servico) => {
    setEditando(s);
    setForm({ nome: s.nome, preco: String(s.preco), duracao: String(s.duracao), descricao: s.descricao || '', fotoUrl: s.fotoUrl || '', categoria: s.categoria || '' });
    setModalAberto(true);
  };

  // Fechar modal
  const fecharModal = () => { setModalAberto(false); setEditando(null); setForm(FORM_INICIAL); };

  // Salvar (criar ou editar)
  const salvar = async () => {
    if (!dadosUsuario?.uid) return;
    if (!form.nome.trim() || !form.preco || !form.duracao) {
      toast.error('Preencha nome, preço e duração.'); return;
    }

    const payload = {
      nome: form.nome.trim(),
      preco: parseFloat(form.preco.replace(',', '.')),
      duracao: parseInt(form.duracao),
      descricao: form.descricao.trim(),
      fotoUrl: form.fotoUrl.trim(),
      categoria: form.categoria.trim(),
      ativo: true,
      atualizadoEm: serverTimestamp(),
    };

    setSalvando(true);
    try {
      if (editando) {
        await updateDoc(doc(db, 'usuarios', dadosUsuario.uid, 'servicos', editando.id), payload);
        toast.success('Serviço atualizado!');
      } else {
        await addDoc(collection(db, 'usuarios', dadosUsuario.uid, 'servicos'), { ...payload, criadoEm: serverTimestamp() });
        toast.success('Serviço criado!');
      }
      fecharModal();
      carregarServicos();
    } catch (err) {
      console.error('[Serviços] Erro ao salvar:', err);
      toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Excluir serviço
  const excluir = async (s: Servico) => {
    if (!dadosUsuario?.uid) return;
    if (!confirm(`Excluir o serviço "${s.nome}"?`)) return;
    try {
      await deleteDoc(doc(db, 'usuarios', dadosUsuario.uid, 'servicos', s.id));
      toast.success('Serviço excluído.');
      carregarServicos();
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  // Filtra por busca e aplica ordenação
  const servicosFiltrados = servicos
    .filter(s => s.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => {
      switch (ordenacao) {
        case 'nome': return a.nome.localeCompare(b.nome);
        case 'preco_maior': return b.preco - a.preco;
        case 'preco_menor': return a.preco - b.preco;
        case 'duracao': return a.duracao - b.duracao;
        default: return 0;
      }
    });

  // Estatísticas
  const totalServicos = servicos.length;
  const precoMedio = totalServicos > 0 
    ? servicos.reduce((acc, s) => acc + s.preco, 0) / totalServicos 
    : 0;
  const servicoMaisCaro = totalServicos > 0 
    ? servicos.reduce((max, s) => s.preco > max.preco ? s : max, servicos[0])
    : null;

  // Formata duração em horas/minutos
  const formatarDuracao = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  };

  // Upload foto para Cloudinary (mesma config do mobile)
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (!file.type.startsWith('image/')) {
      toast.error('Somente imagens são permitidas.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      
      if (data.secure_url) {
        setForm({ ...form, fotoUrl: data.secure_url });
        toast.success('Foto carregada com sucesso!');
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('[Upload Error]', err);
      toast.error('Erro ao carregar foto. Tente novamente.');
    } finally {
      setUploadingFoto(false);
    }
  };

  return (
    <div className="servicos-page-premium">
      <Topbar title="Catálogo de Serviços" subtitle="Defina sua oferta de valor e precificação enterprise" />

      <div className="servicos-container-premium">
        
        {/* ===== ESTATÍSTICAS RÁPIDAS ===== */}
        <section className="servicos-stats-row">
          <div className="stat-card-mini">
            <span className="stat-value">{totalServicos}</span>
            <span className="stat-label">Total de Serviços</span>
          </div>
          <div className="stat-card-mini">
            <span className="stat-value">R$ {precoMedio.toFixed(2).replace('.', ',')}</span>
            <span className="stat-label">Preço Médio</span>
          </div>
          {servicoMaisCaro && (
            <div className="stat-card-mini highlight">
              <span className="stat-value">R$ {servicoMaisCaro.preco.toFixed(2).replace('.', ',')}</span>
              <span className="stat-label">Mais Caro: {servicoMaisCaro.nome}</span>
            </div>
          )}
        </section>

        {/* ===== BARRA DE GESTÃO SUPERIOR ===== */}
        <section className="servicos-header-controls">
          <div className="search-wrap-premium">
            <Search size={18} className="search-icon-premium" />
            <input
              type="text"
              className="search-input-premium"
              placeholder="Localizar serviço no catálogo..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <div className="ordenacao-wrap">
            <select 
              className="ordenacao-select"
              value={ordenacao}
              onChange={e => setOrdenacao(e.target.value as typeof ordenacao)}
            >
              <option value="nome">Ordenar: Nome</option>
              <option value="preco_maior">Ordenar: Preço (maior → menor)</option>
              <option value="preco_menor">Ordenar: Preço (menor → maior)</option>
              <option value="duracao">Ordenar: Duração</option>
            </select>
          </div>
          <button className="btn-add-premium" onClick={abrirNovo}>
            <Plus size={18} /> <span>Novo Serviço</span>
          </button>
        </section>

        {/* ===== GRADE DE EXIBIÇÃO ===== */}
        {loading ? (
          <div className="servicos-grid-premium">
            {[1,2,3].map(i => <div key={i} className="skeleton-card-premium" />)}
          </div>
        ) : servicosFiltrados.length === 0 ? (
          <div className="vazio-state-premium">
            <Scissors size={48} className="opacity-10" />
            <p>{busca ? 'Nenhum resultado para sua busca.' : 'Seu catálogo está vazio.'}</p>
            {!busca && <button className="btn-add-premium" onClick={abrirNovo}>Começar Catálogo</button>}
          </div>
        ) : (
          <div className="servicos-grid-premium">
            {servicosFiltrados.map(s => (
              <div key={s.id} className="servico-card-premium">
                <div className="card-accent-line" />
                
                {/* Foto do Serviço */}
                <div className="servico-foto-wrap">
                  {s.fotoUrl ? (
                    <img src={s.fotoUrl} alt={s.nome} className="servico-foto" />
                  ) : (
                    <div className="servico-foto-placeholder">
                      <Scissors size={32} />
                    </div>
                  )}
                  {s.categoria && <span className="servico-categoria">{s.categoria}</span>}
                </div>
                
                <div className="card-main-content">
                  <div className="card-info-side">
                    <h3 className="servico-name-premium">{s.nome}</h3>
                    <p className="servico-desc-premium">{s.descricao || 'Sem descrição detalhada.'}</p>
                    
                    <div className="servico-meta-row-premium">
                      <div className="meta-badge-premium">
                        <Clock size={12} /> {formatarDuracao(s.duracao)}
                      </div>
                    </div>
                  </div>

                  <div className="card-price-side">
                    <span className="price-label-premium">Investimento</span>
                    <span className="price-val-premium">R$ {Number(s.preco ?? 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="card-actions-premium">
                  <button onClick={() => abrirEditar(s)} className="action-btn-premium edit">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => excluir(s)} className="action-btn-premium delete">
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== MODAL DE GESTÃO (PREMIUM) ===== */}
      {modalAberto && (
        <div className="modal-overlay-premium" onClick={fecharModal}>
          <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
            <div className="modal-header-premium">
              <div>
                <h2 className="modal-title-premium">{editando ? 'Editar Definição' : 'Novo Serviço'}</h2>
                <p className="modal-subtitle-premium">Detalhamento técnico do serviço</p>
              </div>
              <button className="modal-close-btn" onClick={fecharModal}><X size={20} /></button>
            </div>

            <div className="modal-form-premium">
              <div className="form-group-premium full">
                <label>Nome do Serviço</label>
                <input type="text" placeholder="Ex: Consultoria Estratégica" value={form.nome} 
                  onChange={e => setForm({ ...form, nome: e.target.value })} />
              </div>

              <div className="form-row-premium">
                <div className="form-group-premium">
                  <label>Valor (R$)</label>
                  <div className="input-with-prefix">
                    <span>R$</span>
                    <input type="number" placeholder="0,00" value={form.preco} 
                      onChange={e => setForm({ ...form, preco: e.target.value })} />
                  </div>
                </div>
                <div className="form-group-premium">
                  <label>Duração (minutos)</label>
                  <input type="number" placeholder="60" value={form.duracao} 
                    onChange={e => setForm({ ...form, duracao: e.target.value })} />
                </div>
              </div>

              <div className="form-group-premium full">
                <label>Categoria</label>
                <input type="text" placeholder="Ex: Beleza, Consultoria, Treino..." value={form.categoria} 
                  onChange={e => setForm({ ...form, categoria: e.target.value })} />
              </div>

              <div className="form-group-premium full">
                <label>Foto do Serviço</label>
                <div className="foto-upload-wrap">
                  {form.fotoUrl ? (
                    <div className="foto-preview-container">
                      <img src={form.fotoUrl} alt="Preview" className="foto-preview" />
                      <button 
                        type="button" 
                        className="btn-remove-foto"
                        onClick={() => setForm({ ...form, fotoUrl: '' })}
                      >
                        <X size={16} /> Remover
                      </button>
                    </div>
                  ) : (
                    <label className="foto-upload-label">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleUploadFoto}
                        disabled={uploadingFoto}
                        style={{ display: 'none' }}
                      />
                      <div className="foto-upload-placeholder">
                        {uploadingFoto ? (
                          <span>Carregando...</span>
                        ) : (
                          <>
                            <Upload size={24} />
                            <span>Clique para carregar foto</span>
                            <small>JPG, PNG até 5MB</small>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group-premium full">
                <label>Descrição e Detalhes</label>
                <textarea rows={4} placeholder="O que está incluso neste serviço?" value={form.descricao} 
                  onChange={e => setForm({ ...form, descricao: e.target.value })} />
              </div>
            </div>

            <div className="modal-footer-premium">
              <button className="btn-cancel-premium" onClick={fecharModal}>Cancelar</button>
              <button className="btn-save-premium" onClick={salvar} disabled={salvando}>
                {salvando ? 'Processando...' : <><Check size={18} /> Confirmar Cadastro</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
