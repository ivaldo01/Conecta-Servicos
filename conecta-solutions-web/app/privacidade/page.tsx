'use client';

import Link from 'next/link';
import '@/styles/termos.css';

const VERSAO_PRIVACIDADE = '5.0.0';
const DATA_ATUALIZACAO = '27 de Abril de 2026';

export default function PrivacidadePage() {
  return (
    <div className="termos-root">
      <div className="termos-container">
        <div className="termos-header">
          <Link href="/" className="termos-logo">
            Conecta Solutions
          </Link>
          <h1 className="termos-title">Política de Privacidade</h1>
          <p className="termos-version">
            Versão {VERSAO_PRIVACIDADE} - Última atualização: {DATA_ATUALIZACAO}
          </p>
        </div>

        <div className="termos-content">
          <section className="termos-section">
            <h2>1. Introdução</h2>
            <p>
              A <strong>Conecta Solutions</strong> valoriza sua privacidade e está comprometida 
              com a proteção dos seus dados pessoais. Esta Política de Privacidade explica 
              como coletamos, usamos, armazenamos e protegemos suas informações.
            </p>
            <p>
              Esta política está em conformidade com a <strong>Lei Geral de Proteção de Dados 
              (LGPD - Lei 13.709/2018)</strong> e outras legislações aplicáveis.
            </p>
          </section>

          <section className="termos-section">
            <h2>2. Controlador de Dados</h2>
            <ul>
              <li><strong>Razão Social:</strong> Conecta Solutions Tecnologia Ltda.</li>
              <li><strong>CNPJ:</strong> [CNPJ DA EMPRESA]</li>
              <li><strong>Endereço:</strong> Água Azul do Norte/PA - Brasil</li>
              <li><strong>E-mail:</strong> conectasolutionstec@gmail.com</li>
              <li><strong>Encarregado de Dados (DPO):</strong>conectasolutionstec@gmail.com</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>3. Dados que Coletamos</h2>
            
            <h3>3.1. Dados de Cadastro</h3>
            <ul>
              <li>Nome completo</li>
              <li>E-mail</li>
              <li>Telefone/WhatsApp</li>
              <li>CPF ou CNPJ</li>
              <li>Data de nascimento (para menores, via responsável)</li>
              <li>Foto de perfil (opcional)</li>
            </ul>

            <h3>3.2. Dados Profissionais (para Prestadores)</h3>
            <ul>
              <li>Especialidade/categoria de serviços</li>
              <li>Descrição da atividade profissional</li>
              <li>Portfólio de fotos (trabalhos realizados)</li>
              <li>Horários de atendimento</li>
              <li>Endereço comercial (opcional)</li>
              <li>Dados bancários para repasse</li>
            </ul>

            <h3>3.3. Dados de Uso</h3>
            <ul>
              <li>Histórico de agendamentos</li>
              <li>Avaliações e comentários</li>
              <li>Interações com a plataforma (cliques, buscas)</li>
              <li>Preferências de configuração</li>
              <li>Notificações recebidas e lidas</li>
            </ul>

            <h3>3.4. Dados Técnicos</h3>
            <ul>
              <li>Endereço IP</li>
              <li>Tipo de dispositivo e sistema operacional</li>
              <li>Navegador e versão</li>
              <li>Identificadores de dispositivo (push token)</li>
              <li>Logs de acesso e erros</li>
            </ul>

            <h3>3.5. Dados Financeiros</h3>
            <ul>
              <li>Histórico de transações</li>
              <li>Saldo em carteira digital</li>
              <li>Dados de cartões de crédito (tokenizados pelo gateway Asaas)</li>
              <li>Dados bancários para saque</li>
            </ul>
            <p>
              <strong>Importante:</strong> Não armazenamos números completos de cartão de crédito. 
              Esses dados são processados diretamente pelo gateway de pagamento certificado.
            </p>
          </section>

          <section className="termos-section">
            <h2>4. Como Coletamos os Dados</h2>
            <ul>
              <li><strong>Cadastro direto:</strong> Quando você cria uma conta</li>
              <li><strong>Uso da plataforma:</strong> Durante agendamentos, avaliações, chats</li>
              <li><strong>Dispositivos:</strong> Através do aplicativo móvel com suas permissões</li>
              <li><strong>Cookies:</strong> Tecnologias de rastreamento no navegador</li>
              <li><strong>Parceiros:</strong> Gateway de pagamento (para processar transações)</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>5. Finalidades do Tratamento</h2>
            <p>Utilizamos seus dados para:</p>
            
            <h3>5.1. Prestação de Serviços</h3>
            <ul>
              <li>Criar e gerenciar sua conta</li>
              <li>Facilitar agendamentos entre clientes e profissionais</li>
              <li>Processar pagamentos e repasses</li>
              <li>Enviar notificações de lembretes e confirmações</li>
            </ul>

            <h3>5.2. Melhoria da Plataforma</h3>
            <ul>
              <li>Análise de uso e performance</li>
              <li>Desenvolvimento de novos recursos</li>
              <li>Personalização da experiência do usuário</li>
              <li>Correção de bugs e problemas técnicos</li>
            </ul>

            <h3>5.3. Segurança e Compliance</h3>
            <ul>
              <li>Prevenir fraudes e atividades ilegais</li>
              <li>Verificar identidade dos usuários</li>
              <li>Cumprir obrigações legais e fiscais</li>
              <li>Guarda de registros por 5 anos (conforme legislação fiscal)</li>
            </ul>

            <h3>5.4. Comunicação</h3>
            <ul>
              <li>Notificações sobre agendamentos</li>
              <li>Atualizações da plataforma</li>
              <li>Promoções e novidades (com seu consentimento)</li>
              <li>Suporte ao cliente</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>6. Base Legal para Tratamento</h2>
            <p>Processamos seus dados com base nas seguintes hipóteses legais (art. 7º da LGPD):</p>
            <ul>
              <li><strong>Consentimento:</strong> Quando você aceita os termos e política de privacidade</li>
              <li><strong>Execução de Contrato:</strong> Para prestar os serviços contratados</li>
              <li><strong>Obrigação Legal:</strong> Cumprimento de leis fiscais, trabalhistas e consumeristas</li>
              <li><strong>Legítimo Interesse:</strong> Segurança da plataforma, prevenção a fraudes</li>
              <li><strong>Proteção do Crédito:</strong> Análise de risco em transações financeiras</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>7. Compartilhamento de Dados</h2>
            <h3>7.1. Com Quem Compartilhamos</h3>
            <ul>
              <li><strong>Entre usuários:</strong> Dados de contato entre cliente e profissional para agendamento</li>
              <li><strong>Gateway de pagamento (Asaas):</strong> Dados necessários para processar transações</li>
              <li><strong>Prestadores de serviço:</strong> Hospedagem (Firebase/Google Cloud), analytics</li>
              <li><strong>Autoridades:</strong> Quando requerido por lei ou ordem judicial</li>
            </ul>

            <h3>7.2. O Que Não Fazemos</h3>
            <ul>
              <li>Não vendemos dados pessoais</li>
              <li>Não compartilhamos dados para marketing de terceiros sem consentimento</li>
              <li>Não permitimos acesso não autorizado a dados sensíveis</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>8. Segurança da Informação</h2>
            <h3>8.1. Medidas Técnicas</h3>
            <ul>
              <li>Criptografia SSL/TLS em todas as conexões</li>
              <li>Criptografia de dados sensíveis em repouso (AES-256)</li>
              <li>Autenticação segura (Firebase Auth)</li>
              <li>Firewalls e proteção contra ataques DDoS</li>
              <li>Monitoramento contínuo de segurança</li>
            </ul>

            <h3>8.2. Medidas Administrativas</h3>
            <ul>
              <li>Política de acesso restrito aos dados</li>
              <li>Treinamento de colaboradores em privacidade</li>
              <li>Acordos de confidencialidade com parceiros</li>
              <li>Auditorias periódicas de segurança</li>
            </ul>

            <h3>8.3. Em Caso de Incidente</h3>
            <p>
              Em caso de violação de segurança que comprometa dados pessoais, 
              notificaremos a ANPD (Autoridade Nacional de Proteção de Dados) e 
              os usuários afetados no prazo legal de 72 horas.
            </p>
          </section>

          <section className="termos-section">
            <h2>9. Retenção e Exclusão de Dados</h2>
            <h3>9.1. Prazos de Retenção</h3>
            <ul>
              <li><strong>Dados de cadastro:</strong> Enquanto a conta estiver ativa + 5 anos após encerramento (obrigação fiscal)</li>
              <li><strong>Dados financeiros:</strong> 5 anos (conforme Código Tributário Nacional)</li>
              <li><strong>Logs de acesso:</strong> 6 meses</li>
              <li><strong>Cookies:</strong> Conforme configurações do navegador</li>
            </ul>

            <h3>9.2. Exclusão de Conta</h3>
            <p>
              Você pode solicitar a exclusão da sua conta a qualquer momento através 
              das configurações de perfil. A exclusão é irreversível e remove:
            </p>
            <ul>
              <li>Dados de perfil (nome, foto, bio)</li>
              <li>Histórico de buscas e preferências</li>
              <li>Tokens de autenticação</li>
            </ul>
            <p>
              <strong>Retenção obrigatória:</strong> Dados fiscais (CNPJ/CPF, valores transacionados) 
              são mantidos por 5 anos conforme legislação brasileira, mesmo após exclusão da conta.
            </p>
          </section>

          <section className="termos-section">
            <h2>10. Cookies e Tecnologias Similares</h2>
            <h3>10.1. Tipos de Cookies</h3>
            <ul>
              <li><strong>Essenciais:</strong> Necessários para funcionamento (login, sessão)</li>
              <li><strong>Funcionais:</strong> Preferências de idioma, configurações</li>
              <li><strong>Analíticos:</strong> Estatísticas de uso (Google Analytics)</li>
              <li><strong>Marketing:</strong> Publicidade direcionada (quando aplicável)</li>
            </ul>

            <h3>10.2. Gerenciamento de Cookies</h3>
            <p>
              Você pode gerenciar cookies nas configurações do seu navegador. 
              Note que desativar cookies essenciais pode comprometer o funcionamento da plataforma.
            </p>
          </section>

          <section className="termos-section">
            <h2>11. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você possui os seguintes direitos:</p>
            <ul>
              <li><strong>Acesso:</strong> Solicitar informações sobre seus dados</li>
              <li><strong>Correção:</strong> Atualizar dados incorretos ou desatualizados</li>
              <li><strong>Exclusão:</strong> Solicitar remoção dos dados (com ressalvas legais)</li>
              <li><strong>Portabilidade:</strong> Receber dados em formato estruturado</li>
              <li><strong>Revogação de consentimento:</strong> Retirar consentimento a qualquer momento</li>
              <li><strong>Oposição:</strong> Contestar tratamento baseado em legítimo interesse</li>
              <li><strong>Informação:</strong> Saber com quem seus dados são compartilhados</li>
            </ul>

            <h3>11.1. Como Exercer Seus Direitos</h3>
            <p>
              Para exercer seus direitos, envie um e-mail para{' '}
              <strong>conectasolutionstec@gmail.com</strong> com:
            </p>
            <ul>
              <li>Assunto: &apos;Solicitação LGPD - [seu nome]&apos;</li>
              <li>Descrição clara do direito que deseja exercer</li>
              <li>Documento de identificação (para verificação)</li>
            </ul>
            <p>Responderemos em até 15 dias úteis.</p>
          </section>

          <section className="termos-section">
            <h2>12. Menores de Idade</h2>
            <p>
              A plataforma é destinada a maiores de 18 anos. Menores de idade só podem 
              utilizar a plataforma através de conta de responsável legal (titular), 
              que assume toda responsabilidade pelos dados e atividades do menor.
            </p>
            <p>
              Se você é pai/mãe ou responsável e descobriu que seu filho criou uma conta 
              independente, entre em contato para remoção imediata dos dados.
            </p>
          </section>

          <section className="termos-section">
            <h2>13. Transferência Internacional</h2>
            <p>
              Alguns de nossos prestadores de serviço (ex: Firebase/Google Cloud) 
              podem armazenar dados em servidores fora do Brasil. 
              Essas transferências ocorrem com as seguintes garantias:
            </p>
            <ul>
              <li>Países com adequação de proteção de dados (Decisiones de Adequação)</li>
              <li>Cláusulas contratuais padrão (SCCs) aprovadas pela ANPD</li>
              <li>Certificações internacionais de segurança (ISO 27001, SOC 2)</li>
            </ul>
          </section>

          <section className="termos-section">
            <h2>14. Alterações na Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Alterações significativas 
              serão notificadas por e-mail ou push notification com 15 dias de antecedência. 
              Recomendamos revisar esta página regularmente.
            </p>
            <p>
              <strong>Histórico de versões:</strong>
            </p>
            <ul>
              <li>v5.0.0 - 27/04/2026: Atualização completa com LGPD</li>
              <li>v4.0.0 - 01/01/2026: Versão anterior</li>
            </ul>
          </section>

          <section className="termos-section termos-section--highlight">
            <h2>15. Contato</h2>
            <p>
              Para questões sobre privacidade e proteção de dados:
            </p>
            <ul>
              <li><strong>E-mail DPO:</strong> dpo@conectasolutions.com.br</li>
              <li><strong>E-mail geral:</strong> conectasolutionstec@gmail.com</li>
              <li><strong>ANPD:</strong> <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="termos-link">www.gov.br/anpd</a></li>
            </ul>
          </section>

          <div className="termos-footer">
            <p>
              Esta política de privacidade é parte integrante dos nossos Termos de Uso. 
              Ao utilizar a Conecta Solutions, você concorda com esta política.
            </p>
            <div className="termos-actions">
              <Link href="/termos" className="termos-btn termos-btn--secondary">
                Termos de Uso
              </Link>
              <Link href="/cadastro" className="termos-btn termos-btn--primary">
                Voltar para Cadastro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
