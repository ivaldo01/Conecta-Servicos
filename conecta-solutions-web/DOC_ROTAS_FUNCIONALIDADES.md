# 📋 Dossiê de Rotas & Funcionalidades - Conecta Solutions

## 🎖️ QUARTEL GENERAL (Painel Administrativo)
Acesso exclusivo para **Comandante Ivaldo** - controle total da plataforma.

---

### `/admin` - Visão Geral (Dashboard Admin)
**O que faz:** Painel central de comando com métricas globais da plataforma

**Aparece para Admin (Você):**
- Cards com KPIs: Profissionais Ativos, Clientes na Base, Arrecadação, Verificações Pendentes
- Gráfico de evolução de agendamentos
- Lista de atividades recentes em tempo real
- Ações rápidas: Cadastrar Staff, Abrir Suporte, Relatórios, Alertas

**Aparece para Usuário:** ❌ Não acessível (redireciona para dashboard próprio)

**Funcionalidades:**
- Visualização em tempo real de todos os dados da plataforma
- Acesso imediato às principais ações administrativas
- Monitoramento de crescimento e métricas de negócio

---

### `/admin/suporte` - Suporte Master 💬
**O que faz:** Central de atendimento para conversar com qualquer usuário da plataforma

**Aparece para Admin (Você):**
- Lista de todos os tickets de suporte (esquerda)
- Indicador de mensagens não lidas por usuário
- Prioridade dos tickets (Baixa, Média, Alta, Urgente)
- Chat em tempo real com cada usuário (direita)
- Filtros por: status (aberto/em atendimento/resolvido), tipo de usuário (cliente/profissional)
- Botões para alterar status do ticket

**Aparece para Usuário (Cliente/Profissional):**
- Botão "Suporte" no menu inferior do app/mobile
- Tela de chat 1:1 com o administrador
- Envio de mensagens de texto
- Envio de anexos (fotos/documentos)
- Som de notificação quando admin responde
- Badge de mensagens não lidas

**Funcionalidades:**
- Chat bidirecional em tempo real (Firebase onSnapshot)
- Notificações push quando há nova mensagem
- Histórico persistente de conversas
- Upload de arquivos para comprovações
- Sistema de prioridade de atendimento
- Marcação de tickets como "Resolvido"

---

### `/admin/financeiro` - Faturamento Global 💰
**O que faz:** Gestão completa de todas as transações financeiras da plataforma

**Aparece para Admin (Você):**
- KPIs: Total Recebido, Total Pago, Pendente, Transações Hoje
- Tabela com todas as transações:
  - Data, Usuário, Tipo (recebimento/pagamento/taxa)
  - Descrição, Método (PIX/Cartão/Boleto)
  - Valor, Status (Confirmado/Pendente/Cancelado)
- Filtros por período e status
- Botões para confirmar/cancelar transações pendentes
- Exportação de relatório

**Aparece para Usuário (Profissional):**
- `/admin/financeiro` - Tela própria do profissional
- Lista de seus agendamentos pagos
- Valor bruto vs taxa da plataforma vs valor líquido
- Status de pagamento (Pendente/Confirmado)
- Botão para sacar dinheiro

**Aparece para Usuário (Cliente):**
- `/dashboard` - Histórico de pagamentos nos detalhes do agendamento
- Comprovante de pagamento
- Status: Aguardando pagamento / Pago / Cancelado

**Funcionalidades:**
- Integração com gateway Asaas (PIX/Cartão)
- Cálculo automático de taxas por plano do profissional
- Saque para profissionais (PIX)
- Geração de relatórios financeiros
- Conciliação de pagamentos

---

### `/admin/campanhas` - Marketing & Notificações 📢
**O que faz:** Enviar comunicações em massa para usuários

**Aparece para Admin (Você):**
- Lista de campanhas criadas (rascunho/agendada/enviada)
- KPIs: Total campanhas, Enviadas, Agendadas, Taxa de abertura
- Botão "Nova Campanha"
- Formulário com:
  - Título e mensagem
  - Tipo: Push / E-mail / SMS / Todos
  - Segmento: Todos / Clientes / Profissionais / Inativos / VIP
  - Agendamento (opcional)
- Estatísticas de envio (enviados, abertos, taxa de clique)

**Aparece para Usuário:**
- **Push Notification:** Aparece na barra de notificações do celular
- **E-mail:** Chega na caixa de entrada do e-mail cadastrado
- **SMS:** Mensagem no celular (se habilitado)
- Todas aparecem também em `/notificacoes` no app

