# 📢 Implementação - Campanhas & Anúncios Patrocinados

## 🎯 Sistema de Anúncios (Ads)
Sistema onde empresas pagam para exibir anúncios na plataforma Conecta Serviços.

### 💰 Modelos de Cobrança
- **CPM** (Custo por Mil Impressões) - R$ 15,00 a R$ 50,00
- **CPC** (Custo por Clique) - R$ 1,00 a R$ 5,00
- **CPA** (Custo por Aquisição/Conversão) - R$ 20,00 a R$ 100,00
- **Pacote Fixo** - Valor mensal/semanal fixo

### 📍 Posições dos Anúncios
1. **Banner Superior** (Home, Dashboard) - 728x90px
2. **Banner Lateral** (Sidebar) - 300x250px
3. **Card Intermediário** (Listas de serviços) - 300x200px
4. **Banner Full** (Entre seções) - 100%x300px
5. **Pop-up Modal** (Ao abrir app) - 400x400px
6. **Push Notification** - Texto + imagem pequena
7. **Stories/Stories-like** (Mobile) - Full screen 9:16

---

## 📋 LISTA DE IMPLEMENTAÇÃO

### ✅ Fase 1: Estrutura Base (Firestore)
- [ ] Coleção `anuncios` - Dados dos anúncios
- [ ] Coleção `anunciantes` - Empresas anunciantes
- [ ] Coleção `impressoesAnuncios` - Tracking de visualizações
- [ ] Coleção `cliquesAnuncios` - Tracking de cliques
- [ ] Coleção `campanhas` (já existe) - Campanhas de email/push
- [ ] Coleção `templatesCampanha` - Templates pré-definidos

### ✅ Fase 2: Backend & Regras
- [ ] Regras Firestore para coleções de anúncios
- [ ] Cloud Function: Registrar impressão
- [ ] Cloud Function: Registrar clique
- [ ] Cloud Function: Calcular métricas em tempo real
- [ ] Cloud Function: Desativar anúncios expirados

### ✅ Fase 3: Painel Admin - Anúncios
- [ ] Listar todos os anúncios (ativos/pausados/expirados)
- [ ] Criar novo anúncio (wizard: dados → criativo → segmentação → pagamento)
- [ ] Editar anúncio existente
- [ ] Pausar/Reativar anúncio
- [ ] Excluir anúncio
- [ ] Preview do anúncio nas posições
- [ ] Métricas: Impressões, Cliques, CTR, Conversões, Gasto
- [ ] Gráfico de performance ao longo do tempo
- [ ] Relatório de faturamento por anunciante

### ✅ Fase 4: Gestão de Anunciantes
- [ ] Cadastro de anunciante (empresa, CNPJ, contato)
- [ ] Histórico de campanhas do anunciante
- [ ] Saldo/Créditos do anunciante
- [ ] Faturas e pagamentos
- [ ] Status do anunciante (ativo, inadimplente, bloqueado)

### ✅ Fase 5: Campanhas Marketing (Email/Push)
- [ ] CRUD de campanhas
- [ ] Editor de templates (rich text)
- [ ] Seleção de segmento (todos, clientes, profissionais, inativos, VIP)
- [ ] Agendamento (agora ou data futura)
- [ ] Preview de campanha
- [ ] Teste de envio (enviar para mim)
- [ ] Métricas: Enviados, Abertos, Cliques, Conversões
- [ ] Templates pré-definidos (boas-vindas, promoção, reativação)

### ✅ Fase 6: Exibição nos Apps (Web/Mobile/Desktop)
- [ ] Componente Banner (728x90, 300x250, etc.)
- [ ] Componente Card Anúncio
- [ ] Componente Modal Anúncio
- [ ] Componente Push Notification
- [ ] Lógica de rotação de anúncios
- [ ] Lógica de targeting por usuário
- [ ] Tracking de impressões (viewport intersection)
- [ ] Tracking de cliques

### ✅ Fase 7: Automações
- [ ] Campanha de boas-vindas automática
- [ ] Campanha de aniversário
- [ ] Campanha de reativação (usuário inativo)
- [ ] Campanha pós-agendamento
- [ ] Campanha pós-pagamento
- [ ] Anúncios por contexto (ex: anunciar profissional de limpeza na página de serviços domésticos)

