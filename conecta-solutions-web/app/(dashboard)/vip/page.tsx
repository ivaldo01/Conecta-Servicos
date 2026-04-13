'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Topbar from '@/components/layout/Topbar';
import { Check, Star, Zap, Shield, Crown, TrendingUp, Users, Info, Loader2 } from 'lucide-react';
import '@/styles/vip.css';

// ============================================================
// ESTRUTURA DE DADOS (ESPELHADA DO MOBILE)
// ============================================================
const PLANS = {
  PROFESSIONAL: [
    {
      id: 'pro_iniciante',
      name: 'Plano Iniciante',
      price: 0,
      badge: 'Básico',
      icon: <Zap size={24} />,
      color: '#94A3B8',
      features: [
        'Cadastro gratuito na plataforma',
        'Receber agendamentos ilimitados',
        'Perfil público básico',
        'Sistema de agendamento completo',
        'Pagamentos via Pix e Cartão',
        'Taxa de 10% por serviço concluído',
        'Taxa de R$ 2,00 por saque',
        'Anúncios visíveis no app',
      ],
      cta: 'Plano Atual'
    },
    {
      id: 'pro_profissional',
      name: 'Plano Profissional',
      price: 49.90,
      badge: 'Popular',
      icon: <Star size={24} />,
      color: '#3B82F6',
      popular: true,
      features: [
        'Remoção completa de anúncios',
        'Até 3 funcionários/colaboradores',
        'Taxa reduzida: 8% por serviço',
        'Selo "Profissional Verificado"',
        'Destaque nas pesquisas',
        'Taxa de saque: R$ 1,50',
        'Até 20 serviços cadastrados',
        'Galeria de fotos ilimitada',
        'Suporte por chat (24h)',
      ],
      cta: 'Assinar Agora'
    },
    {
      id: 'pro_empresa',
      name: 'Plano Empresa',
      price: 79.90,
      badge: 'Business',
      icon: <Shield size={24} />,
      color: '#8B5CF6',
      features: [
        'TUDO do Plano Profissional',
        'Taxa reduzida: 6% por serviço',
        'Até 10 funcionários/colaboradores',
        'Taxa de saque: apenas R$ 1,00',
        'Relatórios avançados de faturamento',
        'Controle financeiro por profissional',
        'Agenda unificada da equipe',
        'Dashboard de gestão avançado',
        'Suporte prioritário',
      ],
      cta: 'Fazer Upgrade'
    },
    {
      id: 'pro_franquia',
      name: 'Plano Franquia',
      price: 199.90,
      badge: 'Elite',
      icon: <Crown size={24} />,
      color: '#F59E0B',
      features: [
        'TUDO dos planos anteriores',
        'Taxa mínima: 5% por serviço',
        'Saque ZERO - sem taxas',
        'Funcionários ilimitados',
        'Prioridade máxima no suporte',
        'Sempre no topo das pesquisas',
        'Painel administrativo master',
        'API de integração disponível',
        'Treinamentos mensais incluídos',
      ],
      cta: 'Seja Elite'
    }
  ],
  CLIENT: [
    {
      id: 'client_free',
      name: 'Standard',
      price: 0,
      badge: 'Free',
      icon: <Zap size={24} />,
      color: '#94A3B8',
      features: [
        'Busca de todos os profissionais',
        'Agendamentos ilimitados',
        'Histórico completo de serviços',
        'Avaliações de profissionais',
        'Anúncios entre os resultados'
      ],
      cta: 'Plano Atual'
    },
    {
      id: 'client_premium',
      name: 'Conecta VIP',
      price: 14.90,
      badge: 'Recomendado',
      icon: <Crown size={24} />,
      color: '#EC4899',
      popular: true,
      features: [
        'Agendamentos SEM anúncios',
        'Cashback Enterprise exclusivo',
        'Acesso antecipado a novos experts',
        'Descontos exclusivos em parceiros',
        'Selo de Cliente VIP no perfil',
        'Suporte prioritário Conecta',
        'Prioridade na lista de espera'
      ],
      cta: 'Ser VIP Agora'
    }
  ]
};

