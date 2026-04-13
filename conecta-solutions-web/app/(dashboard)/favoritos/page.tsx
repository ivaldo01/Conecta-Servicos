'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Heart, Star, MapPin, Scissors, ChevronRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
      
      const lista = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Favorito));

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
    } catch (err) {
      toast.error('Erro ao remover');
    }
  };

  return (
    <div className="fav-page">
      <Topbar title="Favoritos" subtitle="Seus profissionais preferidos em um só lugar" />

      <div className="fav-body">
        {loading ? (
          <div className="fav-grid">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
          </div>
        ) : favoritos.length === 0 ? (
          <div className="fav-vazio">
            <Heart size={48} className="fav-vazio-icon" />
            <h3>Sua lista está vazia</h3>
            <p>Favorite profissionais para encontrá-los rapidamente aqui.</p>
            <Link href="/busca" className="btn-primary">Buscar Profissionais</Link>
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
                    <img src={fav.fotoUrl} alt={fav.nome} className="fav-avatar" />
                  ) : (
                    <div className="fav-avatar-placeholder">{fav.nome[0]}</div>
                  )}
                  <div className="fav-info">
                    <h3 className="fav-nome">{fav.nome}</h3>
                    <p className="fav-categoria"><Scissors size={12} /> {fav.categoria}</p>
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
