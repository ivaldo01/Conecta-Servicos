# 📱 MOBILE - Implementação de Anúncios Patrocinados

## ✅ O QUE FOI IMPLEMENTADO

### 1. Service de Anúncios
**Arquivo:** `src/services/anuncioService.js`

**Funcionalidades:**
- ✅ `getAnunciosAtivos(tipo, contexto)` - Busca anúncios do Firestore
- ✅ `getAnuncioRandom(tipo, contexto)` - Retorna um anúncio aleatório
- ✅ `registrarImpressao()` - Registra view no Firestore
- ✅ `registrarClique()` - Registra clique no Firestore
- ✅ `getContextoUsuario()` - Obtém dados para segmentação
- ✅ `foiVistoHoje()` - Evita mostrar mesmo anúncio no dia

**Segmentação suportada:**
- Perfil do usuário (cliente/profissional)
- Cidade
- Categoria
- Dispositivo (mobile/web/desktop)
- Plano ativo

---

### 2. Componente BannerAd (React Native)
**Arquivo:** `src/components/ads/BannerAd.js`

**Tipos de Anúncio:**
```javascript
const SIZES = {
  banner_superior: { width: SCREEN_WIDTH, height: 60 },
  banner_lateral:  { width: 300, height: 250 },
  card:            { width: SCREEN_WIDTH - 32, height: 200 },
  banner_full:     { width: SCREEN_WIDTH, height: 100 },
  push:            { width: SCREEN_WIDTH - 32, height: 120 },
  story:           { width: 120, height: 200 }
};
```

**Features:**
- ✅ Busca anúncios do Firestore automaticamente
- ✅ Registra impressão quando visível
- ✅ Registra clique ao tocar
- ✅ Badge "Ad" para transparência
- ✅ Animação de fade-in
- ✅ Loading state
- ✅ Fallback personalizável
- ✅ Previne repetição no mesmo dia

**Uso:**
```jsx
import BannerAd from '../../components/ads/BannerAd';

// Banner superior
<BannerAd tipo="banner_superior" />

// Card ad
<BannerAd tipo="card" style={{ marginBottom: 16 }} />

// Com fallback
<BannerAd 
  tipo="banner_superior" 
  fallback={<View style={{ height: 60, backgroundColor: '#f3f4f6' }} />} 
/>
```

---

### 3. Componentes Adicionais

#### StoryAd
```jsx
import { StoryAd } from '../../components/ads/BannerAd';

<StoryAd 
  anuncios={listaAnuncios} 
  onPress={(anuncio) => console.log(anuncio)} 
/>
```

#### ModalAd (Interstitial)
```jsx
import { ModalAd } from '../../components/ads/BannerAd';

<ModalAd 
  visible={showModal}
  onClose={() => setShowModal(false)}
  anuncio={anuncioSelecionado}
/>
```

---

### 4. Telas Atualizadas

#### ✅ HomeScreen (`src/screens/comum/HomeScreen.js`)
- Adicionado `BannerAd` tipo `banner_superior` após `AdBanner` do AdMob

```jsx
{/* Anúncios Patrocinados */}
<BannerAd 
  tipo="banner_superior" 
  style={{ marginHorizontal: 0 }}
/>
```

#### ✅ BuscaProfissionais (`src/screens/cliente/BuscaProfissionais.js`)
- Adicionado `BannerAd` tipo `card` antes dos resultados

```jsx
{/* Anúncio Patrocinado */}
<BannerAd 
  tipo="card" 
  style={{ marginBottom: 16 }}
/>
```

---

## 📊 FLUXO DE FUNCIONAMENTO

```
Usuário abre tela
    ↓
BannerAd monta
    ↓
Busca anúncio ativo do Firestore
    ↓
Aplica segmentação (perfil, cidade, etc)
    ↓
Seleciona anúncio aleatório
    ↓
Registra IMPRESSÃO no Firestore
    ↓
Atualiza métricas do anúncio
    ↓
Atualiza métricas do anunciante
    ↓
Usuário CLICA no anúncio
    ↓
Registra CLIQUE no Firestore
    ↓
Abre link do anunciante
```

---

## 🔥 COLEÇÕES FIRESTORE UTILIZADAS

| Coleção | Uso |
|---------|-----|
| `anuncios` | Busca anúncios ativos |
| `impressoesAnuncios` | Registra views |
| `cliquesAnuncios` | Registra cliques |
| `anunciantes` | Dados e métricas |

---

## 💰 MODELOS DE COBRANÇA

O sistema suporta:

| Modelo | Registra em |
|--------|-------------|
| **CPM** | Impressão |
| **CPC** | Clique |
| **CPA** | Conversão |
| **Fixo** | - |

---

## 🧪 COMO TESTAR

### 1. Cadastrar Anunciante
1. Vá no painel: `/admin/campanhas/anunciantes`
2. Clique "Novo Anunciante"
3. Preencha dados e saldo inicial

### 2. Criar Anúncio
1. Vá em: `/admin/campanhas/anuncios`
2. Clique "Novo Anúncio"
3. Escolha tipo `card` ou `banner_superior`
4. Upload imagem
5. Defina segmentação
6. Ative o anúncio

### 3. Testar no App
1. Abra app mobile
2. Vá para Home ou Busca
3. Veja anúncio aparecer
4. Clique e verifique se abre link

### 4. Verificar Firestore
```javascript
// Ver impressões
db.collection('impressoesAnuncios')
  .orderBy('timestamp', 'desc')
  .limit(10)

// Ver cliques  
db.collection('cliquesAnuncios')
  .orderBy('timestamp', 'desc')
  .limit(10)
```

---

## 🚀 PRÓXIMOS PASSOS (Opcional)

- [ ] Adicionar BannerAd nas outras telas:
  - `MeusAgendamentosCliente.js`
  - `FavoritosCliente.js`
  - `PerfilProfissional.js` (tela pública)
  
- [ ] Adicionar ModalAd (interstitial) em transições:
  - Ao abrir app (1x/dia)
  - Após completar agendamento

- [ ] Adicionar StoryAd no feed:
  - Entre stories de profissionais

- [ ] Implementar refresh automático:
  - Trocar anúncio a cada X segundos

---

## ⚠️ CONSIDERAÇÕES

1. **Permissões Firestore**: Verificar se rules permitem:
   - Ler `anuncios` (status=ativo)
   - Criar `impressoesAnuncios`
   - Criar `cliquesAnuncios`

2. **Performance**: Anúncios são buscados uma vez por sessão e cached

3. **LGPD**: Badge "Ad" sempre visível para transparência

4. **UX**: Não poluir - máximo 2 anúncios por tela

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

### Novos:
- `src/services/anuncioService.js`
- `src/components/ads/BannerAd.js`

### Modificados:
- `src/screens/comum/HomeScreen.js`
- `src/screens/cliente/BuscaProfissionais.js`

---

**Status:** ✅ **IMPLEMENTADO E PRONTO PARA TESTES**

**Data:** 15/04/2026