**Funcionalidades:**
- Segmentação de público-alvo
- Agendamento de envios
- Templates de mensagens
- Analytics de engajamento (abertura, cliques)
- Histórico de todas as campanhas enviadas

---

### `/admin/equipe` - Gestão Administrativa 👥
**O que faz:** Adicionar/remover membros da equipe administrativa

**Aparece para Admin (Você):**
- Cards dos membros da equipe com:
  - Foto, nome, cargo
  - Status (Ativo/Inativo/Férias)
  - Permissões (array de strings)
  - Último acesso
- Botão "Novo Membro"
- Formulário: Nome, E-mail, Telefone, Cargo, Permissões
- Botões: Ativar/Inativar, Excluir

**Aparece para Usuário:** ❌ Não acessível

**Funcionalidades:**
- Hierarquia de cargos: Admin > Supervisor > Suporte/Financeiro/Marketing
- Controle de permissões granular
- Log de atividades por membro
- Notificação de novo acesso

---

### `/admin/ajustes` - Configurações do Sistema ⚙️
**O que faz:** Parâmetros globais da plataforma

**Aparece para Admin (Você):**
Menu com abas:
1. **Geral:** Nome da plataforma, e-mail/telefone de suporte, timezone, idioma
2. **Notificações:** Ativar/desativar canais (e-mail, push, SMS)
3. **Pagamentos:** Gateway padrão (Asaas/MercadoPago), taxa de serviço (%), moeda
4. **Segurança:** 2FA obrigatório, timeout de sessão, tentativas de login

**Aparece para Usuário:** ❌ Não acessível (mas afeta a experiência deles)

**Funcionalidades:**
- Personalização da marca
- Configuração de taxas e comissões
- Políticas de segurança
- Integrações com gateways de pagamento

---

## 👤 ÁREA DO CLIENTE

### `/dashboard` - Home do Cliente 🏠
**O que faz:** Central do cliente para gerenciar seus agendamentos

**Aparece para Cliente:**
- **Topo:**
  - Saudação personalizada "Bom dia, [Nome]"
  - Avatar com foto de perfil
  - Ícone de notificações com badge
- **Próximos Agendamentos:**
  - Cards com: Profissional, serviço, data/hora, status
  - Botão "Ver Detalhes"
- **Acesso Rápido:**
  - "Novo Agendamento" (botão principal)
  - "Buscar Profissionais"
  - "Meus Favoritos"
  - "Histórico"
- **Feed de Atividades:** Últimos agendamentos e avaliações pendentes

**Funcionalidades:**
- Visualização de agendamentos futuros e passados
- Status em tempo real (Solicitado → Confirmado → Em Andamento → Concluído)
- Botão de cancelamento (até 24h antes)
- Pagamento integrado (PIX/Cartão)
- Avaliação após conclusão (1-5 estrelas + comentário)

---

### `/busca` - Buscar Profissionais 🔍
**O que faz:** Marketplace para encontrar profissionais

**Aparece para Cliente:**
- **Filtros:**
  - Categoria (Cabelereiro, Manicure, etc.)
  - Localização (CEP/Bairro)
  - Preço mín/máx
  - Avaliação (4+ estrelas)
  - Disponibilidade de horário
- **Lista de Profissionais:**
  - Card com: Foto, nome, categoria, avaliação (estrelas), preço médio
  - Badge "Verificado" (selo azul)
  - Badge "Disponível Hoje"
  - Botão "Ver Perfil"
- **Mapa:** Visualização geográfica dos profissionais próximos

**Funcionalidades:**
- Busca inteligente com autocomplete
- Ordenação: Mais próximos, Melhor avaliados, Menor preço
- Favoritar profissional (salva em lista)
- Comparar profissionais lado a lado

---

### `/perfil-profissional/[id]` - Perfil do Profissional 👤
**O que faz:** Página pública do profissional (visualização antes de agendar)

**Aparece para Cliente:**
- **Header:**
  - Foto de capa e avatar
  - Nome, categoria, selo de verificação
  - Avaliação média (estrelas) + total de avaliações
  - Botão "Favoritar" (coração)
- **Informações:**
  - Bio/Descrição dos serviços
  - Endereço completo com mapa
  - Horário de funcionamento
  - Galeria de fotos (trabalhos anteriores)
- **Serviços:**
  - Lista com: Nome do serviço, descrição, duração, preço
  - Botão "Agendar" em cada serviço
- **Avaliações:**
  - Comentários de clientes anteriores
  - Fotos dos resultados
  - Resposta do profissional

**Funcionalidades:**
- Compartilhar perfil (link/WhatsApp)
- Reportar perfil
- Verificar disponibilidade de horários
- Iniciar chat com profissional (antes de agendar)

