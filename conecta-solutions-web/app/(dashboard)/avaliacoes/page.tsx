'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Topbar from '@/components/layout/Topbar';
import { Star, User, MessageSquare, Calendar } from 'lucide-react';
import '@/styles/avaliacoes-page.css';

interface Avaliacao {
  id: string;
  clienteNome?: string;
  profissionalNome?: string;
  clienteFoto?: string;
  nota: number;
  comentario?: string;
  data: any;
  servico?: string;
}

export default function AvaliacoesPage() {
  const { user, ehProfissional } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarAvaliacoes() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const field = ehProfissional ? 'profissionalId' : 'clienteId';
        const q = query(
          collection(db, 'avaliacoes'),
          where(field, '==', user.uid)
        );
        const snap = await getDocs(q);
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao));
        
        // Ordenação manual para evitar erro de índice no Firestore
        lista.sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));
        
        setAvaliacoes(lista);
      } catch (err) {
        console.error('[AvaliacoesPage]', err);
      } finally {
        setLoading(false);
      }
    }
    carregarAvaliacoes();
  }, [user, ehProfissional]);

  const renderEstrelas = (nota: number) => {
    return (
      <div className="ap-estrelas">
        {[1, 2, 3, 4, 5].map(n => (
          <Star 
            key={n} 
            size={14} 
            fill={n <= nota ? "#fab005" : "rgba(226, 232, 240, 0.4)"} 
            stroke={n <= nota ? "#fab005" : "#CBD5E1"} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="avaliacoes-page">
      <Topbar 
        title={ehProfissional ? "Reputação" : "Meus Feedbacks"} 
        subtitle={ehProfissional ? "Gestão de reputação e qualidade enterprise" : "Histórico de experiências compartilhadas"} 
      />

      <div className="avaliacoes-body-premium">
        {loading ? (
          <div className="ap-loading-enterprise">
            <div className="ap-spinner"></div>
            Processando histórico...
          </div>
        ) : avaliacoes.length === 0 ? (
          <div className="ap-vazio-enterprise">
            <MessageSquare size={64} className="mb-6 opacity-10" />
            <p>Nenhuma interação de feedback registrada até o momento.</p>
          </div>
        ) : (
          <div className="ap-grid-premium">
            {avaliacoes.map(av => (
              <div key={av.id} className="ap-card-premium">
                <div className="ap-card-header">
                  <div className="ap-autor">
                    <div className="ap-avatar-wrap">
                      {av.clienteFoto ? <img src={av.clienteFoto} alt="Avatar" /> : <div className="ap-avatar-placeholder"><User size={20} /></div>}
                    </div>
                    <div>
                      <p className="ap-nome">{ehProfissional ? av.clienteNome : `Para: ${av.profissionalNome || 'Profissional'}`}</p>
                      <p className="ap-servico">{av.servico || 'Serviço efetuado'}</p>
                    </div>
                  </div>
                  <div className="ap-nota-badge">
                    {renderEstrelas(av.nota)}
                    <span className="ap-nota-valor">{av.nota.toFixed(1)}</span>
                  </div>
                </div>

                {av.comentario && (
                  <div className="ap-comentario-box">
                    <p>"{av.comentario}"</p>
                  </div>
                )}

                <div className="ap-footer-premium">
                  <div className="ap-data-tag">
                    <Calendar size={12} /> 
                    {av.data?.seconds ? new Date(av.data.seconds * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recente'}
                  </div>
                  <div className="ap-verified-tag">Verificada</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
