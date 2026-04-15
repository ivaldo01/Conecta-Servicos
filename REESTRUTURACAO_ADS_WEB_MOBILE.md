# 🔄 REESTRUTURAÇÃO - Sistema de Anúncios em Web, Mobile e Desktop

## 📋 VISÃO GERAL

Após criar o backend de anúncios, precisamos modificar:
- ✅ **Web App** (Next.js/React)
- ✅ **Mobile App** (React Native)
- ✅ **Desktop App** (Electron/Tauri)

Para exibir anúncios nos locais estratégicos e fazer tracking correto.

---

## 🌐 1. WEB APP (Next.js/React)

### 📍 Locais de Exibição

#### **A) Banner Superior (728x90)**
```
Local: Topo de todas as páginas públicas e dashboard
Público: Todos os usuários logados
```

**Arquivos a modificar:**
- `components/layout/Header.tsx` - Adicionar banner abaixo do header
- `app/(dashboard)/layout.tsx` - Layout do dashboard
- `app/(public)/layout.tsx` - Layout público

**Implementação:**
```tsx
// components/layout/Header.tsx
import BannerAd from '@/components/ads/BannerAd';

export default function Header() {
  return (
    <header>
      {/* Header atual */}
      
      {/* Banner Superior */}
      <div className="header-banner">
        <BannerAd 
          tipo="banner_superior" 
          fallback={<div style={{ height: 90 }} />} // Espaço reservado
        />
      </div>
    </header>
  );
}
```

---

#### **B) Banner Lateral (300x250)**
```
Local: Sidebar direita do dashboard
Público: Profissionais e Clientes no dashboard
```

**Arquivos a modificar:**
- `app/(dashboard)/layout.tsx` - Adicionar coluna lateral
- `components/layout/Sidebar.tsx` - Ou criar AdSidebar

**Implementação:**
```tsx
// app/(dashboard)/layout.tsx
import BannerAd from '@/components/ads/BannerAd';

export default function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
      
      {/* Sidebar de Anúncios */}
      <aside className="ad-sidebar">
        <BannerAd tipo="banner_lateral" />
        
        {/* Segundo anúncio se houver espaço */}
        <div style={{ marginTop: 16 }}>
          <BannerAd tipo="banner_lateral" />
        </div>
      </aside>
    </div>
  );
}
```

---

#### **C) Card Intermediário (300x200)**
```
Local: Entre cards na listagem de serviços/profissionais
Público: Clientes buscando serviços
Frequência: A cada 6 cards de serviço
```

**Arquivos a modificar:**
- `app/(public)/servicos/page.tsx` - Listagem de serviços
- `app/(public)/profissionais/page.tsx` - Listagem de profissionais
- `components/servicos/ServicoGrid.tsx` - Grid de serviços

**Implementação:**
```tsx
// components/servicos/ServicoGrid.tsx
import BannerAd from '@/components/ads/BannerAd';

export default function ServicoGrid({ servicos }) {
  return (
    <div className="servico-grid">
      {servicos.map((servico, index) => (
        <React.Fragment key={servico.id}>
          {/* Card do serviço */}
          <ServicoCard servico={servico} />
          
          {/* Anúncio a cada 6 cards */}
          {(index + 1) % 6 === 0 && (
            <div className="ad-card-wrapper">
              <BannerAd tipo="card" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

#### **D) Banner Full (100%x300)**
```
Local: Entre seções da home page
Público: Visitantes da landing page
```

**Arquivos a modificar:**
- `app/page.tsx` - Home page
- `app/(public)/page.tsx` - Landing page

**Implementação:**
```tsx
// app/page.tsx
import BannerAd from '@/components/ads/BannerAd';

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      
      {/* Banner Full entre seções */}
      <section className="banner-full-section">
        <BannerAd tipo="banner_full" />
      </section>
      
      <FeaturesSection />
      
      {/* Outro banner */}
      <section className="banner-full-section">
        <BannerAd tipo="banner_full" />
      </section>
      
      <TestimonialsSection />
    </div>
  );
}
```

---

#### **E) Modal Pop-up (400x400)**
```
Local: Overlay ao abrir app (delay 3 segundos)
Público: Usuários logados
Frequência: Máximo 1x por dia
```

**Arquivos a modificar:**
- `app/layout.tsx` - Layout root
- `components/ads/ModalAd.tsx` - Já criado
- Criar: `components/ads/AdModalManager.tsx` - Gerenciador

**Implementação:**
```tsx
// components/ads/AdModalManager.tsx
'use client';

