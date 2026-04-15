# 📱 GUIA - Integração de Anúncios nos Apps

Guia rápido para exibir anúncios e fazer tracking nos apps Web, Mobile e Desktop.

---

## 🌐 WEB APP (Next.js/React)

### 1. Adicionar Banner no Header

**Arquivo:** `components/layout/Header.tsx`

```tsx
import BannerAd from '@/components/ads/BannerAd';

export default function Header() {
  return (
    <header>
      {/* Logo, navegação, etc */}
      
      {/* Banner Superior */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0', background: '#f3f4f6' }}>
        <BannerAd 
          tipo="banner_superior" 
          fallback={<div style={{ height: 90 }} />} 
        />
      </div>
    </header>
  );
}
```

### 2. Adicionar Sidebar de Anúncios

**Arquivo:** `app/(dashboard)/layout.tsx`

```tsx
import BannerAd from '@/components/ads/BannerAd';

export default function DashboardLayout({ children }) {
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1 }}>{children}</main>
      
      {/* Sidebar de Anúncios */}
      <aside style={{ width: 320, padding: 16 }}>
        <BannerAd tipo="banner_lateral" />
        <div style={{ marginTop: 16 }}>
          <BannerAd tipo="banner_lateral" />
        </div>
      </aside>
    </div>
  );
}
```

### 3. Adicionar Card entre Serviços

**Arquivo:** `components/servicos/ServicoGrid.tsx`

```tsx
import BannerAd from '@/components/ads/BannerAd';

export default function ServicoGrid({ servicos }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {servicos.map((servico, index) => (
        <React.Fragment key={servico.id}>
          <ServicoCard servico={servico} />
          
          {/* Anúncio a cada 6 cards */}
          {(index + 1) % 6 === 0 && (
            <BannerAd tipo="card" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### 4. Modal Pop-up

**Arquivo:** `app/layout.tsx`

```tsx
import { ModalAd } from '@/components/ads/BannerAd';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ModalAd /> {/* Mostra automaticamente com delay */}
      </body>
    </html>
  );
}
```

---

## 📱 MOBILE APP (React Native)

### 1. Service de Anúncios

**Arquivo:** `src/services/anuncioService.js`

```javascript
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const anunciosRef = collection(db, 'anuncios');

export async function getAnunciosAtivos(tipo, context = {}) {
  const now = new Date();
  
  const q = query(
    anunciosRef,
    where('status', '==', 'ativo'),
    where('tipo', '==', tipo),
    where('dataInicio', '<=', now),
    where('dataFim', '>=', now),
    limit(10)
  );
  
  const snap = await getDocs(q);
  let anuncios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Filtrar por segmentação
  if (context) {
    anuncios = anuncios.filter(a => {
      const seg = a.segmentacao;
      if (seg?.todos) return true;
      if (context.perfil && seg?.perfis && !seg.perfis.includes(context.perfil)) return false;
      if (context.device && seg?.dispositivos && !seg.dispositivos.includes(context.device)) return false;
      return true;
    });
  }
  
  return anuncios;
}

export async function registrarImpressao(anuncioId, anuncianteId, data) {
  await addDoc(collection(db, 'impressoesAnuncios'), {
    anuncioId,
    anuncianteId,
    ...data,
    timestamp: serverTimestamp()
  });
}

export async function registrarClique(anuncioId, anuncianteId, data) {
  await addDoc(collection(db, 'cliquesAnuncios'), {
    anuncioId,
    anuncianteId,
    ...data,
    timestamp: serverTimestamp()
  });
}
```

### 2. Componente BannerAd (Mobile)

**Arquivo:** `src/components/ads/BannerAd.js`

```jsx
import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { getAnunciosAtivos, registrarImpressao, registrarClique } from '../../services/anuncioService';

