'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Topbar from '@/components/layout/Topbar';
import { MapPin, Star, Clock, DollarSign, ChevronRight, User, MessageSquare, Calendar } from 'lucide-react';
import '@/styles/perfil-profissional.css';

// ============================================================
// TIPOS
// ============================================================
interface Profissional {
  id: string;
  nome: string;
  categoria?: string;
  especialidade?: string;
  bio?: string;
  cidade?: string;
  estado?: string;
  fotoUrl?: string;
  avaliacaoMedia?: number;
  totalAvaliacoes?: number;
}

interface Avaliacao {
  id: string;
  clienteNome: string;
  clienteFoto?: string;
  nota: number;
  comentario?: string;
  data?: any;
  servico?: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao?: string;
}

// ============================================================
// PÁGINA: PERFIL DO PROFISSIONAL (VISÃO DO CLIENTE)
// ============================================================
export default function PerfilProfissionalPage() {
  const { id } = useParams();
  const router = useRouter();
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [servicos, setServicos]         = useState<Servico[]>([]);
  const [avaliacoes, setAvaliacoes]   = useState<Avaliacao[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function carregarDados() {
      if (!id) return;
      setLoading(true);
      try {
        // 1. Busca dados do profissional
        const profSnap = await getDoc(doc(db, 'usuarios', id as string));
        if (profSnap.exists()) {
          const d = profSnap.data();
          setProfissional({ 
            id: profSnap.id, 
            nome: d.nome || d.nomeCompleto || 'Profissional',
            ...d 
          } as Profissional);
        }

        // 2. Busca serviços deste profissional
        const subColRef = collection(db, 'usuarios', id as string, 'servicos');
        const servSnap = await getDocs(subColRef);
        setServicos(servSnap.docs.map(d => ({ id: d.id, ...d.data() } as Servico)));

        // 3. Busca avaliações
        const qAval = query(
          collection(db, 'avaliacoes'),
          where('profissionalId', '==', id)
        );
        const avalSnap = await getDocs(qAval);
        setAvaliacoes(avalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Avaliacao)));

      } catch (err) {
        console.error('[PerfilProfissional]', err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [id]);

  const fmtBRL = (v: any) => {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  if (loading) return <div className="prof-loading">Carregando perfil...</div>;
  if (!profissional) return <div className="prof-not-found">Profissional não encontrado.</div>;

  return (
    <div className="prof-page-enterprise">
      <Topbar title="Perfil Profissional" subtitle="Certificado e Verificado Conecta" />

      <div className="prof-container-premium">
        
        {/* ===== HERO / BANNER SECTION ===== */}
        <section className="prof-hero-premium">
          <div className="prof-banner-wrap">
            {(profissional.bannerPerfil || profissional.banner || profissional.bannerUrl || profissional.fotoBanner) ? (
              <img src={profissional.bannerPerfil || profissional.banner || profissional.bannerUrl || profissional.fotoBanner} alt="Banner" className="prof-banner-img" />
            ) : (
              <div className="prof-banner-placeholder" />
            )}
          </div>

          <div className="prof-identity-header">
            <div className="prof-avatar-wrap-xl">
              {(profissional.fotoPerfil || profissional.foto || profissional.avatar || profissional.fotoUrl) ? (
                <img src={profissional.fotoPerfil || profissional.foto || profissional.avatar || profissional.fotoUrl} alt={profissional.nome} />
              ) : (
                <div className="prof-avatar-fallback-xl">{profissional.nome?.[0]}</div>
              )}
            </div>

            <div className="prof-main-info-enterprise">
              <div className="prof-badges-top">
                <span className="badge-verified">Profissional Verificado</span>
                <span className="badge-category">{profissional.categoria || profissional.especialidade}</span>
              </div>
              <h1 className="prof-name-huge">{profissional.nome}</h1>
              <div className="prof-metrics-strip">
                <div className="metric-item">
                  <Star size={16} fill="#fab005" color="#fab005" />
                  <strong>{profissional.avaliacaoMedia ? profissional.avaliacaoMedia.toFixed(1) : 'Novo'}</strong>
                  <span>({profissional.totalAvaliacoes || 0} avaliações)</span>
                </div>
                <div className="metric-divider" />
                <div className="metric-item">
                  <MapPin size={16} />
                  <span>{profissional.cidade || 'Localização'}, {profissional.estado || 'BR'}</span>
                </div>
              </div>
            </div>
            
            <div className="prof-action-header">
              <button 
                className="btn-primary-enterprise"
                onClick={() => {
                  const firstServ = servicos[0]?.id;
                  if (firstServ) router.push(`/agendamentos/novo?prof=${id}&serv=${firstServ}`);
                }}
              >
                SOLICITAR AGENDAMENTO
              </button>
            </div>
          </div>
        </section>

        {/* ===== BIO / DESCRIÇÃO ===== */}
        {profissional.bio && (
          <section className="prof-bio-enterprise">
            <h3 className="section-title-enterprise">Sobre o Profissional</h3>
            <p className="bio-text-enterprise">{profissional.bio}</p>
          </section>
        )}

        {/* ===== LISTA DE SERVIÇOS ===== */}
        <section className="prof-servicos-section">
          <div className="prof-section-header">
            <h2 className="prof-section-title">Serviços Disponíveis</h2>
            <p className="prof-section-sub">Escolha um serviço para agendar um horário</p>
          </div>

          <div className="prof-servicos-grid">
            {servicos.length === 0 ? (
              <div className="prof-vazio">
                <p>Este profissional ainda não disponibilizou serviços via Web.</p>
              </div>
            ) : (
              servicos.map(s => (
                <div key={s.id} className="prof-servico-card">
                  <div className="prof-servico-info">
                    <h3 className="prof-servico-nome">{s.nome}</h3>
                    {s.descricao && <p className="prof-servico-desc">{s.descricao}</p>}
                    <div className="prof-servico-meta">
                      <span><Clock size={14} /> {s.duracao || 30} min</span>
                      <span><DollarSign size={14} /> {fmtBRL(s.preco)}</span>
                    </div>
                  </div>
                  <button 
                    className="btn-agendar-serv"
                    onClick={() => router.push(`/agendamentos/novo?prof=${id}&serv=${s.id}`)}
                  >
                    Agendar <ChevronRight size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ===== SEÇÃO DE AVALIAÇÕES ===== */}
        <section className="prof-avaliacoes-section-premium">
          <div className="prof-section-header">
            <h2 className="prof-section-title">Depoimentos e Avaliações</h2>
            <p className="prof-section-sub">O que os clientes dizem sobre a excelência deste profissional</p>
          </div>

          <div className="prof-avaliacoes-grid-premium">
            {avaliacoes.length === 0 ? (
              <div className="prof-vazio-premium">
                <MessageSquare size={48} className="opacity-10 mb-4" />
                <p>Este profissional ainda não recebeu avaliações.</p>
              </div>
            ) : (
              avaliacoes.map(av => (
                <div key={av.id} className="prof-avaliacao-card-premium">
                  <div className="av-card-header">
                    <div className="av-autor-info">
                      <div className="av-avatar-small">
                        {av.clienteFoto ? <img src={av.clienteFoto} alt={av.clienteNome} /> : <div className="av-avatar-placeholder">{av.clienteNome?.[0]}</div>}
                      </div>
                      <div>
                        <p className="av-nome">{av.clienteNome}</p>
                        <p className="av-servico-tag">{av.servico || 'Serviço Profissional'}</p>
                      </div>
                    </div>
                    <div className="av-nota-wrap">
                      <div className="av-stars-row">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={12} fill={n <= av.nota ? "#fab005" : "none"} stroke={n <= av.nota ? "#fab005" : "#E2E8F0"} />
                        ))}
                      </div>
                      <span className="av-nota-text">{av.nota.toFixed(1)}</span>
                    </div>
                  </div>

                  {av.comentario && (
                    <div className="av-comentario-premium">
                      <p>"{av.comentario}"</p>
                    </div>
                  )}

                  <div className="av-footer-premium">
                    <span className="av-data-tag">
                      <Calendar size={12} /> {av.data?.toDate ? av.data.toDate().toLocaleDateString('pt-BR') : 'Recente'}
                    </span>
                    <span className="av-verified-badge">Agendamento Realizado</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
