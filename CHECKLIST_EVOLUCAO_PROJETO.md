# Checklist de Evolução — Conecta Serviços

Este documento é o backlog central e vivo do projeto. O Firebase será mantido como banco de dados, autenticação, storage, functions e infraestrutura de notificações.

## Regras de trabalho

- [ ] Nenhuma alteração será enviada ao GitHub sem testes locais e aprovação explícita do responsável pelo projeto.
- [ ] Não executar `git push`, criar Pull Request ou publicar uma versão sem autorização explícita.
- [ ] Não fazer deploy no Firebase, Vercel, Expo/EAS ou lojas sem autorização explícita.
- [ ] Antes de alterar uma funcionalidade, registrar nesta checklist o problema, o resultado esperado e as plataformas afetadas.
- [ ] Preservar alterações locais já existentes e não modificar módulos fora do escopo aprovado.
- [ ] Cada entrega deve ser testada separadamente em mobile, web e desktop quando a funcionalidade existir nessas plataformas.
- [ ] Mudanças financeiras, administrativas ou de segurança exigem teste de permissão e tentativa de acesso indevido.
- [ ] Só marcar um item como concluído depois de implementação, teste e aprovação.

## Legenda de situação

- `[ ]` Pendente
- `[~]` Em desenvolvimento ou aguardando teste
- `[x]` Testado e aprovado
- `[!]` Bloqueado ou depende de decisão

Prioridades:

- **P0 — Crítica:** risco de segurança, perda de dados ou movimentação financeira indevida.
- **P1 — Alta:** função principal quebrada ou impeditiva para uso.
- **P2 — Média:** melhoria funcional ou problema com alternativa temporária.
- **P3 — Baixa:** acabamento, organização ou melhoria futura.

---

## 1. Segurança e permissões — P0

### Firestore

- [~] Impedir que um usuário altere seus próprios campos administrativos (`isAdmin`, `role`, `tipo` e equivalentes). Implementado localmente nas regras; aguardando teste no emulador e aprovação.
- [~] Migrar a autorização administrativa para Firebase Custom Claims ou outro mecanismo controlado exclusivamente pelo backend. Suporte à claim e função segura de automigração implementados localmente; falta migrar as contas existentes, atualizar os clientes, remover a compatibilidade legada e obter aprovação.
- [~] Remover a leitura pública irrestrita da coleção `usuarios`. Implementado localmente; usuários não autenticados foram bloqueados e falta aprovação/deploy.
- [~] Criar verificação segura de CPF, CNPJ, telefone e e-mail duplicados no backend, sem expor a lista de usuários. CPF/CNPJ e telefone foram migrados para Cloud Function no mobile e web; e-mail continua protegido pelo Firebase Auth. Aguardando testes integrados e aprovação.
- [ ] Corrigir a regra que permite a qualquer autenticado excluir documentos de usuários.
- [ ] Eliminar regras duplicadas da coleção raiz `colaboradores`.
- [ ] Restringir colaboradores ao próprio profissional/clínica e ao próprio colaborador, conforme a operação.
- [ ] Restringir leitura de notificações ao dono e aos administradores autorizados.
- [ ] Restringir leitura de agendamentos aos participantes e administradores autorizados.
- [ ] Restringir criação e alteração de agendamentos, validando participantes, campos e transições de status.
- [ ] Restringir `planosRecorrentes` ao profissional responsável e clientes que precisam consultá-los.
- [ ] Restringir `contratosRecorrentes` ao cliente, profissional e backend envolvidos.
- [ ] Bloquear criação ou alteração direta indevida de `pagamentos`, `cobrancas`, `saques` e `saldos`.
- [ ] Restringir `transacoes` ao profissional relacionado e aos administradores autorizados.
- [ ] Validar os campos permitidos em cada criação e atualização com `diff().affectedKeys()`.
- [ ] Validar tipos, valores mínimos/máximos e campos obrigatórios nas regras.
- [ ] Impedir que clientes escrevam status financeiros como `pago`, `confirmado` ou `processado`.
- [ ] Restringir criação de `activityLogs` para que o `userId` seja o UID autenticado.
- [ ] Proteger a coleção `config` contra escrita arbitrária de contadores.
- [ ] Revisar regras de campanhas, anúncios, suporte e equipe administrativa.
- [ ] Criar testes automatizados das regras usando Firebase Emulator Suite.

