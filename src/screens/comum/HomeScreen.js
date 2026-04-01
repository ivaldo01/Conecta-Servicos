import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import AdBanner from '../../components/AdBanner';
import NativeAdCard from '../../components/NativeAdCard';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from "@react-native-community/netinfo";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import logo from '../../../assets/logo.png';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CLIENT_SLIDE_WIDTH = Math.min(SCREEN_WIDTH - 44, 300);
const CLIENT_PRO_CARD_WIDTH = 240;
const CLIENT_PRO_CARD_HEIGHT = 230;

const FALLBACK_STATS_CLIENTE = [
  {
    id: '1',
    label: 'Explorar',
    value: 'Serviços',
    icon: 'search-outline',
    color: colors.primary,
    action: 'buscar',
  },
  {
    id: '2',
    label: 'Agenda',
    value: 'Cliente',
    icon: 'calendar-outline',
    color: colors.success || '#22C55E',
    action: 'agenda',
  },
  {
    id: '3',
    label: 'Perfil',
    value: 'Conta',
    icon: 'person-outline',
    color: '#7C3AED',
    action: 'perfil',
  },
];

const SLIDES_CLIENTE = [
  {
    id: 'slide-1',
    title: 'Encontre profissionais perto de você',
    subtitle: 'Descubra serviços confiáveis, bem avaliados e agende com rapidez.',
    icon: 'sparkles-outline',
    cta: 'Buscar agora',
    action: 'buscar',
  },
  {
    id: 'slide-2',
    title: 'Agende serviços em poucos toques',
    subtitle: 'Escolha categoria, horário e profissional de forma simples.',
    icon: 'flash-outline',
    cta: 'Explorar serviços',
    action: 'explorar',
  },
  {
    id: 'slide-3',
    title: 'Acompanhe tudo em um só lugar',
    subtitle: 'Veja seus agendamentos, favoritos e notificações sem complicação.',
    icon: 'notifications-outline',
    cta: 'Ver agenda',
    action: 'agenda',
  },
];

function getPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto || typeof nomeCompleto !== 'string') return 'Usuário';
  return nomeCompleto.trim().split(' ')[0] || 'Usuário';
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseNumero(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}

function getCategoryIcon(nome, icone) {
  if (icone) return icone;

  const texto = normalizarTexto(nome);

  if (texto.includes('cabelo')) return 'cut-outline';
  if (texto.includes('barba')) return 'person-outline';
  if (texto.includes('manicure')) return 'hand-left-outline';
  if (texto.includes('pedicure')) return 'footsteps-outline';
  if (texto.includes('maquiagem')) return 'color-palette-outline';
  if (texto.includes('massagem')) return 'body-outline';
  if (texto.includes('estetica')) return 'sparkles-outline';
  if (texto.includes('sobrancelha')) return 'eye-outline';
  if (texto.includes('cilios')) return 'eye-outline';
  if (texto.includes('depilacao')) return 'flower-outline';
  if (texto.includes('tattoo')) return 'brush-outline';

  return 'grid-outline';
}

function calcularMediaAvaliacoes(avaliacoes = []) {
  if (!avaliacoes.length) return 0;
  const soma = avaliacoes.reduce((acc, item) => acc + parseNumero(item?.nota), 0);
  return soma / avaliacoes.length;
}

function estaOnline(ultimoOnline) {
  if (!ultimoOnline) return false;

  try {
    const agora = Date.now();
    let timestamp = 0;

    if (ultimoOnline?.seconds) {
      timestamp = ultimoOnline.seconds * 1000;
    } else if (ultimoOnline instanceof Date) {
      timestamp = ultimoOnline.getTime();
    } else if (typeof ultimoOnline === 'number') {
      timestamp = ultimoOnline;
    }

    if (!timestamp) return false;

    const diferenca = agora - timestamp;
    return diferenca <= 5 * 60 * 1000;
  } catch {
    return false;
  }
}

