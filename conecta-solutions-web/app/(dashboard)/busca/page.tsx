'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Star, Clock, ChevronRight, SlidersHorizontal, Heart, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/busca.css';

// ============================================================
// TIPOS
// ============================================================
interface Profissional {
  id: string;
  nome?: string;
  nomeCompleto?: string;
  fotoPerfil?: string;
  bio?: string;
  cidade?: string;
  estado?: string;
  categoria?: string;
  especialidade?: string;
  avaliacaoMedia?: number;
  totalAvaliacoes?: number;
  servicos?: string[];
  planoAtivo?: string;
}

// ============================================================
// PÁGINA DE BUSCA DE PROFISSIONAIS
// ============================================================
export default function BuscaPage() {
  const { user, dadosUsuario } = useAuth();
  const router = useRouter();

  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading]             = useState(true);
  const [busca, setBusca]                 = useState('');
  const [cidadeFiltro, setCidadeFiltro]   = useState('');
  const [categorias, setCategorias]       = useState<string[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todos');
  const [favoritosIDs, setFavoritosIDs]   = useState<string[]>([]);

  const carregarProfissionais = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Carrega Profissionais
      const q = query(
        collection(db, 'usuarios'),
        where('tipo', 'in', ['profissional', 'empresa']),
        orderBy('nome', 'asc')
      );
      const snap = await getDocs(q);
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Profissional));
      setProfissionais(lista);

      // Extrai categorias únicas para os filtros rápidos
      const cats = Array.from(new Set(lista.map(p => p.categoria || p.especialidade).filter(Boolean))) as string[];
      setCategorias(cats.slice(0, 8));

      // 2. Carrega Favoritos se logado
      if (user?.uid) {
        const favSnap = await getDocs(collection(db, 'usuarios', user.uid, 'favoritos'));
        setFavoritosIDs(favSnap.docs.map(d => d.id));
      }
    } catch (err) {
      console.error('[Busca]', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { carregarProfissionais(); }, [carregarProfissionais]);

  const toggleFavorito = async (e: React.MouseEvent, p: Profissional) => {
    e.stopPropagation(); // Evita navegar para o perfil ao clicar no coração
    if (!user?.uid) return toast.error('Faça login para favoritar');

    const isFav = favoritosIDs.includes(p.id);
    const favRef = doc(db, 'usuarios', user.uid, 'favoritos', p.id);

    try {
      if (isFav) {
        await deleteDoc(favRef);
        setFavoritosIDs(prev => prev.filter(id => id !== p.id));
        toast.success('Removido dos favoritos');
      } else {
        await setDoc(favRef, {
          profissionalId: p.id,
          nome: p.nome || p.nomeCompleto || 'Profissional',
          especialidade: p.categoria || p.especialidade || '',
          cidade: p.cidade || '',
          fotoPerfil: p.fotoPerfil || '',
          createdAt: serverTimestamp(),
        });
        setFavoritosIDs(prev => [...prev, p.id]);
        toast.success('Adicionado aos favoritos! ❤️');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar favorito');
    }
  };

  // Filtragem combinada
  const profissionaisFiltrados = profissionais.filter(p => {
    const nome = (p.nome || p.nomeCompleto || '').toLowerCase();
    const termoBusca = busca.toLowerCase();
    const termoCidade = cidadeFiltro.toLowerCase();

    const matchBusca    = !busca || nome.includes(termoBusca) ||
      p.bio?.toLowerCase().includes(termoBusca) ||
      p.categoria?.toLowerCase().includes(termoBusca) ||
      p.especialidade?.toLowerCase().includes(termoBusca);

    const matchCidade   = !cidadeFiltro || p.cidade?.toLowerCase().includes(termoCidade);
    const matchCategoria = categoriaAtiva === 'Todos' || p.categoria === categoriaAtiva || p.especialidade === categoriaAtiva;

    return matchBusca && matchCidade && matchCategoria;
  });

  // Separa VIPs para destaque
  const vips = profissionaisFiltrados.filter(p => p.planoAtivo && p.planoAtivo !== 'pro_iniciante' && p.planoAtivo !== 'free');
  const outros = profissionaisFiltrados.filter(p => !vips.includes(p));

  const iniciais = (p: Profissional) => {
    const nome = p.nome || p.nomeCompleto || 'P';
    return nome.trim().split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="busca-page">
      <Topbar title="Buscar Profissionais" subtitle="Encontre o profissional ideal para você" />

      <div className="busca-body">

        {/* ===== BARRA DE BUSCA PRINCIPAL ===== */}
        <div className="busca-hero">
          <div className="busca-inputs">
            <div className="busca-campo-wrap">
              <Search size={16} className="busca-campo-icon" />
              <input
                type="text"
                className="busca-campo"
                placeholder="Nome, serviço ou especialidade..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            <div className="busca-campo-wrap">
              <MapPin size={16} className="busca-campo-icon" />
              <input
                type="text"
                className="busca-campo"
                placeholder="Cidade..."
                value={cidadeFiltro}
                onChange={e => setCidadeFiltro(e.target.value)}
              />
            </div>
          </div>

          {/* Filtros por categoria */}
          {categorias.length > 0 && (
            <div className="busca-categorias">
              <SlidersHorizontal size={14} className="busca-categorias-icon" />
              {['Todos', ...categorias].map(cat => (
                <button
                  key={cat}
                  className={`busca-categoria-btn ${categoriaAtiva === cat ? 'busca-categoria-btn--ativo' : ''}`}
                  onClick={() => setCategoriaAtiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="busca-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />
            ))}
          </div>
        ) : profissionaisFiltrados.length === 0 ? (
          <div className="busca-vazio">
            <Search size={44} />
            <p>Nenhum profissional encontrado com esses filtros.</p>
            <button className="btn-secondary" onClick={() => { setBusca(''); setCidadeFiltro(''); setCategoriaAtiva('Todos'); }}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {/* ===== DESTAQUES VIP ===== */}
            {vips.length > 0 && (
              <div className="busca-secao">
                <h2 className="busca-secao-titulo">
                  <Star size={16} className="busca-secao-icon busca-secao-icon--vip" />
                  Profissionais em Destaque
                </h2>
                <div className="busca-grid">
                  {vips.map(p => (
                    <CardProfissional 
                      key={p.id} 
                      p={p} 
                      iniciais={iniciais(p)} 
                      vip 
                      isFav={favoritosIDs.includes(p.id)}
                      onToggleFav={(e) => toggleFavorito(e, p)}
                      onClick={() => router.push(`/perfil-profissional/${p.id}`)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ===== TODOS OS PROFISSIONAIS ===== */}
            <div className="busca-secao">
              {vips.length > 0 && (
                <h2 className="busca-secao-titulo">Outros Profissionais</h2>
              )}
              <p className="busca-contador">{profissionaisFiltrados.length} profissional(is) encontrado(s)</p>
              <div className="busca-grid">
                {outros.map(p => (
                  <CardProfissional 
                    key={p.id} 
                    p={p} 
                    iniciais={iniciais(p)} 
                    isFav={favoritosIDs.includes(p.id)}
                    onToggleFav={(e) => toggleFavorito(e, p)}
                    onClick={() => router.push(`/perfil-profissional/${p.id}`)} 
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE — Card do Profissional (PREMIUM ENTERPRISE)
// ============================================================
function CardProfissional({
  p, iniciais, vip = false, onClick, isFav, onToggleFav
}: { p: Profissional; iniciais: string; vip?: boolean; onClick: () => void; isFav: boolean; onToggleFav: (e: React.MouseEvent) => void }) {
  
  // Sincronização Mobile: Resolve URLs de imagem
  const fotoFinal = p.fotoPerfil || p.foto || p.avatar || p.fotoUrl;
  const bannerFinal = p.bannerPerfil || p.banner || p.bannerUrl || p.fotoBanner;

  return (
    <div className={`prof-card-enterprise-container ${vip ? 'prof-card--premium-vip' : ''}`}>
      <div className="prof-card-enterprise-body" onClick={onClick}>
        {/* Banner Real do Profissional */}
        <div className="prof-card-enterprise-banner">
          {bannerFinal ? (
            <img src={bannerFinal} alt="Banner" />
          ) : (
            <div className="prof-banner-placeholder-premium" />
          )}
          {vip && <span className="vip-gold-badge"><Star size={10} fill="#fff" /> VIP ELITE</span>}
        </div>

        <div className="prof-card-enterprise-content">
          {/* Avatar com Overlap e Efeito de Sombra */}
          <div className="prof-card-avatar-overlap-premium">
            {fotoFinal ? (
              <img src={fotoFinal} alt={p.nome || p.nomeCompleto} className="prof-card-img" />
            ) : (
              <div className="prof-card-initials">{iniciais}</div>
            )}
            <div className="verified-check-mini">
              <CheckCircle size={12} fill="#fff" color="#3B82F6" />
            </div>
          </div>

          <div className="prof-card-main-info">
            <h3 className="prof-card-name-premium">
              {p.nome || p.nomeCompleto}
            </h3>
            <span className="prof-card-spec-badge">
              {p.categoria || p.especialidade || 'Especialista'}
            </span>

            <div className="prof-card-meta-row">
              <div className="prof-meta-item">
                <MapPin size={12} className="text-red-500" />
                <span>{p.cidade || 'Localização'}, {p.estado || 'BR'}</span>
              </div>
              <div className="prof-meta-item">
                <Star size={12} fill="#fab005" color="#fab005" />
                <strong>{p.avaliacaoMedia ? p.avaliacaoMedia.toFixed(1) : '5.0'}</strong>
                <span className="count">({p.totalAvaliacoes || 0})</span>
              </div>
            </div>
          </div>

          <div className="prof-card-action-bar">
            <button className="btn-view-profile">Ver Perfil</button>
            <ChevronRight size={16} className="arrow-icon-premium" />
          </div>
        </div>
      </div>

      {/* Favoritar Flutuante */}
      <button 
        className={`prof-card-fav-premium ${isFav ? 'active' : ''}`} 
        onClick={onToggleFav}
      >
        <Heart size={18} fill={isFav ? "#E63946" : "none"} color={isFav ? "#E63946" : "#A0A8B3"} />
      </button>
    </div>
  );
}
