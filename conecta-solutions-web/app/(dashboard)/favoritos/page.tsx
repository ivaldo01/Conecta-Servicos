'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Heart, MapPin, BriefcaseBusiness, ChevronRight, Trash2, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import '@/styles/favoritos.css';

// ============================================================
// TIPOS
// ============================================================
interface Favorito {
  id: string; // ID do documento na coleção favoritos
  profissionalId: string;
  nome: string;
  categoria: string;
  cidade: string;
  fotoUrl?: string;
}

// ============================================================
// PÁGINA DE FAVORITOS
// ============================================================
export default function FavoritosPage() {
  const { dadosUsuario } = useAuth();
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading]     = useState(true);

  const carregarFavoritos = useCallback(async () => {
    if (!dadosUsuario?.uid) return;
    setLoading(true);
    try {
      // No app mobile, favoritos ficam em /usuarios/{uid}/favoritos
      const q = query(collection(db, 'usuarios', dadosUsuario.uid, 'favoritos'));
      const snap = await getDocs(q);
      
      const lista = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          profissionalId: String(data.profissionalId || data.uid || d.id),
          nome: String(data.nome || data.profissionalNome || 'Profissional'),
          categoria: String(data.categoria || data.especialidade || 'Serviços profissionais'),
          cidade: String(data.cidade || data.localizacao || 'Localização não informada'),
          fotoUrl: typeof data.fotoUrl === 'string' ? data.fotoUrl : undefined,
        } satisfies Favorito;
      });

      setFavoritos(lista);
    } catch (err) {
      console.error('[Favoritos]', err);
    } finally {
      setLoading(false);
    }
  }, [dadosUsuario]);

  useEffect(() => { carregarFavoritos(); }, [carregarFavoritos]);

  const removerFavorito = async (fav: Favorito) => {
    if (!dadosUsuario?.uid) return;
    try {
      await deleteDoc(doc(db, 'usuarios', dadosUsuario.uid, 'favoritos', fav.id));
      setFavoritos(prev => prev.filter(f => f.id !== fav.id));
      toast.success('Removido dos favoritos');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="fav-page">
      <Topbar title="Favoritos" subtitle="Seus profissionais preferidos em um só lugar" />

      <div className="fav-body">
        <section className="fav-hero">
          <div>
            <span className="fav-eyebrow">SUA SELEÇÃO</span>
            <h1>Profissionais que você quer por perto.</h1>
            <p>Organize suas melhores escolhas e acesse cada perfil com rapidez.</p>
          </div>
          <div className="fav-total"><Heart size={18} /><strong>{favoritos.length}</strong><span>salvos</span></div>
        </section>
        {loading ? (
          <div className="fav-grid">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
          </div>
        ) : favoritos.length === 0 ? (
          <div className="fav-vazio">
            <div className="fav-vazio-icon"><Heart size={30} /></div>
            <span className="fav-vazio-eyebrow">COMECE SUA LISTA</span>
            <h3>Nenhum favorito ainda</h3>
            <p>Salve os profissionais que mais combinam com você e encontre-os aqui sempre que precisar.</p>
            <div className="fav-vazio-beneficio"><ShieldCheck size={16} /> Seus favoritos ficam vinculados à sua conta</div>
            <Link href="/busca" className="fav-vazio-cta"><Search size={17} /> Buscar profissionais</Link>
          </div>
        ) : (
          <div className="fav-grid">
            {favoritos.map(fav => (
              <div key={fav.id} className="fav-card">
                <button className="fav-remove-btn" onClick={() => removerFavorito(fav)} title="Remover">
                  <Trash2 size={16} />
                </button>
                
                <div className="fav-card-header">
                  {fav.fotoUrl ? (
                    <Image src={fav.fotoUrl} alt={fav.nome} className="fav-avatar" width={66} height={66} unoptimized />
                  ) : (
                    <div className="fav-avatar-placeholder">{fav.nome.trim().charAt(0).toUpperCase() || 'P'}</div>
                  )}
                  <div className="fav-info">
                    <h3 className="fav-nome">{fav.nome}</h3>
                    <p className="fav-categoria"><BriefcaseBusiness size={12} /> {fav.categoria}</p>
                    <p className="fav-local"><MapPin size={12} /> {fav.cidade}</p>
                  </div>
                </div>

                <div className="fav-card-footer">
                  <Link href={`/busca?id=${fav.profissionalId}`} className="fav-link">
                    Ver Perfil <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