### Firebase Storage

- [~] Remover a regra global de escrita para qualquer usuário autenticado. Bucket fechado localmente porque os uploads atuais usam Cloudinary; aguardando teste/aprovação.
- [ ] Separar caminhos por proprietário e finalidade: perfis, galeria, suporte, anúncios e documentos.
- [ ] Validar UID/proprietário em cada caminho.
- [ ] Limitar tamanho máximo dos uploads.
- [ ] Permitir somente MIME types esperados.
- [ ] Bloquear HTML, scripts, executáveis e arquivos incompatíveis.
- [ ] Definir quais arquivos podem ser públicos e quais exigem autenticação.
- [ ] Criar testes das regras de Storage no emulador.

### APIs Vercel e Firebase Admin

- [~] Criar middleware compartilhado para validar Firebase ID Token. Implementado localmente; aguardando testes HTTP e aprovação.
- [~] Criar middleware para exigir perfil administrativo. Implementado com Custom Claim `admin`; aguardando testes HTTP e aprovação.
- [~] Autenticar `createPayment` e validar acesso ao agendamento. Implementado localmente.
- [~] Autenticar `createSubscription` e obter o UID pelo token, não pelo corpo da requisição. Implementado localmente.
- [~] Autenticar `gerarPix` e validar acesso ao contrato. Implementado localmente.
- [~] Autenticar `withdraw` e impedir saque em nome de outro usuário. Implementado localmente.
- [~] Proteger `enviar-push` com permissão administrativa. Implementado localmente.
- [~] Proteger `enviar-email` com permissão administrativa. Implementado localmente.
- [~] Proteger `automatizacoes` com segredo de cron ou permissão administrativa, conforme o uso. Implementado localmente.
- [ ] Configurar allowlist de origens CORS.
- [ ] Remover a combinação inválida de origem `*` com credenciais.
- [ ] Adicionar rate limiting nas rotas sensíveis.
- [ ] Validar todos os corpos de requisição com schema.
- [ ] Evitar retornar detalhes internos de erros ao cliente.
- [ ] Revisar logs para não registrar CPF, cartão, token, chave PIX ou outros dados pessoais.
- [ ] Rotacionar segredos se houver suspeita de exposição em ambiente publicado.

---

## 2. Pagamentos, assinaturas e financeiro — P0/P1

- [ ] Centralizar preços, taxas, planos e descontos no backend.
- [ ] Nunca aceitar do cliente o valor final como fonte confiável.
- [ ] Validar valores monetários como números positivos e com precisão adequada.
- [ ] Implementar idempotência para cobranças, assinaturas, PIX, saques e webhooks.
- [ ] Impedir cobrança duplicada por clique repetido, timeout ou reenvio.
- [ ] Validar ownership antes de consultar ou movimentar saldo.
- [ ] Usar transações atômicas ao debitar e creditar saldos.
- [ ] Impedir saldo negativo e corrida entre solicitações de saque.
- [ ] Definir estados e transições válidas de pagamento, cobrança, assinatura e saque.
- [ ] Validar assinatura e conteúdo dos webhooks do Asaas.
- [ ] Registrar e deduplicar cada evento recebido do Asaas.
- [ ] Implementar reconciliação entre Asaas e Firestore.
- [ ] Tratar estorno, chargeback, cancelamento, vencimento e falha de pagamento.
- [ ] Conferir cálculo de comissão/taxa em mobile, web e backend.
- [ ] Criar histórico financeiro imutável/auditável.
- [ ] Criar testes unitários para taxas e valores.
- [ ] Criar testes de integração para pagamento PIX.
- [ ] Criar testes de integração para cartão, sem armazenar dados sensíveis.
- [ ] Criar testes de assinatura recorrente.
- [ ] Criar testes de saque e concorrência.
- [ ] Documentar operação financeira e procedimento de suporte.

---

## 3. Modelo de dados e sincronização — P1