---

### `/agendamentos` - Meus Agendamentos 📅
**O que faz:** Lista completa de todos os agendamentos do cliente

**Aparece para Cliente:**
- **Abas:**
  - "Próximos" (futuros)
  - "Concluídos" (passados)
  - "Cancelados"
- **Lista:**
  - Card com: Profissional (foto+nome), serviço, data/hora, valor, status
  - Badge de status colorido
  - Botão "Detalhes" / "Avaliar" (se concluído)
- **Filtros:** Por data, por profissional, por serviço

**Funcionalidades:**
- Reagendamento (mudar data/hora)
- Cancelamento com política de reembolso
- Download de comprovante
- Adicionar ao calendário do celular

---

### `/agendamentos/[id]` - Detalhes do Agendamento 🔍
**O que faz:** Visualização completa de um agendamento específico

**Aparece para Cliente:**
- **Timeline de Progresso:**
  - Etapas: Solicitado → Confirmado → Em Andamento → Concluído
  - Barra de progresso visual
- **Informações:**
  - Profissional (foto, nome, telefone, WhatsApp)
  - Serviço contratado
  - Data/hora (com botão para adicionar ao calendário)
  - Endereço com botão "Abrir no Maps"
- **Pagamento:**
  - Valor total
  - Status: Aguardando pagamento / Pago
  - Botão "Pagar Agora" (gera PIX)
  - QR Code e Código PIX
- **Ações:**
  - "Entrar em Contato" (WhatsApp)
  - "Cancelar Agendamento"
  - "Reagendar"
  - "Adicionar aos Favoritos"

**Funcionalidades:**
- Chat direto com profissional
- Pagamento seguro via Asaas
- Notificações de lembrete (24h antes, 1h antes)
- Avaliação pós-serviço

---

### `/favoritos` - Profissionais Favoritos ⭐
**O que faz:** Lista de profissionais salvos pelo cliente

**Aparece para Cliente:**
- Grid de cards com profissionais favoritados
- Foto, nome, categoria, avaliação
- Botão "Remover dos Favoritos" (coração preenchido)
- Botão "Agendar"
- Seção "Recomendados" (baseado nos favoritos)

**Funcionalidades:**
- Sincronização entre dispositivos
- Notificações quando profissional favorito tem disponibilidade
- Sugestões inteligentes baseadas no histórico

---

### `/avaliacoes` - Minhas Avaliações ⭐
**O que faz:** Histórico de avaliações feitas pelo cliente

**Aparece para Cliente:**
- Lista de avaliações já feitas
- Card com: Profissional, serviço, nota (estrelas), comentário, data
- Botão "Editar Avaliação" (até 7 dias)
- Seção "Avaliações Pendentes" (agendamentos concluídos não avaliados)

**Funcionalidades:**
- Sistema de 5 estrelas
- Upload de foto do resultado
- Comentário obrigatório
- Resposta do profissional visível

---

### `/planos` - Planos Recorrentes 💳
**O que faz:** Assinaturas mensais de serviços

**Aparece para Cliente:**
- Lista de planos disponíveis:
  - Cabelo (corte + hidratação mensal)
  - Unha (manutenção semanal)
  - Barba (semanal)
- Card com: Nome, descrição, valor mensal, economia vs avulso
- Botão "Assinar Plano"
- Seção "Meus Planos Ativos":
  - Plano atual, próxima cobrança, histórico
  - Botão "Pausar" ou "Cancelar"

**Funcionalidades:**
- Cobrança recorrente automática
- Agendamento facilitado (horário fixo)
- Desconto progressivo
- Fidelidade com recompensas

---

### `/perfil` - Meu Perfil 👤
**O que faz:** Configurações da conta do cliente

**Aparece para Cliente:**
- **Informações Pessoais:**
  - Foto de perfil (upload)
  - Nome, E-mail, Telefone, CPF
  - Data de nascimento
- **Endereços:**
  - Lista de endereços salvos
  - Botão "Adicionar Novo"
  - Endereço padrão
- **Preferências:**
  - Notificações (Push/E-mail/SMS)
  - Idioma
  - Tema (Dark/Light)
- **Segurança:**
  - Alterar senha
  - Autenticação de dois fatores
- **Pagamento:**
  - Cartões salvos
  - Histórico de faturas

**Funcionalidades:**
- Edição completa do perfil
- Múltiplos endereços (casa, trabalho)
- Gerenciamento de métodos de pagamento
- Exportar dados pessoais (GDPR)
- Excluir conta

---

## 💼 ÁREA DO PROFISSIONAL

### `/dashboard` - Home do Profissional 🏠
**O que faz:** Central do profissional para gerenciar sua agenda