import { useEffect, useState } from 'react';
import { ModalAd } from './BannerAd';

export default function AdModalManager() {
  const [showModal, setShowModal] = useState(false);
  
  useEffect(() => {
    // Verificar se já mostrou hoje
    const lastShown = localStorage.getItem('adModalLastShown');
    const today = new Date().toDateString();
    
    if (lastShown !== today) {
      // Delay de 3 segundos
      const timer = setTimeout(() => {
        setShowModal(true);
        localStorage.setItem('adModalLastShown', today);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  if (!showModal) return null;
  
  return <ModalAd onClose={() => setShowModal(false)} />;
}

// app/layout.tsx
import AdModalManager from '@/components/ads/AdModalManager';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <AdModalManager /> {/* Modal em todas as páginas */}
      </body>
    </html>
  );
}
```

---

#### **F) Push Notification (Web)**
```
Local: Notificação no canto da tela
Público: Usuários logados com permissão
```

**Arquivos a modificar:**
- Criar: `components/ads/PushAd.tsx`
- `app/layout.tsx` - Adicionar componente

**Implementação:**
```tsx
// components/ads/PushAd.tsx
'use client';

import { useEffect, useState } from 'react';

export default function PushAd() {
  const [notification, setNotification] = useState(null);
  
  useEffect(() => {
    // Buscar push ads ativos
    // Mostrar com delay
    const timer = setTimeout(async () => {
      const pushAds = await getAnunciosAtivos('push');
      if (pushAds.length > 0) {
        setNotification(pushAds[0]);
      }
    }, 10000); // 10 segundos
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!notification) return null;
  
  return (
    <div className="push-notification-ad">
      {/* Estilo de notificação push */}
    </div>
  );
}
```

---

## 📱 2. MOBILE APP (React Native)

### 📍 Locais de Exibição

#### **A) Banner Superior (320x50)**
```
Local: Topo das telas principais
Telas: Home, Busca, Perfil, Agendamentos
```

**Arquivos a modificar:**
- `src/components/ads/BannerAd.native.tsx`
- `src/screens/cliente/HomeScreen.js` - Home do cliente
- `src/screens/profissional/HomeProfissionalScreen.js` - Home do profissional
- `src/screens/comum/BuscaScreen.js` - Tela de busca

**Implementação:**
```jsx
// src/components/ads/BannerAd.native.js
import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { getAnunciosAtivos, registrarImpressao, registrarClique } from '../../services/anuncioService';

export default function BannerAd({ tipo = 'banner_superior', style }) {
  const [anuncio, setAnuncio] = useState(null);
  
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
        pagina: 'home', // Pegar nome da tela atual
        custo: 0
      });
    }
  };
  
  const handlePress = async () => {
    if (!anuncio) return;
    
    // Registrar clique
    await registrarClique(anuncio.id, anuncio.anuncianteId, null, {
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

// src/screens/cliente/HomeScreen.js
import BannerAd from '../../components/ads/BannerAd.native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <BannerAd tipo="banner_superior" />
      
      {/* Resto do conteúdo */}
      <ScrollView>
        <ServicosDestaque />
        
        {/* Card Ad entre seções */}
        <BannerAd tipo="card" style={{ height: 200, marginVertical: 16 }} />
        
        <ProfissionaisDestaque />
      </ScrollView>
    </View>
  );
}
```

---

#### **B) Card Intermediário (300x250)**
```
Local: Entre cards na lista de serviços
Frequência: A cada 4-5 serviços
```

**Arquivos a modificar:**
- `src/screens/cliente/BuscaScreen.js` - Resultados de busca
- `src/components/servicos/ServicoList.js` - Lista de serviços

---

#### **C) Modal Full Screen (Stories)**
```
Local: Overlay tipo Instagram Stories
Público: Ao abrir app (1x por dia)
```

**Arquivos a modificar:**
- Criar: `src/components/ads/StoryAd.js`
- `App.js` - Adicionar no root

**Implementação:**
```jsx
// src/components/ads/StoryAd.js
import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { getAnunciosAtivos } from '../../services/anuncioService';

const { width, height } = Dimensions.get('window');

export default function StoryAd() {
  const [visible, setVisible] = useState(false);
  const [anuncio, setAnuncio] = useState(null);
  
  useEffect(() => {
    checkAndShow();
  }, []);
  
  const checkAndShow = async () => {
    // Verificar se já mostrou hoje
    const lastShown = await AsyncStorage.getItem('storyAdLastShown');
    const today = new Date().toDateString();
    
    if (lastShown !== today) {
      const anuncios = await getAnunciosAtivos('story', { device: 'mobile' });
      if (anuncios.length > 0) {
        setAnuncio(anuncios[0]);
        setTimeout(() => {
          setVisible(true);
          AsyncStorage.setItem('storyAdLastShown', today);
        }, 2000);
      }
    }
  };
  
  if (!visible || !anuncio) return null;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setVisible(false)}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
      
      <Image
        source={{ uri: anuncio.imagemUrl }}
        style={styles.image}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>{anuncio.tituloAnuncio}</Text>
        <Text style={styles.description}>{anuncio.textoAnuncio}</Text>
        
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaText}>{anuncio.ctaTexto}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  image: {
    width,
    height: height * 0.7,
  },
  content: {
    padding: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    color: '#CCC',
    fontSize: 16,
    marginTop: 8,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  closeText: {
    color: '#FFF',
    fontSize: 24,
  },
});