---

## 📁 Estrutura de Arquivos

```
conecta-solutions-web/
├── app/(dashboard)/admin/
│   ├── campanhas/
│   │   ├── page.tsx              # Dashboard principal
│   │   ├── anuncios/
│   │   │   ├── page.tsx          # Lista de anúncios
│   │   │   ├── novo/
│   │   │   │   └── page.tsx      # Wizard criar anúncio
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Editar/ver anúncio
│   │   ├── anunciantes/
│   │   │   ├── page.tsx          # Lista de anunciantes
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Detalhes do anunciante
│   │   ├── email/
│   │   │   ├── page.tsx          # Campanhas de email
│   │   │   └── templates/
│   │   │       └── page.tsx      # Templates de email
│   │   └── push/
│   │       └── page.tsx          # Campanhas de push
│
├── components/
│   ├── ads/
│   │   ├── BannerAd.tsx          # Banner responsivo
│   │   ├── CardAd.tsx            # Card anúncio
│   │   ├── ModalAd.tsx           # Modal/popup anúncio
│   │   └── AdMetrics.tsx         # Métricas do anúncio
│   │
│   ├── campanhas/
│   │   ├── CampanhaEditor.tsx    # Editor de campanha
│   │   ├── SegmentacaoForm.tsx   # Form de segmentação
│   │   ├── TemplateSelector.tsx  # Seletor de templates
│   │   └── MetricasCard.tsx      # Card de métricas
│   │
│   └── marketing/
│       ├── AnuncianteForm.tsx    # Form cadastro anunciante
│       ├── AdPreview.tsx         # Preview do anúncio
│       └── RelatorioFaturamento.tsx
│
├── lib/
│   ├── adsService.ts             # CRUD anúncios
│   ├── campanhaService.ts        # CRUD campanhas
│   ├── anuncianteService.ts      # CRUD anunciantes
│   └── adTracker.ts              # Tracking impressões/cliques
│
└── styles/
    ├── admin-campanhas.css
    └── ads.css
```

---

## 🔥 Prioridade de Implementação

### 🥇 URGENTE (Semana 1)
1. Estrutura Firestore (coleções)
2. Regras de segurança
3. Painel básico de anúncios (listar, criar, editar)
4. Componente Banner para exibição
5. Tracking básico (impressão, clique)

### 🥈 IMPORTANTE (Semana 2)
1. Gestão de anunciantes
2. Sistema de créditos/saldo
3. Campanhas de email (CRUD + envio)
4. Templates básicos
5. Métricas e gráficos

### 🥉 DESEJÁVEL (Semana 3)
1. Campanhas de push notification
2. Automações (triggers)
3. Segmentação avançada
4. A/B testing de anúncios
5. Relatórios detalhados

---

## 💵 Fluxo de Pagamento (Futuro)
1. Anunciante escolhe pacote (CPM/CPC/CPA/Fixo)
2. Sistema calcula orçamento estimado
3. Anunciante adiciona crédito (PIX, Cartão, Boleto)
4. Anúncio entra no ar quando aprovado
5. Sistema desconta do saldo conforme performance
6. Alerta quando saldo baixo
7. Recarga automática (opcional)

---

## 📊 Métricas Principais

### Para Anúncios:
- **Impressões** - Quantas vezes foi exibido
- **Cliques** - Quantas vezes foi clicado
- **CTR** (Click-Through Rate) - % Cliques/Impressões
- **CPM** - Custo por mil impressões
- **CPC** - Custo por clique
- **Conversões** - Quantas ações foram completadas
- **CPA** - Custo por aquisição
- **ROI** - Retorno sobre investimento

### Para Campanhas Email/Push:
- **Enviados** - Total de destinatários
- **Entregues** - Que chegaram na caixa de entrada
- **Abertos** - Que abriram a mensagem
- **Cliques** - Que clicaram em links
- **Bounces** - Que falharam (email inválido)
- **Unsubscribes** - Que se descadastraram
- **Taxa de Rejeição** - % que marcaram como spam

---

**Status:** 🟡 Em planejamento  
**Responsável:** [A definir]  
**Previsão de entrega:** 3 semanas
