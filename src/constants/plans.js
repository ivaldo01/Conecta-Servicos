// Planos de assinatura atualizados - Novo Modelo de Taxas
export const PLANS = {
  PROFESSIONAL: {
    // Plano Iniciante (Gratuito)
    INICIANTE: {
      id: 'pro_iniciante',
      name: 'Plano Iniciante',
      price: 0,
      serviceFee: 0.10, // 10% de taxa sobre serviços
      withdrawalFee: 2.00, // R$ 2,00 por saque
      maxEmployees: 0, // Não pode cadastrar funcionários
      ads: true,
      verifiedBadge: false,
      searchPriority: 0, // Último nas buscas
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
      limitations: [
        'Não pode cadastrar funcionários/colaboradores',
        'Sem selo de verificação',
        'Sem destaque nas buscas',
        'Perfil aparece após os pagos',
      ]
    },
    // Plano Profissional
    PROFISSIONAL: {
      id: 'pro_profissional',
      name: 'Plano Profissional',
      price: 49.90,
      serviceFee: 0.08, // 8% de taxa sobre serviços
      withdrawalFee: 1.50, // R$ 1,50 por saque
      maxEmployees: 3, // Até 3 funcionários
      ads: false,
      verifiedBadge: true,
      searchPriority: 1, // Destaque nas buscas
      features: [
        'Remoção completa de anúncios',
        'Até 3 funcionários/colaboradores',
        'Taxa de 8% por serviço realizado',
        'Selo "Profissional Verificado" no perfil',
        'Destaque nas pesquisas',
        'Taxa de saque: apenas R$ 1,50',
        'Até 20 serviços cadastrados',
        'Galeria de fotos ilimitada',
        'Estatísticas de visitas ao perfil',
        'Link direto para WhatsApp',
        'Suporte por chat (24h)',
        'Funcionários com selo verificado e sem anúncios',
      ]
    },
    // Plano Empresa
    EMPRESA: {
      id: 'pro_empresa',
      name: 'Plano Empresa',
      price: 79.90,
      serviceFee: 0.06, // 6% de taxa sobre serviços
      withdrawalFee: 1.00, // R$ 1,00 por saque
      maxEmployees: 10, // Até 10 funcionários
      ads: false,
      verifiedBadge: true,
      searchPriority: 2, // Mais destaque
      features: [
        'TUDO do Plano Profissional',
        'Taxa de 6% por serviço realizado',
        'Até 10 funcionários/colaboradores',
        'Taxa de saque: apenas R$ 1,00',
        'Relatórios avançados de faturamento',
        'Controle financeiro por profissional',
        'Agenda unificada da equipe',
        'Dashboard de gestão',
        'Selo verificado para todos os funcionários',
        'Todos sem anúncios',
        'Suporte telefônico prioritário',
      ]
    },
    // Plano Franquia
    FRANQUIA: {
      id: 'pro_franquia',
      name: 'Plano Franquia',
      price: 199.90,
      serviceFee: 0.05, // 5% de taxa sobre serviços (mínima)
      withdrawalFee: 0, // Saque ZERO - sem taxa
      maxEmployees: Infinity, // Funcionários ilimitados
      ads: false,
      verifiedBadge: true,
      searchPriority: 3, // Topo sempre
      features: [
        'TUDO dos planos anteriores',
        'Taxa mínima: 5% por serviço realizado',
        'Saque ZERO - sem taxa de transferência',
        'Funcionários ilimitados',
        'Prioridade máxima no suporte (atendimento imediato)',
        'Sempre no topo das pesquisas',
        'Painel administrativo master',
        'Relatórios consolidados de todas as unidades',
        'API de integração disponível',
        'Sucesso do cliente dedicado',
        'Treinamentos mensais para equipe',
        'Marketing automático incluso',
        'Todos os funcionários verificados e sem anúncios',
      ]
    }
  },
  CLIENT: {
    FREE: {
      id: 'client_free',
      name: 'Cliente Standard',
      price: 0,
      ads: true,
      features: [
        'Busca de todos os profissionais',
        'Agendamentos ilimitados',
        'Histórico completo de serviços',
        'Avaliações de profissionais',
        'Anúncios entre os resultados'
      ]
    },
    PREMIUM: {
      id: 'client_premium',
      name: 'Conecta Solutions VIP',
      price: 14.90,
      ads: false,
      features: [
        'Agendamentos ilimitados (Sem anúncios)',
        'Cashback Enterprise: Ganhe bônus em serviços',
        'Acesso antecipado a novos profissionais',
        'Descontos exclusivos em parceiros selecionados',
        'Selo de Cliente VIP no chat',
        'Suporte prioritário Conecta',
        'Sem anúncios durante a navegação'
      ]
    }
  }
};

// Helper functions para planos
export function getPlanoProfissional(planoId) {
  const planos = PLANS.PROFESSIONAL;
  return Object.values(planos).find(p => p.id === planoId) || planos.INICIANTE;
}

export function getTaxaServico(planoId) {
  const plano = getPlanoProfissional(planoId);
  return plano?.serviceFee || 0.10;
}

export function getTaxaSaque(planoId) {
  const plano = getPlanoProfissional(planoId);
  return plano?.withdrawalFee || 2.00;
}

export function getMaxFuncionarios(planoId) {
  const plano = getPlanoProfissional(planoId);
  return plano?.maxEmployees || 0;
}

export function podeCadastrarFuncionario(planoId, quantidadeAtual) {
  const max = getMaxFuncionarios(planoId);
  if (max === Infinity) return true;
  return quantidadeAtual < max;
}

export function temAnuncios(planoId) {
  const plano = getPlanoProfissional(planoId);
  return plano?.ads !== false;
}

export function temSeloVerificado(planoId) {
  if (planoId === 'client_premium' || planoId === 'conecta_vip') return true;
  const plano = getPlanoProfissional(planoId);
  return plano?.verifiedBadge === true;
}

export function getPrioridadeBusca(planoId) {
  const plano = getPlanoProfissional(planoId);
  return plano?.searchPriority || 0;
}