export default function BannerAd({ tipo = 'banner_superior', style }) {
  const [anuncio, setAnuncio] = useState(null);
  const [impressaoRegistrada, setImpressaoRegistrada] = useState(false);
  
  useEffect(() => {
    buscarAnuncio();
  }, []);
  
  const buscarAnuncio = async () => {
    const anuncios = await getAnunciosAtivos(tipo, { device: 'mobile' });
    if (anuncios.length > 0) {
      const random = anuncios[Math.floor(Math.random() * anuncios.length)];
      setAnuncio(random);
      
      // Registrar impressão
      registrarImpressao(random.id, random.anuncianteId, {
        device: 'mobile',
        pagina: 'home',
        custo: 0
      });
      setImpressaoRegistrada(true);
    }
  };
  
  const handlePress = async () => {
    if (!anuncio) return;
    
    // Registrar clique
    await registrarClique(anuncio.id, anuncio.anuncianteId, {
      device: 'mobile',
      pagina: 'home',
      custo: 0,
      converteu: false
    });
    
    // Abrir link
    Linking.openURL(anuncio.ctaLink);
  };
  
  if (!anuncio) return <View style={[styles.container, style]} />;
  
  return (
    <TouchableOpacity onPress={handlePress} style={[styles.container, style]}>
      <Image 
        source={{ uri: anuncio.imagemMobileUrl || anuncio.imagemUrl }} 
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Ad</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 50,
    backgroundColor: '#1F2937',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
  },
});
```

### 3. Usar nas Telas

**Arquivo:** `src/screens/cliente/HomeScreen.js`

```jsx
import BannerAd from '../../components/ads/BannerAd';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <BannerAd tipo="banner_superior" />
      
      <ScrollView>
        <ServicosDestaque />
        
        {/* Card Ad */}
        <BannerAd tipo="card" style={{ height: 200, marginVertical: 16 }} />
        
        <ProfissionaisDestaque />
      </ScrollView>
    </View>
  );
}
```

---

## 💻 DESKTOP APP (Electron/Tauri)

O Desktop pode **reutilizar os componentes Web**! Basta importar:

```tsx
import BannerAd from '../../conecta-solutions-web/components/ads/BannerAd';
```

Ou criar versões específicas com tamanhos maiores.

---

## 📊 TRACKING - Métricas

### Métricas Automáticas (já implementado no backend):

| Métrica | Quando registra |
|---------|-----------------|
| **Impressão** | Banner entra na viewport (50% visível) |
| **Clique** | Usuário clica no anúncio |
| **CTR** | Calculado: (Cliques / Impressões) × 100 |
| **Gasto** | Calculado baseado no modelo (CPM/CPC) |

### Ver Métricas:

No painel admin: `/admin/campanhas/anuncios`

Ou consultar Firestore:
```javascript
// Total impressões por anúncio
db.collection('impressoesAnuncios')
  .where('anuncioId', '==', 'abc123')
  .count()

// Total cliques
db.collection('cliquesAnuncios')
  .where('anuncioId', '==', 'abc123')
  .count()
```

---

## 🎯 LOCAIS RECOMENDADOS

### Web:
1. **Header** - Banner superior (alta visibilidade)
2. **Sidebar** - Dashboard (usuários logados)
3. **Entre cards** - Listagem de serviços
4. **Modal** - Ao abrir app (1x/dia)

### Mobile:
1. **Topo das telas** - Banner 320x50
2. **Feed** - Card entre posts/serviços
3. **Stories** - Tela cheia (1x/dia)

### Desktop:
1. **Sidebar fixa** - 300x600 (2 banners)
2. **Header** - 728x90
3. **Entre seções** - Banner full

---

## ⚠️ BOAS PRÁTICAS

- ✅ **Não poluir**: Máximo 2 anúncios visíveis simultaneamente
- ✅ **Relevância**: Segmentar por perfil do usuário
- ✅ **Performance**: Lazy load de imagens
- ✅ **UX**: Sempre ter botão "Fechar" no modal
- ✅ **Acessibilidade**: Alt text nas imagens
- ✅ **LGPD**: Aviso de "Patrocinado" visível

---

## 🚀 TESTE RÁPIDO

1. **Cadastrar anunciante** (Fase 2)
2. **Criar anúncio** ativo (Fase 1)
3. **Adicionar BannerAd** no app
4. **Acessar página** → ver anúncio
5. **Verificar Firestore**:
   - `impressoesAnuncios` (registro da view)
   - `cliquesAnuncios` (se clicou)

---

**Documento criado:** 15/04/2026
