'use client';

import Link from 'next/link';
import '@/styles/termos.css';

const VERSAO_TERMOS = '5.0.0';
const DATA_ATUALIZACAO = '27 de Abril de 2026';

export default function TermosPage() {
  return (
    <div className="termos-root">
      <div className="termos-container">
        <div className="termos-header">
          <Link href="/" className="termos-logo">
            Conecta Solutions
          </Link>
          <h1 className="termos-title">Termos de Uso e Condições</h1>
          <p className="termos-version">
            Versão {VERSAO_TERMOS} - Última atualização: {DATA_ATUALIZACAO}
          </p>
        </div>

        <div className="termos-content">
          <section className="termos-section">
            <h2>1. Definições e Abrangência</h2>
            <p>
              Bem-vindo à <strong>Conecta Solutions</strong>. Estes Termos de Uso regem o acesso e utilização 
              da plataforma por Clientes, Profissionais e Empresas. Ao utilizar nossos serviços, você concorda 
              integralmente com os termos aqui estabelecidos.
            </p>
            <ul>
              <li><strong>Plataforma:</strong> Aplicativo móvel e web Conecta Solutions, disponível para iOS, Android e navegadores web</li>
              <li><strong>Usuário:</strong> Qualquer pessoa física ou jurídica cadastrada na plataforma</li>
              <li><strong>Cliente:</strong> Usuário que busca contratar serviços</li>
              <li><strong>Profissional:</strong> Usuário que oferece serviços (autônomo ou empresa)</li>
              <li><strong>Colaborador:</strong> Subconta vinculada a um profissional/empresa principal</li>
              <li><strong>Serviço:</strong> Atividade profissional oferecida e contratada através da plataforma</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>2. Cadastro e Elegibilidade</h2>
            <h3>2.1. Requisitos Básicos</h3>
            <ul>
              <li>Ter pelo menos 18 anos de idade ou ser emancipado legalmente</li>
              <li>Fornecer informações verídicas e atualizadas (nome, CPF/CNPJ, e-mail, telefone)</li>
              <li>Manter dados de contato sempre atualizados</li>
              <li>Possuir apenas uma conta principal (exceto colaboradores vinculados)</li>
            </ul>

            <h3>2.2. Cadastro de Dependentes (Menores)</h3>
            <p>
              Clientes podem cadastrar perfis secundários para dependentes menores de idade. 
              O titular da assume <strong>responsabilidade civil, legal e financeira total</strong> sobre 
              agendamentos, serviços prestados e uso de dados dos dependentes. O consentimento do 
              responsável é explicitamente exigido e presumido a cada agendamento.
            </p>

            <h3>2.3. Verificação de Identidade</h3>
            <p>
              A Conecta Solutions pode solicitar documentação adicional para verificação de identidade, 
              especialmente para profissionais. Contas com informações falsas ou inconsistentes serão 
              suspensas ou removidas sem aviso prévio.
            </p>
          </section>

          <section className="termos-section">
            <h2>3. Conta de Usuário e Segurança</h2>
            <h3>3.1. Credenciais de Acesso</h3>
            <ul>
              <li>O usuário é responsável por manter a confidencialidade de sua senha</li>
              <li>Notificar imediatamente a Conecta Solutions sobre uso não autorizado</li>
              <li>Não compartilhar credenciais de acesso com terceiros</li>
              <li>A plataforma pode implementar autenticação de dois fatores (2FA) opcional ou obrigatória</li>
            </ul>

            <h3>3.2. Segurança da Conta</h3>
            <p>
              Recomendamos o uso de senhas fortes (mínimo 8 caracteres, incluindo letras, números e símbolos). 
              A plataforma monitora atividades suspeitas e pode bloquear acesso temporariamente em casos 
              de tentativas de invasão.
            </p>

            <h3>3.3. Inatividade</h3>
            <p>
              Contas inativas por mais de 12 meses podem ser desativadas. Os dados serão mantidos 
              por período adicional de 5 anos para cumprimento de obrigações legais, após o que 
              serão permanentemente excluídos.
            </p>
          </section>

          <section className="termos-section">
            <h2>4. Funcionalidades da Plataforma</h2>
            <h3>4.1. Agendamentos e Gestão</h3>
            <ul>
              <li>Sistema de agendamento com horários, dias de atendimento e pausas configuráveis</li>
              <li>Check-in digital para formalizar início do atendimento</li>
              <li>Lembretes automáticos via push notification, e-mail ou WhatsApp</li>
              <li>Histórico completo de agendamentos para clientes e profissionais</li>
            </ul>

            <h3>4.2. Comunicações</h3>
            <p>
              A comunicação pode ocorrer via chat integrado ou links para WhatsApp. 
              A Conecta Solutions <strong>não tem acesso nem se responsabiliza</strong> por conversas 
              e acordos firmados fora da plataforma. Recomendamos o uso dos canais oficiais 
              para segurança e rastreabilidade.
            </p>

            <h3>4.3. Pagamentos e Financeiro</h3>
            <ul>
              <li>Processamento de pagamentos via gateway Asaas (criptografia ponta a ponta)</li>
              <li>Suporte a pagamentos avulsos e recorrentes (assinaturas)</li>
              <li>Carteira digital com saldo e histórico de transações</li>
              <li>Saques para conta bancária cadastrada</li>
            </ul>

            <h3>4.4. Avaliações e Reputação</h3>
            <p>
              Sistema de avaliações pós-atendimento (1-5 estrelas) e comentários. 
              Profissionais podem responder avaliações. A Conecta Solutions monitora 
              avaliações falsas ou spam e pode removê-las.
            </p>

            <h3>4.5. Inteligência Artificial e Machine Learning</h3>
            <p>
              A plataforma utiliza algoritmos de IA para:
            </p>
            <ul>
              <li>Recomendação de profissionais baseada em histórico e preferências</li>
              <li>Detecção de comportamentos suspeitos ou fraudulentos</li>
              <li>Otimização de horários de agendamento</li>
              <li>Análise de sentimento em avaliações (conteúdo ofensivo)</li>
            </ul>
            <p>
              <strong>Nota:</strong> Decisões automatizadas significativas (como suspensão de conta) 
              sempre passam por revisão humana.
            </p>
          </section>

          <section className="termos-section">
            <h2>5. Planos de Assinatura e Monetização</h2>
            
            <h3>5.1. Plano Essencial (Gratuito)</h3>
            <ul>
              <li>Taxa de Intermediação: <strong>10%</strong> sobre valor bruto de cada serviço</li>
              <li>Taxa de Saque: R$ 2,00 por solicitação</li>
              <li>Publicidade: Exibição de anúncios de terceiros</li>
              <li>Visibilidade padrão nos resultados de busca</li>
            </ul>

            <h3>5.2. Plano Conecta Pro (Premium)</h3>
            <ul>
              <li>Taxa de Intermediação Reduzida: <strong>5%</strong></li>
              <li>Isenção de Taxa de Saque (ilimitadas)</li>
              <li>Experiência sem anúncios</li>
              <li>Selo de Verificação Pro</li>
              <li>Destaque nos resultados de busca</li>
              <li>Relatórios financeiros avançados</li>
              <li>Suporte prioritário</li>
            </ul>

            <h3>5.3. Conecta Solutions VIP (Clientes)</h3>
            <ul>
              <li>Navegação sem anúncios</li>
              <li>Acesso antecipado a profissionais de alta performance</li>
              <li>Cashback em agendamentos selecionados</li>
              <li>Suporte prioritário</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>6. Gestão Financeira</h2>
            <h3>6.1. Processamento de Pagamentos</h3>
            <p>
              Todos os pagamentos são processados através do parceiro Asaas, garantindo 
              criptografia ponta a ponta e conformidade com regulamentações PCI DSS.
            </p>

            <h3>6.2. Repasse ao Profissional</h3>
            <p>
              Os valores creditados na conta do profissional refletem os valores após 
              dedução das taxas de intermediação vigentes para seu plano.
            </p>

            <h3>6.3. Auditoria e Compliance</h3>
            <p>
              Aplicamos políticas rigorosas contra lavagem de dinheiro. Reservamo-nos 
              o direito de: reter saques suspeitos, solicitar documentação adicional, 
              e reportar operações atípicas às autoridades competentes.
            </p>

            <h3>6.4. Reembolsos</h3>
            <ul>
              <li><strong>Política padrão:</strong> Cancelamento com 24h de antecedência = reembolso integral</li>
              <li><strong>Cancelamento tardio:</strong> Sujeito à política individual do profissional</li>
              <li><strong>No-show:</strong> Taxa pode ser retida pelo profissional</li>
              <li><strong>Disputas:</strong> A Conecta Solutions media, mas a decisão final é do profissional</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>7. Contratos e Planos Recorrentes</h2>
            <h3>7.1. Planos de Serviço Contínuo</h3>
            <p>
              Profissionais podem oferecer planos mensais de serviços. A relação contratual 
              é estabelecida diretamente entre o profissional e o cliente.
            </p>

            <h3>7.2. Pausa e Congelamento</h3>
            <p>
              Contratos podem ter mecanismos de pausa (congelamento), definidos pelo 
              profissional em suas configurações de plano.
            </p>

            <h3>7.3. Cancelamento e Multas</h3>
            <p>
              O cancelamento pode aplicar multas proporcionais se definido na oferta do plano. 
              A Conecta Solutions apenas executa as cobranças conforme configurado pelo profissional.
            </p>
          </section>

          <section className="termos-section">
            <h2>8. Conduta e Proibições</h2>
            <h3>8.1. Conduta Esperada</h3>
            <ul>
              <li>Cumprir horários agendados ou cancelar com antecedência adequada</li>
              <li>Prestar serviços com qualidade profissional e ética</li>
              <li>Respeitar a privacidade e dados dos clientes</li>
              <li>Mantar comunicação respeitosa e profissional</li>
            </ul>

            <h3>8.2. Conduta Proibida</h3>
            <p>É estritamente proibido:</p>
            <ul>
              <li><strong>Bypass de plataforma:</strong> Usar a infraestrutura para angariar serviços fora do sistema (fraude às taxas)</li>
              <li><strong>Discriminação:</strong> Negar serviços baseado em raça, gênero, religião, orientação sexual, etc.</li>
              <li><strong>Assédio:</strong> Comportamento inadequado, ameaças ou constrangimento</li>
              <li><strong>Falsidade:</strong> Informações falsas, documentos fraudulentos, avaliações fake</li>
              <li><strong>Spam:</strong> Envio não solicitado de mensagens promocionais</li>
              <li><strong>Conteúdo impróprio:</strong> Fotos, descrições ou comunicações ofensivas ou ilegais</li>
            </ul>

            <h3>8.3. Sanções</h3>
            <p>
              Infrações podem resultar em: advertência, redução de visibilidade, suspensão temporária, 
              banimento permanente, retenção de valores, e reporte às autoridades quando aplicável.
            </p>
          </section>

          <section className="termos-section">
            <h2>9. Privacidade e Proteção de Dados (LGPD)</h2>
            <p>
              Nossa política de privacidade detalhada está disponível em{' '}
              <Link href="/privacidade" className="termos-link">Política de Privacidade</Link>.
            </p>
            <ul>
              <li>Coletamos apenas dados necessários para funcionamento da plataforma</li>
              <li>Dados sensíveis são criptografados em trânsito e em repouso</li>
              <li>Não vendemos dados pessoais a terceiros</li>
              <li>Compartilhamento apenas com parceiros essenciais (gateway de pagamento)</li>
              <li>Você tem direito a acessar, corrigir e excluir seus dados</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>10. Cookies e Tecnologias de Rastreamento</h2>
            <p>
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul>
              <li>Manter sua sessão de login ativa</li>
              <li>Memorizar preferências de idioma e configurações</li>
              <li>Análise de uso e melhoria da plataforma</li>
              <li>Segurança e prevenção a fraudes</li>
            </ul>
            <p>
              Ao continuar usando a plataforma, você concorda com o uso de cookies. 
              Você pode gerenciar preferências de cookies nas configurações do navegador.
            </p>
          </section>

          <section className="termos-section">
            <h2>11. Propriedade Intelectual</h2>
            <h3>11.1. Nossa Propriedade</h3>
            <p>
              Todo software, layouts, marca, logos, e elementos da Conecta Solutions são 
              protegidos por copyright e não podem ser copiados, modificados ou distribuídos 
              sem autorização expressa.
            </p>

            <h3>11.2. Seu Conteúdo</h3>
            <p>
              Ao postar fotos, descrições ou avaliações, você concede à Conecta Solutions 
              uma licença não exclusiva para usar esse conteúdo para promover o ecossistema 
              (ex: materiais de marketing). Você mantém a propriedade do conteúdo.
            </p>
          </section>

          <section className="termos-section">
            <h2>12. Disponibilidade do Serviço</h2>
            <h3>12.1. Uptime</h3>
            <p>
              Nos esforçamos para manter a plataforma disponível 99.9% do tempo. 
              Manutenções programadas serão comunicadas com antecedência.
            </p>

            <h3>12.2. Limitações</h3>
            <p>
              A Conecta Solutions não garante que o serviço será ininterrupto, oportuno, 
              seguro ou livre de erros. Eventos de força maior (quedas de internet, 
              ataques cibernéticos) estão fora do nosso controle direto.
            </p>

            <h3>12.3. Backup de Dados</h3>
            <p>
              Realizamos backups regulares dos dados, mas recomendamos que profissionais 
              mantenham registros próprios de agendamentos e finanças.
            </p>
          </section>

          <section className="termos-section">
            <h2>13. Limitação de Responsabilidade</h2>
            <p>
              A Conecta Solutions é um provedor de software e tecnologia de pagamentos. 
              A execução física dos serviços agendados é de <strong>responsabilidade exclusiva 
              do profissional</strong>. 
            </p>
            <p>
              Não nos responsabilizamos por: danos diretos, indiretos, incidentais, 
              especiais ou consequenciais; perda de lucros ou receita; perda de dados; 
              ou danos à reputação decorrentes do uso da plataforma.
            </p>
          </section>

          <section className="termos-section">
            <h2>14. Rescisão e Encerramento</h2>
            <h3>14.1. Por Você</h3>
            <p>
              Você pode encerrar sua conta a qualquer momento através das configurações 
              de perfil. Seus dados serão excluídos conforme nossa política de retenção.
            </p>

            <h3>14.2. Por Nós</h3>
            <p>
              Podemos suspender ou encerrar contas por: violação destes termos, comportamento 
              fraudulento, inatividade prolongada, ou ordem judicial. 
              Em casos graves (estelionato, crimes), o banimento pode ser imediato sem aviso prévio.
            </p>

            <h3>14.3. Efeitos da Rescisão</h3>
            <p>
              Após rescisão: perda de acesso à plataforma, cancelamento de agendamentos pendentes, 
              saque de saldo remanescente (sujeito a taxas), e retenção de dados conforme obrigações legais.
            </p>
          </section>

          <section className="termos-section">
            <h2>15. Resolução de Conflitos</h2>
            <h3>15.1. Mediação Interna</h3>
            <p>
              Disputas entre usuários devem primeiro tentar resolução amigável. 
              A Conecta Solutions oferece canal de mediação, mas não é parte nas 
              relações contratuais entre profissionais e clientes.
            </p>

            <h3>15.2. Arbitragem</h3>
            <p>
              Casos não resolvidos por mediação podem ser submetidos à arbitragem 
              conforme regulamentação do Consumidor (Lei 9.099/95 para valores até 40 salários mínimos).
            </p>

            <h3>15.3. Foro</h3>
            <p>
              Questões judiciais serão processadas no foro da comarca de São Paulo/SP, 
              salvo quando a legislação consumidor determinar competência do domicílio do consumidor.
            </p>
          </section>

          <section className="termos-section">
            <h2>16. Modificações dos Termos</h2>
            <p>
              Alterações serão publicadas nesta página e notificadas por e-mail ou push notification. 
              Alterações significativas terão período de aviso prévio de 15 dias. 
              O uso continuado da plataforma após alterações constitui aceitação.
            </p>
          </section>

          <section className="termos-section">
            <h2>17. Disposições Gerais</h2>
            <ul>
              <li><strong>Integralidade:</strong> Estes termos constituem o acordo completo entre as partes</li>
              <li><strong>Invalidade:</strong> Se qualquer cláusula for considerada inválida, as demais permanecem em vigor</li>
              <li><strong>Cessão:</strong> Não é permitida cessão ou transferência sem consentimento</li>
              <li><strong>Legislação:</strong> Regido pelas leis da República Federativa do Brasil</li>
            </ul>
          </section>

          <section className="termos-section termos-section--highlight">
            <h2>18. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato:
            </p>
            <ul>
              <li><strong>E-mail:</strong> conectasolutionstec@gmail.com</li>
              <li><strong>Suporte:</strong> Disponível no aplicativo (Perfil &gt; Suporte)</li>
              <li><strong>Endereço:</strong> Água Azul do Norte/PA - Brasil</li>
            </ul>
          </section>

          <div className="termos-footer">
            <p>
              Ao usar a Conecta Solutions, você confirma que leu, entendeu e aceita 
              todos os termos acima.
            </p>
            <div className="termos-actions">
              <Link href="/cadastro" className="termos-btn termos-btn--primary">
                Voltar para Cadastro
              </Link>
              <Link href="/privacidade" className="termos-btn termos-btn--secondary">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