export default function VIPPage() {
  const { dadosUsuario, ehProfissional } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const planosExibidos = ehProfissional ? PLANS.PROFESSIONAL : PLANS.CLIENT;
  const planoAtualId = dadosUsuario?.planoAtivo || (ehProfissional ? 'pro_iniciante' : 'client_free');

  const handleAssignPlan = async (planoId: string) => {
    if (!dadosUsuario?.uid) return;
    setLoading(planoId);
    
    try {
      const userRef = doc(db, 'usuarios', dadosUsuario.uid);
      await updateDoc(userRef, {
        planoAtivo: planoId,
        dataUpdatePlano: new Date().toISOString()
      });
      alert('Plano atualizado com sucesso! Sincronizado com seu app mobile.');
    } catch (error) {
      console.error('[VIP] Erro ao atualizar plano:', error);
      alert('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="vip-page-premium">
      {/* ELEMENTOS DE ANIMAÇÃO DE FUNDO — MOVIDOS PARA A RAIZ */}
      <div className="bg-animation-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <Topbar title="Plano & Assinatura" subtitle="Escolha o nível de excelência do seu perfil" />

      <div className="vip-container-premium">

        <header className="vip-hero-section">
          <div className="vip-hero-badge">CONECTA SOLUTIONS PREMIUM</div>
          <h1 className="vip-hero-title">
            {ehProfissional ? (
              <>O Próximo Nível da sua <span>Carreira</span></>
            ) : (
              <>A Maneira mais Inteligente de <span>Contratar</span></>
            )}
          </h1>
          <p className="vip-hero-subtitle">
            {ehProfissional 
              ? 'Gerencie seu negócio com ferramentas de elite, taxas reduzidas e destaque máximo no marketplace.'
              : 'Tenha acesso a cashbacks exclusivos, suporte prioritário e navegação sem anúncios.'
            }
          </p>
        </header>

        {/* CARD DE PROMOÇÃO DE LANÇAMENTO */}
        <div className="promo-banner-enterprise">
          <div className="promo-content">
            <div className="promo-tag">OFERTA DE LANÇAMENTO</div>
            <h2 className="promo-title">50% de DESCONTO</h2>
            <p className="promo-subtitle">Para assinaturas realizadas hoje! Válido por 3 meses.</p>
          </div>
          <div className="promo-visual">
            <div className="promo-percentage">50%</div>
            <div className="promo-off">OFF</div>
          </div>
        </div>

        <div className="plans-grid-premium">
          {planosExibidos.map((plano) => {
            const isCurrent = plano.id === planoAtualId;
            const priceWithDiscount = plano.price > 0 ? (plano.price / 2).toFixed(2).replace('.', ',') : '0,00';
            
            return (
              <div 
                key={plano.id} 
                className={`plan-card-premium ${plano.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}
              >
                {plano.popular && <div className="popular-badge">MAIS POPULAR</div>}
                
                <div className="plan-header">
                  <div className="plan-icon-wrap" style={{ backgroundColor: `${plano.color}20`, color: plano.color }}>
                    {plano.icon}
                  </div>
                  <div className="plan-header-info">
                    <span className="plan-badge-type" style={{ color: plano.color }}>{plano.badge}</span>
                    <h3 className="plan-name-premium">{plano.name}</h3>
                  </div>
                </div>

                <div className="plan-pricing">
                  {plano.price > 0 && (
                    <div className="price-discount-wrap">
                      <span className="old-price">R$ {plano.price.toFixed(2).replace('.', ',')}</span>
                      <div className="new-price-row">
                        <span className="currency">R$</span>
                        <span className="price-value">{priceWithDiscount}</span>
                        <span className="period">/mês*</span>
                      </div>
                    </div>
                  )}
                  {plano.price === 0 && (
                    <div className="new-price-row">
                      <span className="price-value">Grátis</span>
                    </div>
                  )}
                </div>

                <ul className="plan-features-list">
                  {plano.features.map((feature, idx) => (
                    <li key={idx}>
                      <div className="check-icon-premium">
                        <Check size={14} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  className={`btn-plan-action ${isCurrent ? 'current' : ''} ${plano.popular ? 'popular' : ''}`}
                  disabled={isCurrent || loading === plano.id}
                  onClick={() => handleAssignPlan(plano.id)}
                  style={!plano.popular && !isCurrent ? { borderColor: plano.color, color: plano.color } : {}}
                >
                  {loading === plano.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isCurrent ? (
                    <><Check size={18} /> Plano Ativo</>
                  ) : (
                    plano.cta
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <section className="vip-info-footer">
          <div className="info-box-premium">
            <Info size={20} />
            <p>
              *Após os 3 primeiros meses, o valor voltará ao preço original da plataforma. 
              {ehProfissional && ' Taxas de serviço reduzidas continuam vigentes durante todo o período da assinatura.'}
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