// App.js
import StoryAd from './src/components/ads/StoryAd';

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
      <StoryAd /> {/* Overlay em todas as telas */}
    </NavigationContainer>
  );
}
```

---

#### **D) Push Notification (Mobile)**
```
Local: Notificação nativa do sistema
Requer: Permissão do usuário
```

**Arquivos a modificar:**
- `src/services/notificacoes.js` - Adicionar tipo "anuncio"
- Backend: Firebase Cloud Messaging (FCM)

---

## 💻 3. DESKTOP APP (Electron/Tauri)

### 📍 Locais de Exibição

#### **A) Banner Superior**
```
Local: Topo da janela
Tamanho: 728x90 (mesmo da web)
```

**Arquivos a modificar:**
- Reutilizar componente web `BannerAd.tsx`
- `desktop/src/components/Header.tsx`

---

#### **B) Sidebar Direita**
```
Local: Coluna lateral fixa
Tamanho: 300x600 (2 banners 300x250)
```

**Arquivos a modificar:**
- `desktop/src/components/Sidebar.tsx`
- `desktop/src/App.tsx` - Layout principal

---

#### **C) Modal Pop-up**
```
Local: Modal central ao abrir app
Delay: 2 segundos
```

**Implementação:**
```tsx
// desktop/src/components/AdModal.tsx
import { useEffect, useState } from 'react';
import { ModalAd } from '../../../conecta-solutions-web/components/ads/BannerAd';

export default function DesktopAdModal() {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const lastShown = localStorage.getItem('desktopAdLastShown');
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        setShow(true);
        localStorage.setItem('desktopAdLastShown', today);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!show) return null;
  
  return <ModalAd onClose={() => setShow(false)} />;
}
```

---

## 🔄 4. SERVIÇO DE ANÚNCIOS (MOBILE/DESKTOP)

### Criar: `src/services/anuncioService.js`

```javascript
// src/services/anuncioService.js
import { db } from './firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

const anunciosRef = collection(db, 'anuncios');
const impressoesRef = collection(db, 'impressoesAnuncios');
const cliquesRef = collection(db, 'cliquesAnuncios');