function calcularDistanciaKm(origem, destino) {
  if (!origem || !destino) return null;

  const toRad = (value) => (value * Math.PI) / 180;

  const lat1 = Number(origem?.lat);
  const lon1 = Number(origem?.lon);
  const lat2 = Number(destino?.lat);
  const lon2 = Number(destino?.lon);

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return null;
  }

  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function QuickStatCard({ label, value, icon, color, onPress }) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={[styles.statIconBox, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SlideCard({ item, onPress }) {
  return (
    <View style={[styles.slideCard, { width: CLIENT_SLIDE_WIDTH, height: 290 }]}>
      <View style={styles.slideDecorCircleOne} />
      <View style={styles.slideDecorCircleTwo} />

      <View style={styles.slideContent}>
        <View style={styles.slideTextArea}>
          <View style={styles.slideMiniBadge}>
            <Ionicons name="sparkles-outline" size={13} color="#FFF" />
            <Text style={styles.slideMiniBadgeText}>Conecta Solutions</Text>
          </View>

          <Text style={styles.slideTitle} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.slideSubtitle} numberOfLines={3}>{item.subtitle}</Text>

          <TouchableOpacity style={styles.slideButton} activeOpacity={0.92} onPress={onPress}>
            <Text style={styles.slideButtonText}>{item.cta}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.slideIconBox}>
          <Ionicons name={item.icon || 'sparkles-outline'} size={34} color="#FFF" />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [favoritosIds, setFavoritosIds] = useState([]);
  const [totalNotificacoesNaoLidas, setTotalNotificacoesNaoLidas] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const slidesRef = useRef(null);
  const primeiroNome = getPrimeiroNome(usuario?.nome);
  const statsAtuais = useMemo(() => FALLBACK_STATS_CLIENTE, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const carregarTudo = useCallback(async () => {
    try {
      const user = auth.currentUser;

      if (!user?.uid) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userRef = doc(db, 'usuarios', user.uid);
      const userSnap = await getDoc(userRef);

      const dadosUsuario = userSnap.exists() ? userSnap.data() : null;
      setUsuario(dadosUsuario);

      const categoriasSnap = await getDocs(collection(db, 'categorias'));
      const categoriasLista = categoriasSnap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      categoriasLista.sort((a, b) =>
        String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR')
      );
      setCategorias(categoriasLista);

      const profissionaisQuery = query(
        collection(db, 'usuarios'),
        where('tipo', '==', 'profissional')
      );

      const profissionaisSnap = await getDocs(profissionaisQuery);
      const profissionaisBase = [];

      for (const item of profissionaisSnap.docs) {
        const dados = item.data();

        const avaliacoesSnap = await getDocs(collection(db, 'usuarios', item.id, 'avaliacoes'));
        const avaliacoes = avaliacoesSnap.docs.map((docAvaliacao) => docAvaliacao.data());

        const avaliacaoMedia = calcularMediaAvaliacoes(avaliacoes);
        const totalAvaliacoes = avaliacoes.length;

        const localUsuario = dadosUsuario?.localizacao || null;
        const localProfissional = dados?.localizacao || null;
        const distanciaKm = calcularDistanciaKm(localUsuario, localProfissional);

        profissionaisBase.push({
          id: item.id,
          ...dados,
          avaliacaoMedia,
          totalAvaliacoes,
          distanciaKm,
          online: estaOnline(dados?.ultimoOnline || dados?.lastSeen || dados?.updatedAt),
        });
      }

      profissionaisBase.sort((a, b) => {
        const notaDiff = parseNumero(b?.avaliacaoMedia) - parseNumero(a?.avaliacaoMedia);
        if (notaDiff !== 0) return notaDiff;

        const totalDiff = parseNumero(b?.totalAvaliacoes) - parseNumero(a?.totalAvaliacoes);
        if (totalDiff !== 0) return totalDiff;

        return String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR');
      });

      setProfissionais(profissionaisBase);

      const favoritosSnap = await getDocs(collection(db, 'usuarios', user.uid, 'favoritos'));
      const favoritosLista = favoritosSnap.docs.map((item) => item.id);
      setFavoritosIds(favoritosLista);
    } catch (error) {
      console.log('Erro ao carregar HomeScreen:', error);
      Alert.alert('Erro', 'Não foi possível carregar a tela inicial.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(
      collection(db, 'usuarios', user.uid, 'notificacoes'),
      (snapshot) => {
        const total = snapshot.docs.filter((item) => !item.data()?.lida).length;
        setTotalNotificacoesNaoLidas(total);
      },
      (error) => {
        console.log('Erro ao acompanhar notificações:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const slidesComAds = useMemo(() => {
    const itens = [];

    SLIDES_CLIENTE.forEach((slide, index) => {
      itens.push({ tipo: 'slide', data: slide });

      if (index < SLIDES_CLIENTE.length - 1) {
        itens.push({ tipo: 'ad', id: `ad-slide-${index}` });
      }
    });

    return itens;
  }, []);

  useEffect(() => {
    if (!slidesComAds.length) return;

    const interval = setInterval(() => {
      setSlideIndex((prev) => {
        const next = (prev + 1) % slidesComAds.length;
        slidesRef.current?.scrollTo({
          x: next * (CLIENT_SLIDE_WIDTH + 12),
          animated: true,
        });
        return next;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [slidesComAds]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarTudo();
  }, [carregarTudo]);

  const pesquisar = () => {
    navigation.navigate('BuscaProfissionais', { busca });
  };

  const abrirPerfilCliente = () => {
    navigation.navigate('Perfil');
  };

  const executarAcaoSlide = (action) => {
    switch (action) {
      case 'buscar':
      case 'explorar':
        navigation.navigate('BuscaProfissionais');
        break;
      case 'agenda':
        navigation.navigate('MeusAgendamentosCliente');
        break;
      case 'perfil':
        navigation.navigate('Perfil');
        break;
      default:
        navigation.navigate('BuscaProfissionais');
        break;
    }
  };

  const executarAcaoCardInfo = (action) => {
    switch (action) {
      case 'buscar':
        navigation.navigate('BuscaProfissionais');
        break;
      case 'agenda':
        navigation.navigate('MeusAgendamentosCliente');
        break;
      case 'perfil':
        navigation.navigate('Perfil');
        break;
      default:
        navigation.navigate('BuscaProfissionais');
        break;
    }
  };

  const abrirCategoria = (categoria) => {
    navigation.navigate('BuscaProfissionais', {
      categoria: categoria?.nome,
    });
  };

  const abrirPerfilProfissional = (profissional) => {
    navigation.navigate('PerfilPublicoProfissional', {
      profissionalId: profissional?.id,
    });
  };

  const abrirMelhoresAvaliados = () => {
    navigation.navigate('BuscaProfissionais', {
      filtro: 'melhor_avaliado',
      destaque: 'melhores_avaliados',
    });
  };

  const toggleFavorito = async (profissional) => {
    try {
      const user = auth.currentUser;
      if (!user?.uid || !profissional?.id) return;

      const favoritoRef = doc(db, 'usuarios', user.uid, 'favoritos', profissional.id);
      const jaFavorito = favoritosIds.includes(profissional.id);

      if (jaFavorito) {
        await deleteDoc(favoritoRef);
        setFavoritosIds((prev) => prev.filter((id) => id !== profissional.id));
      } else {
        await setDoc(favoritoRef, {
          profissionalId: profissional.id,
          criadoEm: serverTimestamp(),
        });
        setFavoritosIds((prev) => [...prev, profissional.id]);
      }
    } catch (error) {
      console.log('Erro ao favoritar profissional:', error);
      Alert.alert('Erro', 'Não foi possível atualizar seus favoritos.');
    }
  };

  const profissionaisFiltrados = useMemo(() => {
    return profissionais.slice(0, 8);
  }, [profissionais]);

  const renderProfissionalCard = (profissional) => {
    const favorito = favoritosIds.includes(profissional.id);

    return (
      <TouchableOpacity
        key={profissional.id}
        style={styles.profCard}
        activeOpacity={0.92}
        onPress={() => abrirPerfilProfissional(profissional)}
      >
        <View style={styles.profTopRow}>
          <View style={styles.profAvatar}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
          </View>

          <TouchableOpacity
            style={styles.favoriteButton}
            activeOpacity={0.9}
            onPress={() => toggleFavorito(profissional)}
          >
            <Ionicons
              name={favorito ? 'heart' : 'heart-outline'}
              size={20}
              color={favorito ? '#EF4444' : colors.secondary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.profName} numberOfLines={1}>
          {profissional?.nome || profissional?.nomeFantasia || 'Profissional'}
        </Text>

        <Text style={styles.profCategory} numberOfLines={1}>
          {profissional?.especialidade || 'Serviços gerais'}
        </Text>

        <View style={styles.profMetaRow}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.profMetaText}>
            {parseNumero(profissional?.avaliacaoMedia).toFixed(1)} ({parseNumero(profissional?.totalAvaliacoes)})
          </Text>
        </View>

        {profissional?.distanciaKm != null && (
          <View style={styles.profMetaRow}>
            <Ionicons name="location-outline" size={14} color={colors.secondary} />
            <Text style={styles.profMetaText}>{profissional.distanciaKm} km</Text>
          </View>
        )}

        {profissional?.online && (
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online agora</Text>
          </View>
        )}

        <View style={styles.profActionRow}>
          <Text style={styles.profActionText}>Ver perfil público</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const montarCarrosselProfissionais = () => {
    if (!profissionaisFiltrados.length) {
      return (
        <View style={styles.emptyHorizontalBox}>
          <Text style={styles.emptyText}>Nenhum profissional encontrado no momento.</Text>
        </View>
      );
    }

    const elementos = [];

    profissionaisFiltrados.forEach((profissional, index) => {
      elementos.push(
        <View key={`prof-${profissional.id}`}>
          {renderProfissionalCard(profissional)}
        </View>
      );

      if (index === 1 || index === 4) {
        elementos.push(
          <NativeAdCard
            key={`native-prof-${index}`}
            width={CLIENT_PRO_CARD_WIDTH}
            height={CLIENT_PRO_CARD_HEIGHT}
            compact
          />
        );
      }
    });

    return elementos;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando tela inicial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#FFF" />
          <Text style={styles.offlineTextBanner}>Você está offline. Algumas informações podem estar desatualizadas.</Text>
        </View>
      )}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCircle} />
          <View style={styles.headerCircleTwo} />

          <View style={styles.headerBrandBlock}>
            <Image source={logo} style={styles.logo} />
            <View>
              <Text style={styles.helloText}>Olá, {primeiroNome} 👋</Text>
              <Text style={styles.pageTitle}>O que você precisa hoje?</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Notificacoes')}
            >
              <Ionicons name="notifications-outline" size={22} color="#FFF" />

              {totalNotificacoesNaoLidas > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {totalNotificacoesNaoLidas > 9 ? '9+' : totalNotificacoesNaoLidas}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              activeOpacity={0.9}
              onPress={abrirPerfilCliente}
            >
              <Ionicons name="person-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9AA0A6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar serviços ou profissionais"
            placeholderTextColor="#9AA0A6"
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={pesquisar}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={pesquisar} activeOpacity={0.9} style={styles.searchActionButton}>
            <Ionicons name="arrow-forward-circle" size={30} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={slidesRef}
          horizontal
          pagingEnabled={false}
          snapToInterval={CLIENT_SLIDE_WIDTH + 12}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slideCarouselContent}
          style={styles.slideCarousel}
        >
          {slidesComAds.map((item) =>
            item.tipo === 'slide' ? (
              <SlideCard
                key={item.data.id}
                item={item.data}
                onPress={() => executarAcaoSlide(item.data.action)}
              />
            ) : (
              <NativeAdCard
                key={item.id}
                width={CLIENT_SLIDE_WIDTH}
                height={280}
              />
            )
          )}
        </ScrollView>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <Ionicons name="rocket-outline" size={28} color="#fff" />
            </View>

            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>
                Tudo para facilitar seu atendimento
              </Text>
              <Text style={styles.heroSubtitle}>
                Explore categorias, descubra profissionais bem avaliados e acompanhe seus pedidos com facilidade.
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.statsRow}>
            {statsAtuais.map((item) => (
              <QuickStatCard
                key={item.id}
                label={item.label}
                value={item.value}
                icon={item.icon}
                color={item.color}
                onPress={() => executarAcaoCardInfo(item.action)}
              />
            ))}
          </View>
        </View>

        <AdBanner />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Explorar</Text>
            <Text style={styles.sectionTitle}>Categorias</Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('BuscaProfissionais', {
                verTodasCategorias: true,
              })
            }
          >
            <Text style={styles.seeAll}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoriesGrid}>
          {categorias.length > 0 ? (
            categorias.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.categoryCard}
                activeOpacity={0.9}
                onPress={() => abrirCategoria(item)}
              >
                <View style={styles.categoryIconBox}>
                  <Ionicons
                    name={getCategoryIcon(item.nome, item.icone)}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.categoryText} numberOfLines={2}>
                  {item.nome}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Nenhuma categoria encontrada ainda.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.featuresRow}>
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: '#FFF7E8' }]}
            activeOpacity={0.92}
            onPress={() => navigation.navigate('MeusAgendamentosCliente')}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(217,163,0,0.14)' }]}>
              <Ionicons name="flash-outline" size={20} color="#D9A300" />
            </View>
            <Text style={styles.featureTitle}>Agendamento rápido</Text>
            <Text style={styles.featureText}>Escolha e reserve em poucos toques</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: '#EEF9F1' }]}
            activeOpacity={0.92}
            onPress={() => navigation.navigate('BuscaProfissionais')}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(35,165,90,0.14)' }]}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#23A55A"
              />
            </View>
            <Text style={styles.featureTitle}>Profissionais confiáveis</Text>
            <Text style={styles.featureText}>Perfis completos e mais segurança</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: '#EEF4FF' }]}
            activeOpacity={0.92}
            onPress={abrirMelhoresAvaliados}
          >
            <View style={[styles.featureIconCircle, { backgroundColor: 'rgba(58,123,255,0.14)' }]}>
              <Ionicons name="star-outline" size={20} color="#3A7BFF" />
            </View>
            <Text style={styles.featureTitle}>Melhores avaliações</Text>
            <Text style={styles.featureText}>Encontre quem se destaca no app</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Destaques</Text>
            <Text style={styles.sectionTitle}>Profissionais em alta</Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('BuscaProfissionais')}>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalListContent}
        >
          {montarCarrosselProfissionais()}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F0F3F8',
  },

  offlineBanner: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  offlineTextBanner: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },

  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 28,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF3F9',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  headerCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -34,
    right: -18,
  },

  headerCircleTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -18,
    left: -10,
  },

  headerBrandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    zIndex: 2,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  helloText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.80)',
    marginBottom: 2,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: colors.textDark,
  },

  searchActionButton: {
    marginLeft: 8,
  },

  slideCarousel: {
    marginBottom: 20,
  },

  slideCarouselContent: {
    paddingRight: 8,
  },

  slideCard: {
    backgroundColor: '#0F172A',
    borderRadius: 26,
    padding: 20,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  slideDecorCircleOne: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -28,
    right: -30,
  },

  slideDecorCircleTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -18,
    left: -18,
  },

  slideContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  slideTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  slideMiniBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  slideMiniBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },

  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    lineHeight: 28,
  },

  slideSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 14,
  },

  slideButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  slideButtonText: {
    color: '#FFF',
    fontWeight: '800',
    marginRight: 8,
  },

  slideIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 5,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  heroIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  heroTextBox: {
    flex: 1,
  },

  heroTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },

  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginVertical: 16,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginHorizontal: 4,
  },

  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
  },

  statLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },

  sectionHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
  },

  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  categoryCard: {
    width: '31.5%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  categoryIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },

  emptyBox: {
    width: '100%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  emptyText: {
    color: colors.secondary,
    textAlign: 'center',
  },

  featuresRow: {
    marginBottom: 24,
  },

  featureCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },

  featureText: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },

  horizontalListContent: {
    paddingRight: 12,
  },

  emptyHorizontalBox: {
    width: 260,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  profCard: {
    width: CLIENT_PRO_CARD_WIDTH,
    height: CLIENT_PRO_CARD_HEIGHT,
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  profTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  profAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  favoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8FAFD',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
  },

  profCategory: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 10,
  },

  profMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  profMetaText: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.secondary,
  },

  onlineRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF9F1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    marginBottom: 10,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },

  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },

  profActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profActionText: {
    marginRight: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});