**Aparece para Profissional:**
- **Visão Geral:**
  - Total de agendamentos hoje
  - Receita do dia
  - Taxa de ocupação da agenda
  - Novas solicitações pendentes
- **Agenda do Dia:**
  - Lista de clientes (horário, nome, serviço, status)
  - Botões: Confirmar, Iniciar, Concluir, Cancelar
- **Ações Rápidas:**
  - "Ver Agenda Completa"
  - "Meus Serviços"
  - "Financeiro"
  - "Editar Perfil"
- **Notificações:** Novas solicitações, avaliações recebidas

**Funcionalidades:**
- Controle total da agenda
- Confirmação/rejeição de agendamentos
- Iniciar/finalizar atendimento (tempo real)
- Visualização de métricas de desempenho

---

### `/agenda` - Minha Agenda 📅
**O que faz:** Visualização completa da agenda em grade/calendário

**Aparece para Profissional:**
- **Calendário Mensal:**
  - Dias com agendamentos destacados
  - Cores por status (verde=confirmado, amarelo=pendente)
- **Visão Diária (Grade):**
  - Colunas de horários (09:00, 10:00, etc.)
  - Slots vazios disponíveis para agendamento
  - Slots ocupados com nome do cliente e serviço
- **Lista de Agendamentos:**
  - Filtros: Hoje, Amanhã, Semana, Mês
  - Status: Pendente, Confirmado, Concluído, Cancelado

**Funcionalidades:**
- Configurar horários de funcionamento
- Definir dias de folga
- Bloquear horários específicos
- Sincronização com Google Calendar/Outlook
- Compartilhar disponibilidade (link público)

---

### `/admin/servicos` - Meus Serviços ✂️
**O que faz:** Gerenciamento de serviços oferecidos

**Aparece para Profissional:**
- Lista de serviços com:
  - Nome, descrição, duração, preço
  - Foto ilustrativa
  - Status (Ativo/Inativo)
- Botão "Novo Serviço"
- Formulário:
  - Nome do serviço
  - Descrição detalhada
  - Categoria (Cabelo, Barba, etc.)
  - Duração estimada
  - Preço
  - Foto

**Funcionalidades:**
- Categorização de serviços
- Definição de tempo de duração (afeta slots da agenda)
- Preços variados por serviço
- Promoções/descontos
- Pacotes (combinação de serviços)

---

### `/admin/financeiro` - Financeiro 💰
**O que faz:** Gestão financeira do profissional

**Aparece para Profissional:**
- **Saldo:**
  - Disponível para saque
  - A receber (agendamentos futuros confirmados)
  - Total já sacado
- **Extrato:**
  - Lista de transações
  - Tipo: Recebimento de cliente, Taxa da plataforma, Saque
  - Data, valor, status
- **Saque:**
  - Botão "Sacar Dinheiro"
  - Formulário: Valor, Chave PIX
  - Confirmação de saque
- **Relatórios:**
  - Gráfico de faturamento por período
  - Top serviços mais vendidos
  - Ticket médio
  - Clientes recorrentes

**Funcionalidades:**
- Saque via PIX (automático ou manual)
- Relatórios detalhados de receita
- Controle de taxas e comissões
- Previsão de receita (agendamentos futuros)

---

### `/admin/equipe` - Minha Equipe 👥
**O que faz:** (Para profissionais com clínica/estúdio) Gerenciar colaboradores

**Aparece para Profissional:**
- Lista de colaboradores (funcionários)
- Foto, nome, cargo, serviços que realiza
- Agenda individual de cada colaborador
- Comissão por colaborador

**Funcionalidades:**
- Cadastro de colaboradores
- Definição de comissões (%)
- Controle de acesso (o que cada colaborador pode ver)
- Relatório de produção por colaborador

---

### `/perfil` - Perfil Profissional 👤
**O que faz:** Configurações da conta e perfil público

**Aparece para Profissional:**
- **Informações Básicas:**
  - Nome, foto de perfil, foto de capa
  - Bio/Descrição profissional
  - Categoria principal
  - Especialidades
- **Localização:**
  - Endereço do estúdio/clínica
  - Mapa
  - Complemento (sala, andar)
- **Contato:**
  - Telefone/WhatsApp
  - E-mail
  - Instagram/Facebook
- **Verificação:**
  - Status da verificação (Pendente/Aprovado)
  - Upload de documentos (CNPJ, CREA, etc.)
- **Configurações:**
  - Horários de atendimento
  - Tempo de intervalo entre agendamentos
  - Antecedência mínima para agendamento
  - Política de cancelamento

