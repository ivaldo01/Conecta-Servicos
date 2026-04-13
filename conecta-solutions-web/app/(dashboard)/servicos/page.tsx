'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Plus, Pencil, Trash2, X, Check, Scissors, Clock, DollarSign, Search } from 'lucide-react';
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
}

interface FormServico {
  nome: string;
  preco: string;
  duracao: string;
  descricao: string;
}

const FORM_INICIAL: FormServico = { nome: '', preco: '', duracao: '60', descricao: '' };

// ============================================================
// COMPONENTE PRINCIPAL — SERVIÇOS
// ============================================================
export default function ServicosPage() {
  const { dadosUsuario } = useAuth();
  const [servicos, setServicos]       = useState<Servico[]>([]);
  const [loading, setLoading]         = useState(true);
  const [salvando, setSalvando]       = useState(false);
  const [busca, setBusca]             = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando]       = useState<Servico | null>(null);
  const [form, setForm]               = useState<FormServico>(FORM_INICIAL);

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
    setForm({ nome: s.nome, preco: String(s.preco), duracao: String(s.duracao), descricao: s.descricao || '' });
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

  // Filtra por busca
  const servicosFiltrados = servicos.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Formata duração em horas/minutos
  const formatarDuracao = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <div className="servicos-page-premium">
      <Topbar title="Catálogo de Serviços" subtitle="Defina sua oferta de valor e precificação enterprise" />

      <div className="servicos-container-premium">
        
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