// Buscar anúncios ativos
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
      
      if (context.perfil && seg?.perfis && !seg.perfis.includes(context.perfil)) {
        return false;
      }
      
      if (context.device && seg?.dispositivos && !seg.dispositivos.includes(context.device)) {
        return false;
      }
      
      return true;
    });
  }
  
  return anuncios;
}

// Registrar impressão
export async function registrarImpressao(anuncioId, anuncianteId, data) {
  try {
    await addDoc(impressoesRef, {
      anuncioId,
      anuncianteId,
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Erro ao registrar impressão:', err);
  }
}

// Registrar clique
export async function registrarClique(anuncioId, anuncianteId, impressaoId, data) {
  try {
    await addDoc(cliquesRef, {
      anuncioId,
      anuncianteId,
      impressaoId,
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Erro ao registrar clique:', err);
  }
}
```

---

## 📊 5. CHECKLIST DE IMPLEMENTAÇÃO

### Web App
- [ ] Adicionar BannerAd em `Header.tsx`
- [ ] Criar sidebar de anúncios em dashboard
- [ ] Inserir CardAd entre serviços/profissionais
- [ ] Adicionar BannerFull na home
- [ ] Implementar ModalAd com delay
- [ ] Adicionar PushAd (opcional)
- [ ] Testar tracking de impressões
- [ ] Testar tracking de cliques

### Mobile App
- [ ] Criar `BannerAd.native.js`
- [ ] Adicionar banner em todas as telas principais
- [ ] Inserir CardAd em listagens
- [ ] Criar `StoryAd.js` (full screen)
- [ ] Implementar delay e controle de frequência
- [ ] Criar `anuncioService.js` para mobile
- [ ] Testar em Android
- [ ] Testar em iOS

### Desktop App
- [ ] Reutilizar componentes web
- [ ] Adicionar sidebar de anúncios
- [ ] Implementar ModalAd
- [ ] Ajustar tamanhos para desktop
- [ ] Testar tracking

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

### 🔥 URGENTE (Semana 1)
1. **Web Banner Superior** - Maior visibilidade
2. **Web Card Ad** - Entre serviços (alto CTR)
3. **Mobile Banner** - Topo das telas
4. **Tracking básico** - Impressões e cliques

### ⚡ IMPORTANTE (Semana 2)
1. **Web Sidebar Ad** - Dashboard
2. **Mobile Card Ad** - Entre serviços
3. **Mobile Story Ad** - Full screen
4. **Desktop Sidebar**

### 📝 DESEJÁVEL (Semana 3)
1. **Modal Ads** (Web/Mobile/Desktop)
2. **Push Notifications**
3. **Segmentação avançada**
4. **A/B Testing**

---

## 💰 ESTIMATIVA DE RECEITA

### Com 1000 usuários ativos/dia:

| Tipo | Impressões/Dia | CPM Médio | Receita/Dia | Receita/Mês |
|------|----------------|-----------|-------------|-------------|
| Banner Superior | 50,000 | R$ 25 | R$ 1,250 | R$ 37,500 |
| Sidebar | 30,000 | R$ 20 | R$ 600 | R$ 18,000 |
| Card Ads | 20,000 | R$ 30 | R$ 600 | R$ 18,000 |
| **TOTAL** | **100,000** | - | **R$ 2,450** | **R$ 73,500** |

*Projeção conservadora. Com mais anunciantes e usuários, escala linearmente.*

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### UX (Experiência do Usuário)
- ✅ Não poluir a interface (máximo 2 anúncios visíveis)
- ✅ Anúncios relevantes (segmentação)
- ✅ Botão "Fechar" sempre visível
- ✅ Não bloquear funcionalidades principais
- ✅ Carregamento lazy (não atrasar app)

### Performance
- ✅ Lazy load de imagens
- ✅ Cache de anúncios
- ✅ Compressão de imagens
- ✅ CDN para assets
- ✅ Debounce no tracking

### Privacidade/Legal
- ✅ Aviso de "Patrocinado"
- ✅ Política de privacidade atualizada
- ✅ Opção de não receber anúncios (premium?)
- ✅ LGPD/GDPR compliance

---

**Pronto para implementar quando quiser!** 🚀