- [ ] Inventariar todas as coleções, subcoleções e campos existentes.
- [ ] Escolher um modelo canônico para profissional, clínica, empresa e colaborador.
- [ ] Decidir entre coleção raiz e subcoleção para colaboradores.
- [ ] Padronizar identificadores como `userId`, `usuarioId`, `ownerId`, `profissionalId` e `clinicaId`.
- [ ] Padronizar nomes e valores de status.
- [ ] Padronizar timestamps usando horário do servidor.
- [ ] Definir schema e versão para cada documento importante.
- [ ] Planejar migração dos documentos antigos sem perda de dados.
- [ ] Criar script de auditoria para localizar documentos inconsistentes.
- [ ] Criar script de migração com modo de simulação antes da escrita.
- [ ] Definir política de backup e restauração do Firestore.
- [ ] Testar sincronização entre mobile e web para cada fluxo compartilhado.
- [ ] Tratar funcionamento offline e conflitos de atualização.
- [ ] Revisar índices do Firestore após padronizar as consultas.
- [ ] Documentar o modelo final de dados.

---

## 4. Mobile — telas e funcionalidades

### Base técnica

- [ ] Executar `npm ci` em ambiente limpo.
- [ ] Executar Expo Doctor e corrigir incompatibilidades.
- [ ] Criar scripts de lint, teste e validação no projeto raiz.
- [ ] Revisar configuração Android e iOS.
- [ ] Revisar permissões de localização, câmera, galeria e notificações.
- [ ] Testar aparelhos pequenos, grandes e tablets quando aplicável.
- [ ] Testar Android físico, emulador e build de produção.
- [ ] Testar estados offline, conexão lenta e reconexão.
- [ ] Criar tratamento global de erros e feedback ao usuário.
- [ ] Padronizar loading, empty state, erro e confirmação.
- [ ] Dividir telas muito extensas em componentes, hooks e serviços.
- [ ] Revisar acessibilidade, contraste, tamanho de toque e teclado.
- [ ] Revisar desempenho de listas, imagens e listeners Firestore.

### Autenticação e cadastro

- [ ] Testar login de cliente, profissional, empresa, colaborador e administrador.
- [ ] Implementar/revisar recuperação de senha.
- [ ] Implementar/revisar verificação de e-mail e telefone.
- [ ] Revisar cadastros de cliente e profissional/empresa.
- [ ] Validar CPF/CNPJ, e-mail e telefone no frontend e backend.
- [ ] Tratar conta desativada, excluída ou sem perfil completo.
- [ ] Revisar termos de uso, privacidade e consentimentos.
- [ ] Criar fluxo seguro para exclusão da conta e dados.

### Cliente

- [ ] Revisar home e busca de profissionais.
- [ ] Revisar filtros, localização, categorias e paginação.
- [ ] Revisar perfil público do profissional.
- [ ] Revisar criação de agendamento e disponibilidade.
- [ ] Impedir reserva duplicada do mesmo horário.
- [ ] Revisar detalhes, cancelamento e remarcação.
- [ ] Revisar favoritos.
- [ ] Revisar cadastro e edição de menores/dependentes.
- [ ] Revisar pagamento de agendamento.
- [ ] Revisar planos e contratos recorrentes.
- [ ] Revisar avaliações e impedir avaliação indevida ou duplicada.
- [ ] Revisar notificações e suporte.

### Profissional/empresa

- [ ] Revisar dashboard/home profissional.
- [ ] Revisar configuração de perfil, agenda e serviços.
- [ ] Revisar bloqueios, intervalos, folgas, férias e feriados.
- [ ] Revisar agenda diária, semanal e mensal.
- [ ] Revisar detalhes e mudanças de status do atendimento.
- [ ] Revisar equipe e permissões de colaboradores.
- [ ] Revisar criação e gestão de planos recorrentes.
- [ ] Revisar financeiro, extratos, taxas e saque.
- [ ] Revisar relatórios e filtros por período.
- [ ] Revisar plano Premium/VIP e limites por plano.

### Notificações e anúncios

