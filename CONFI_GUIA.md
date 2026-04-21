# Guia de Uso das Configurações do Sistema

## ✅ O que foi implementado (GRATUITO)

### 1. Hook Global `useConfig()`

- Disponível em TODAS as páginas do dashboard
- Sincroniza em tempo real com Firestore
- Valores padrão automáticos

### 2. Configurações disponíveis:

```typescript
const { config, loading } = useConfig();

// Geral
config.geral.nomePlataforma; // "Conecta Solutions"
config.geral.emailSuporte; // "suporte@..."
config.geral.telefoneSuporte; // "(11) 99999-9999"

// Notificações
config.notificacoes.emailAtivado; // true/false
config.notificacoes.pushAtivado; // true/false
config.notificacoes.smsAtivado; // true/false (gratuito via Firebase)

// Pagamentos
config.pagamentos.taxaServico; // 10 (%)
config.pagamentos.gatewayPadrao; // "stripe"
config.pagamentos.moedaPadrao; // "BRL"

// Segurança
config.seguranca.timeoutSessao; // 60 (minutos)
config.seguranca.tentativasLogin; // 5
```

---

## 📝 Como usar nas suas páginas

### Exemplo 1: Nome da Plataforma (Sidebar já está usando!)

```typescript
import { useConfig } from '@/lib/useConfig';

function MinhaPagina() {
  const { config } = useConfig();

  return <h1>{config.geral.nomePlataforma}</h1>;
}
```

### Exemplo 2: Calcular Taxa de Serviço

```typescript
import { calcularTaxaServicoSync } from '@/lib/taxaService';
import { useConfig } from '@/lib/useConfig';

function PrecoComponent() {
  const { config } = useConfig();
  const { taxa, valorLiquido } = calcularTaxaServicoSync(100, config.pagamentos.taxaServico);

  return (
    <div>
      <p>Taxa: R$ {taxa}</p>
      <p>Você recebe: R$ {valorLiquido}</p>
    </div>
  );
}
```

### Exemplo 3: Verificar se Email está habilitado antes de enviar

```typescript
import { useConfig } from "@/lib/useConfig";

async function enviarEmailUsuario(email: string, mensagem: string) {
  const config = await getConfigServerSide(); // para APIs/server-side

  if (!config.notificacoes.emailAtivado) {
    console.log("Emails desabilitados nas configurações");
    return;
  }

  // enviar email...
}
```

---

## 🎨 Componente de Exemplo criado

`components/TaxaResumo.tsx` - Card interativo que:

- Mostra a taxa de serviço configurada
- Calcula valores em tempo real
- Atualiza automaticamente quando admin muda a taxa

---

## 🔄 Sincronização em Tempo Real

Quando você altera uma configuração na tela de **Ajustes (Admin)**:

1. ✅ Firestore é atualizado
2. ✅ Todos os usuários online veem a mudança instantaneamente
3. ✅ App mobile (quando implementado lá) também recebe
4. ✅ Desktop/Web já está funcionando

---

## 🚫 O que NÃO foi implementado (evita custos)

| Funcionalidade     | Motivo                          |
| ------------------ | ------------------------------- |
| SMS Gateway        | Twilio é pago                   |
| 2FA/SMS            | Serviços 2FA são pagos          |
| IP Blocking        | Complexidade desnecessária      |
| Múltiplos gateways | Só Stripe (gratuito modo teste) |

---

## 🆘 Valores Padrão (Fallback)

Se o documento `configuracoes/sistema` não existir:

- Taxa: 10%
- Nome: "Conecta Solutions"
- Email: "suporte@conectasolutions.com"
- Notificações: Todas ATIVADAS

---

## ✅ STATUS: Mobile Implementado!

### Arquivos criados:

- `src/hooks/useConfig.js` - Hook para React Native
- `App.js` - Provider adicionado (já configurado!)
- `src/screens/profissional/FinanceiroPro.js` - Exemplo de uso

### Como usar no Mobile:

```javascript
import { useConfig } from "../../hooks/useConfig";

function MinhaTela() {
  const { config, loading } = useConfig();

  if (loading) return <Text>Carregando...</Text>;

  return (
    <View>
      <Text>Nome: {config.geral.nomePlataforma}</Text>
      <Text>Taxa: {config.pagamentos.taxaServico}%</Text>
      <Text>Email: {config.geral.emailSuporte}</Text>
    </View>
  );
}
```

### 🔄 Sincronização:

- **Web/Desktop:** Sincronizado ✅
- **Mobile:** Sincronizado ✅
- **Tempo real:** Todas as plataformas recebem mudanças instantaneamente
