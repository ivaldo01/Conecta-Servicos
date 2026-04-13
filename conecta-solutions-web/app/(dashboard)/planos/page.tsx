'use client';

import Topbar from '@/components/layout/Topbar';
import { Star, Zap, Shield, Check, Crown, Award } from 'lucide-react';
import '@/styles/planos.css';

const BENEFICIOS = [
  'Prioridade no agendamento com profissionais VIP',
  'Descontos exclusivos em serviços selecionados',
  'Cashback em todas as transações',
  'Acesso antecipado a novas agendas e horários',
  'Suporte prioritário e personalizado',
];

export default function PlanosPage() {
  return (
    <div className="planos-page">
      <Topbar title="Plano VIP" subtitle="Assine e tenha benefícios exclusivos em toda a rede" />

      <div className="planos-body">
        
        {/* Banner de Destaque */}
        <div className="planos-hero">
          <div className="planos-hero-content">
            <Crown size={40} className="crown-icon" />
            <h2>Seja um cliente Premium</h2>
            <p>Economize em todos os seus agendamentos e tenha experiências exclusivas.</p>
          </div>
        </div>

        <div className="planos-grid">
          {/* Card Plano Free */}
          <div className="plano-card">
            <div className="plano-header">
              <span className="plano-tag">Atual</span>
              <h3>Plano Free</h3>
              <p className="plano-preco">R$ 0,00<span>/mês</span></p>
            </div>
            <div className="plano-lista">
              <div className="plano-item active"><Check size={16} /> Agendamento simplificado</div>
              <div className="plano-item active"><Check size={16} /> Histórico de serviços</div>
              <div className="plano-item disabled"><Check size={16} /> Sem descontos exclusivos</div>
              <div className="plano-item disabled"><Check size={16} /> Suporte padrão</div>
            </div>
          </div>

          {/* Card Plano VIP (Destaque) */}
          <div className="plano-card plano-card--vip">
            <div className="plano-header">
              <span className="plano-tag plano-tag--vip">Recomendado</span>
              <h3>Pacote VIP Gold</h3>
              <p className="plano-preco">R$ 49,90<span>/mês</span></p>
            </div>
            <div className="plano-lista">
              {BENEFICIOS.map((b, i) => (
                <div key={i} className="plano-item active">
                  <Award size={16} /> {b}
                </div>
              ))}
            </div>
            <button className="btn-vip">Assinar Agora</button>
          </div>

          {/* Card Informação */}
          <div className="plano-info-box">
            <div className="info-item">
              <Zap size={24} />
              <h4>Ativação Instantânea</h4>
              <p>Os benefícios são liberados logo após a confirmação do pagamento.</p>
            </div>
            <div className="info-item">
              <Shield size={24} />
              <h4>Cancelamento Flexível</h4>
              <p>Cancele sua assinatura a qualquer momento sem taxas de fidelidade.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