- [ ] Revisar solicitação e renovação do token push.
- [ ] Remover tokens inválidos e duplicados.
- [ ] Testar notificações em foreground, background e app fechado.
- [ ] Testar deep links de notificações.
- [ ] Revisar banners, anúncios nativos, impressão e clique.
- [ ] Definir comportamento quando o anúncio estiver indisponível.

---

## 5. Web e desktop — telas e funcionalidades

### Base técnica

- [ ] Executar `npm ci`, lint, typecheck e build em ambiente limpo.
- [ ] Corrigir erros e avisos do Next.js 16.
- [ ] Reduzir uso desnecessário de componentes client-side.
- [ ] Padronizar componentes, formulários, modais e tabelas.
- [ ] Criar layouts responsivos para notebook, desktop e tablet.
- [ ] Revisar acessibilidade e navegação por teclado.
- [ ] Revisar SEO e metadados das páginas públicas.
- [ ] Criar tratamento global de erro, loading e páginas não encontradas.
- [ ] Revisar listeners e consultas para evitar leituras excessivas.

### Paridade funcional com o mobile

- [ ] Criar uma matriz comparando cada tela e função entre mobile e web.
- [ ] Identificar funções exclusivas do mobile que precisam existir na web.
- [ ] Identificar funções exclusivas da web que precisam existir no mobile.
- [ ] Padronizar textos, status, cálculos e validações.
- [ ] Garantir que mudanças feitas em uma plataforma apareçam corretamente na outra.
- [ ] Testar os mesmos perfis e permissões nas duas plataformas.

### Painel administrativo

- [ ] Revisar proteção de todas as rotas administrativas.
- [ ] Impedir que ocultar menu seja tratado como autorização.
- [ ] Revisar gestão de usuários e verificações.
- [ ] Revisar financeiro administrativo.
- [ ] Revisar equipe administrativa e permissões granulares.
- [ ] Revisar suporte e histórico de mensagens.
- [ ] Revisar campanhas, anunciantes, anúncios e automações.
- [ ] Revisar configurações e ajustes globais.
- [ ] Criar trilha de auditoria para ações administrativas.

### Electron/desktop

- [ ] Escolher uma única implementação Electron.
- [ ] Remover ou arquivar a implementação duplicada após aprovação.
- [ ] Atualizar o processo de export estático do Next.js.
- [ ] Revisar segurança de `main.js` e `preload.js`.
- [ ] Garantir `contextIsolation`, desabilitar `nodeIntegration` e limitar IPC.
- [ ] Testar instalação, atualização e desinstalação no Windows.
- [ ] Testar persistência de sessão e links externos.
- [ ] Definir estratégia de atualização automática.
- [ ] Gerar instalador somente após build web aprovado.

---

## 6. Backend, código compartilhado e arquitetura — P1/P2

- [ ] Criar camada compartilhada de autenticação/autorização das APIs.
- [ ] Criar schemas compartilhados para requisições e respostas.
- [ ] Centralizar constantes de planos, taxas, status e categorias.
- [ ] Evitar duplicação de regras de negócio entre mobile, web e backend.
- [ ] Separar componentes visuais, hooks, serviços e regras de negócio.
- [ ] Refatorar gradualmente arquivos maiores que 500–700 linhas.
- [ ] Padronizar erros por código e mensagem amigável.
- [ ] Padronizar logs estruturados e IDs de correlação.
- [ ] Criar documentação das APIs e seus requisitos de permissão.
- [ ] Padronizar variáveis de ambiente e criar arquivos `.env.example` sem segredos.
- [ ] Remover arquivos antigos, cópias `_NEW`, backups e exports somente depois de confirmar que não são usados.
- [ ] Revisar dependências desatualizadas e vulnerabilidades conhecidas.
- [ ] Definir política de versionamento e releases.

---

## 7. Testes e garantia de qualidade