**Funcionalidades:**
- Perfil público otimizado para SEO
- Selo de verificação (aumenta credibilidade)
- Portfólio de fotos (galeria)
- Estatísticas de visualização do perfil

---

## 🔐 AUTENTICAÇÃO

### `/login` - Login 🔑
**O que faz:** Tela de entrada no sistema

**Aparece para Todos:**
- Formulário:
  - E-mail
  - Senha
  - Checkbox "Lembrar-me"
- Botão "Entrar"
- Link "Esqueci minha senha"
- Botões sociais: "Entrar com Google", "Entrar com Apple"
- Link "Criar nova conta"

**Funcionalidades:**
- Autenticação Firebase
- Recuperação de senha por e-mail
- Login social (Google/Apple)
- Manter sessão ativa
- Redirecionamento automático após login

---

### `/cadastro` - Cadastro 📝
**O que faz:** Criação de nova conta

**Aparece para Todos:**
- **Passo 1 - Escolha de Perfil:**
  - Botão grande: "Sou Cliente" vs "Sou Profissional"
- **Passo 2 - Dados Básicos:**
  - Nome completo
  - E-mail
  - Telefone
  - Senha
  - Confirmação de senha
- **Passo 3 (Profissional):**
  - Categoria de serviço
  - Nome do estabelecimento
  - Endereço
  - CPF/CNPJ
- Checkbox: "Aceito os Termos de Uso"
- Botão "Criar Conta"

**Funcionalidades:**
- Validação de e-mail (único)
- Validação de telefone (SMS opcional)
- Verificação de e-mail
- Onboarding guiado para profissionais

---

## 📊 RESUMO DE SINCRONIZAÇÃO MOBILE ↔ WEB

| Coleção Firebase | Mobile | Web | Descrição |
|-----------------|--------|-----|-----------|
| `usuarios` | ✅ | ✅ | Dados de todos os usuários (clientes e profissionais) |
| `agendamentos` | ✅ | ✅ | Todos os agendamentos da plataforma |
| `suporte/{id}/mensagens` | ✅ | ✅ | Chat de suporte - sincronizado em tempo real |
| `pagamentos` | ✅ | ✅ | Transações financeiras |
| `campanhas` | ✅ | ✅ | Campanhas de marketing |
| `equipeAdmin` | ❌ | ✅ | Gestão interna (apenas web) |
| `configuracoes` | ❌ | ✅ | Parâmetros do sistema (apenas web) |
| `servicos` | ✅ | ✅ | Catálogo de serviços dos profissionais |
| `avaliacoes` | ✅ | ✅ | Avaliações de agendamentos |
| `planosRecorrentes` | ✅ | ✅ | Planos de assinatura |

---

## 🎯 STATUS DE IMPLEMENTAÇÃO

### ✅ PRONTO (Já Funcionando):
- `/admin` - Dashboard admin
- `/admin/suporte` - Suporte Master
- `/admin/financeiro` - Faturamento
- `/admin/campanhas` - Marketing
- `/admin/equipe` - Equipe admin
- `/admin/ajustes` - Configurações
- `/dashboard` - Home cliente/profissional
- `/busca` - Buscar profissionais
- `/login` - Login
- `/cadastro` - Cadastro

### 🔄 EM DESENVOLVIMENTO:
- `/perfil-profissional/[id]` - Perfil público
- `/agendamentos/[id]` - Detalhes do agendamento
- `/perfil` - Configurações de conta

### ⏳ A FAZER:
- `/planos` - Planos recorrentes (estrutura criada, precisa de ajustes)
- `/avaliacoes` - Sistema de avaliação completo
- `/favoritos` - Favoritar profissionais

---

## 🚀 PRÓXIMOS PASSOS SUGERIDOS:

1. **Finalizar Perfil Público do Profissional** (`/perfil-profissional/[id]`)
   - Galeria de fotos
   - Sistema de avaliações visíveis
   - Compartilhamento social

2. **Implementar Agendamento Completo** (`/agendamentos/[id]`)
   - Pagamento integrado
   - Chat cliente-profissional
   - Avaliação pós-serviço

3. **Área Pública (Sem Login)**
   - Landing page
   - Busca pública de profissionais
   - Página de "Como Funciona"

4. **Notificações em Tempo Real**
   - Toast notifications
   - Badge de não lidas
   - Som de alerta

5. **Relatórios Avançados**
   - Exportação PDF/Excel
   - Gráficos interativos
   - Filtros avançados

---

*Documento criado em: 15 de Abril de 2026*
*Versão: 1.0*
*Plataforma: Conecta Solutions - Sistema de Agendamentos*