- [ ] Definir um roteiro manual de testes por perfil.
- [ ] Criar dados de teste que não usem informações pessoais reais.
- [ ] Criar ambiente Firebase separado para desenvolvimento/testes.
- [ ] Configurar Firebase Emulator Suite para testes locais.
- [ ] Criar testes unitários dos utilitários e cálculos.
- [ ] Criar testes de integração dos serviços Firebase.
- [ ] Criar testes de regras Firestore e Storage.
- [ ] Criar testes de autenticação e autorização das APIs.
- [ ] Criar testes end-to-end dos fluxos críticos.
- [ ] Testar cadastro → busca → agendamento → pagamento → atendimento → avaliação.
- [ ] Testar profissional → agenda → atendimento → financeiro → saque.
- [ ] Testar colaborador e restrições de acesso.
- [ ] Testar administrador e tentativas de acesso por não administradores.
- [ ] Testar cancelamento, remarcação e concorrência de horários.
- [ ] Testar falhas de rede e reenvio de operações.
- [ ] Testar versões mobile, web e desktop antes de aprovação.
- [ ] Registrar evidências dos testes e problemas encontrados.

---

## 8. CI/CD, ambientes e publicação

- [ ] Criar ambientes separados: desenvolvimento, homologação e produção.
- [ ] Separar projetos/configurações Firebase por ambiente.
- [ ] Configurar segredos sem versioná-los.
- [ ] Criar CI para lint, typecheck, testes e build.
- [ ] Impedir publicação quando uma validação falhar.
- [ ] Criar checklist de release.
- [ ] Definir versão do aplicativo e changelog.
- [ ] Criar procedimento de rollback.
- [ ] Conferir backup antes de migrações de dados.
- [ ] Monitorar erros de mobile, web, functions e Vercel.
- [ ] Não publicar nem enviar ao GitHub sem aprovação explícita.

---

## 9. Privacidade, LGPD e operação

- [ ] Mapear todos os dados pessoais coletados e a finalidade.
- [ ] Minimizar exposição de CPF, CNPJ, telefone, e-mail e endereço.
- [ ] Definir prazos de retenção e exclusão.
- [ ] Implementar exportação e exclusão de dados do titular.
- [ ] Revisar termos de uso e política de privacidade.
- [ ] Registrar consentimentos necessários.
- [ ] Restringir acesso interno aos dados pessoais.
- [ ] Criar resposta a incidentes de segurança.
- [ ] Definir responsáveis por suporte, financeiro e administração.
- [ ] Criar documentação de backup e recuperação.

---

## 10. Backlog vivo de telas e funções

Use uma entrada para cada item identificado durante os testes. Não é necessário detalhar tecnicamente: basta informar o que aconteceu e o que deveria acontecer.

### Modelo de registro

```text
ID: NOVO-001
Situação: Pendente
Prioridade: P1/P2/P3
Plataforma: Mobile / Web / Desktop / Todas
Perfil: Cliente / Profissional / Colaborador / Admin
Tela ou função:
Problema atual:
Resultado esperado:
Como reproduzir:
Dependências ou observações:
Critérios de aprovação:
```

### Itens informados durante análise e testes

| ID | Prioridade | Plataforma | Perfil | Tela/função | Situação | Resumo |
|---|---|---|---|---|---|---|
| NOVO-001 | A definir | A definir | A definir | A definir | Pendente | Reservado para o próximo item informado |

---

## 11. Fluxo de entrega e aprovação

Para cada conjunto de alterações:

- [ ] Registrar o escopo e os critérios de aceite.
- [ ] Inspecionar o código relacionado antes de editar.
- [ ] Implementar localmente apenas o escopo combinado.
- [ ] Executar verificação sintática, lint e typecheck aplicáveis.
- [ ] Executar testes automatizados aplicáveis.
- [ ] Executar build da plataforma afetada.
- [ ] Realizar teste manual do fluxo principal.
- [ ] Realizar teste de erro, permissão e regressão.
- [ ] Informar arquivos alterados, testes realizados e limitações.
- [ ] Aguardar teste e aprovação do responsável pelo projeto.
- [ ] Corrigir o que for reprovado e repetir os testes.
- [ ] Somente após aprovação explícita, preparar commit/push se solicitado.

### Estados de uma entrega

```text
Pendente → Em desenvolvimento → Pronta para teste → Em validação
         → Ajustes solicitados → Pronta para novo teste
         → Aprovada → Autorizada para GitHub/publicação
```

Uma entrega aprovada não está automaticamente autorizada para GitHub ou produção; a autorização deve ser explícita.
