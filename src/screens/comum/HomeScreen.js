import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const FALLBACK_STATS_CLIENTE = [
  {
    id: '1',
    label: 'Explorar',
    value: 'Serviços',
    icon: 'search-outline',
    color: colors.primary,
  },
  {
    id: '2',
    label: 'Agenda',
    value: 'Cliente',
    icon: 'calendar-outline',
    color: colors.success || '#22C55E',
  },
  {
    id: '3',
    label: 'Perfil',
    value: 'Conta',
    icon: 'person-outline',
    color: '#7C3AED',
  },
];

const BANNERS_CLIENTE = [
  {
    id: '1',
    title: 'Encontre profissionais perto de você',
    subtitle: 'Descubra serviços confiáveis, bem avaliados e agende com rapidez.',
    icon: 'sparkles-outline',
    cta: 'Buscar agora',
    action: 'buscar',
  },
  {
    id: '2',
    title: 'Agende serviços em poucos toques',
    subtitle: 'Escolha categoria, horário e profissional de forma simples.',
    icon: 'flash-outline',
    cta: 'Explorar serviços',
    action: 'explorar',
  },
  {
    id: '3',
    title: 'Acompanhe tudo em um só lugar',
    subtitle: 'Veja seus agendamentos, favoritos e notificações sem complicação.',
    icon: 'notifications-outline',
    cta: 'Ver agenda',
    action: 'agenda',
  },
];

const BANNERS_PROFISSIONAL = [
  {
    id: '1',
    title: 'Seu painel profissional mais organizado',
    subtitle: 'Controle agenda, serviços, pedidos e avaliações em um só lugar.',
    icon: 'briefcase-outline',
    cta: 'Ver agenda',
    action: 'agendaPro',
  },
  {
    id: '2',
    title: 'Destaque seus serviços para novos clientes',
    subtitle: 'Mantenha seu perfil atualizado e aumente suas chances de agendamento.',
    icon: 'construct-outline',
    cta: 'Configurar serviços',
    action: 'servicos',
  },
  {
    id: '3',
    title: 'Acompanhe resultados do seu trabalho',
    subtitle: 'Veja ganhos, movimentação e evolução do seu atendimento.',
    icon: 'bar-chart-outline',
    cta: 'Ver financeiro',
    action: 'financeiro',
  },
];

const FILTROS_HOME = [
  {
    id: 'proximos',
    label: 'Mais próximos',
    icon: 'location-outline',
  },
  {
    id: 'avaliados',
    label: 'Melhor avaliados',
    icon: 'star-outline',
  },
  {
    id: 'online',
    label: 'Online agora',
    icon: 'radio-outline',
  },
];

function getPrimeiroNome(userData) {
  const nome =
    userData?.nomeCompleto ||
    userData?.nome ||
    userData?.nomeNegocio ||
    'Usuário';

  return String(nome).trim().split(' ')[0] || 'Usuário';
}

function getNomeProfissional(item) {
  return (
    item?.nomeNegocio ||
    item?.nome ||
    item?.nomeCompleto ||
    'Profissional'
  );
}

function getInitial(nome = '') {
  return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

function parseNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function getHojeStrLocal() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function normalizarTexto(value = '') {
  return String(value).trim().toLowerCase();
}

function getCategoryIcon(nome = '', iconeSalvo = '') {
  if (iconeSalvo) return iconeSalvo;

  const valor = normalizarTexto(nome);

  if (valor.includes('eletric')) return 'flash-outline';
  if (valor.includes('encan')) return 'build-outline';
  if (valor.includes('pint')) return 'color-palette-outline';
  if (valor.includes('pedre')) return 'hammer-outline';
  if (valor.includes('limpeza')) return 'sparkles-outline';
  if (valor.includes('faxina')) return 'sparkles-outline';
  if (valor.includes('jardin')) return 'leaf-outline';
  if (valor.includes('marcen')) return 'grid-outline';
  if (valor.includes('ar')) return 'snow-outline';
  if (valor.includes('cabel')) return 'cut-outline';
  if (valor.includes('barbe')) return 'person-outline';
  if (valor.includes('manicure')) return 'hand-left-outline';
  if (valor.includes('informat')) return 'laptop-outline';

  return 'briefcase-outline';
}

function getCidadeEstado(item) {
  const cidade =
    item?.localizacao?.cidade ||
    item?.cidade ||
    '';

  const estado =
    item?.localizacao?.estado ||
    item?.estado ||
    '';

  if (cidade && estado) return `${cidade} - ${estado}`;
  if (cidade) return cidade;
  return 'Local não informado';
}

function getAvatarPalette(nome = '') {
  const paletas = [
    {
      bg: '#EDE9FE',
      iconBg: '#DDD6FE',
      iconColor: '#6D28D9',
      textColor: '#5B21B6',
      ring: '#C4B5FD',
    },
    {
      bg: '#DBEAFE',
      iconBg: '#BFDBFE',
      iconColor: '#2563EB',
      textColor: '#1D4ED8',
      ring: '#93C5FD',
    },
    {
      bg: '#DCFCE7',
      iconBg: '#BBF7D0',
      iconColor: '#16A34A',
      textColor: '#15803D',
      ring: '#86EFAC',
    },
    {
      bg: '#FEF3C7',
      iconBg: '#FDE68A',
      iconColor: '#D97706',
      textColor: '#B45309',
      ring: '#FCD34D',
    },
    {
      bg: '#FCE7F3',
      iconBg: '#FBCFE8',
      iconColor: '#DB2777',
      textColor: '#BE185D',
      ring: '#F9A8D4',
    },
  ];

  const letra = getInitial(nome);
  const codigo = letra.charCodeAt(0) || 80;
  return paletas[codigo % paletas.length];
}

function getLatitude(obj) {
  const raw =
    obj?.localizacao?.latitude ??
    obj?.localizacao?.lat ??
    obj?.latitude ??
    obj?.lat;

  return parseNumber(raw, null);
}

function getLongitude(obj) {
  const raw =
    obj?.localizacao?.longitude ??
    obj?.localizacao?.lng ??
    obj?.localizacao?.lon ??
    obj?.longitude ??
    obj?.lng ??
    obj?.lon;

  return parseNumber(raw, null);
}

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const coords = [lat1, lon1, lat2, lon2];
  const temInvalido = coords.some(
    (valor) => typeof valor !== 'number' || Number.isNaN(valor)
  );

  if (temInvalido) return null;

  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTimestampMs(value) {
  if (!value) return null;

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : null;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return value;
  }

  const date = new Date(value);
  const time = date.getTime();

  return Number.isNaN(time) ? null : time;
}

function estaOnline(ultimoOnline) {
  const ultimoMs = getTimestampMs(ultimoOnline);
  if (!ultimoMs) return false;

  const agora = Date.now();
  const cincoMinutos = 5 * 60 * 1000;

  return agora - ultimoMs <= cincoMinutos;
}

function isTopAvaliado(avaliacao, totalAvaliacoes) {
  return avaliacao >= 4.7 && totalAvaliacoes >= 10;
}

function getDistanciaProfissional(item, userData) {
  const latUser = getLatitude(userData);
  const lonUser = getLongitude(userData);
  const latPro = getLatitude(item);
  const lonPro = getLongitude(item);

  return calcularDistanciaKm(latUser, lonUser, latPro, lonPro);
}

function compararProfissionaisPorRanking(a, b, userData) {
  const distanciaA = getDistanciaProfissional(a, userData);
  const distanciaB = getDistanciaProfissional(b, userData);

  const aTemDistancia = typeof distanciaA === 'number';
  const bTemDistancia = typeof distanciaB === 'number';

  if (aTemDistancia && bTemDistancia && distanciaA !== distanciaB) {
    return distanciaA - distanciaB;
  }

  if (aTemDistancia && !bTemDistancia) {
    return -1;
  }

  if (!aTemDistancia && bTemDistancia) {
    return 1;
  }

  const avaliacaoA = parseNumber(a?.avaliacaoMedia, 0);
  const avaliacaoB = parseNumber(b?.avaliacaoMedia, 0);

  if (avaliacaoB !== avaliacaoA) {
    return avaliacaoB - avaliacaoA;
  }

  const totalA = parseNumber(a?.totalAvaliacoes, 0);
  const totalB = parseNumber(b?.totalAvaliacoes, 0);

  if (totalB !== totalA) {
    return totalB - totalA;
  }

  const verificadoA = a?.verificado ? 1 : 0;
  const verificadoB = b?.verificado ? 1 : 0;

  if (verificadoB !== verificadoA) {
    return verificadoB - verificadoA;
  }

  return getNomeProfissional(a).localeCompare(getNomeProfissional(b));
}

function compararProfissionaisPorFiltro(a, b, userData, filtro) {
  if (filtro === 'online') {
    const onlineA = estaOnline(a?.ultimoOnline || a?.lastSeen || a?.updatedAt) ? 1 : 0;
    const onlineB = estaOnline(b?.ultimoOnline || b?.lastSeen || b?.updatedAt) ? 1 : 0;

    if (onlineB !== onlineA) {
      return onlineB - onlineA;
    }

    return compararProfissionaisPorRanking(a, b, userData);
  }

  if (filtro === 'avaliados') {
    const avaliacaoA = parseNumber(a?.avaliacaoMedia, 0);
    const avaliacaoB = parseNumber(b?.avaliacaoMedia, 0);

    if (avaliacaoB !== avaliacaoA) {
      return avaliacaoB - avaliacaoA;
    }

    const totalA = parseNumber(a?.totalAvaliacoes, 0);
    const totalB = parseNumber(b?.totalAvaliacoes, 0);

    if (totalB !== totalA) {
      return totalB - totalA;
    }

    const distanciaA = getDistanciaProfissional(a, userData);
    const distanciaB = getDistanciaProfissional(b, userData);

    const aTemDistancia = typeof distanciaA === 'number';
    const bTemDistancia = typeof distanciaB === 'number';

    if (aTemDistancia && bTemDistancia && distanciaA !== distanciaB) {
      return distanciaA - distanciaB;
    }

    return compararProfissionaisPorRanking(a, b, userData);
  }

  return compararProfissionaisPorRanking(a, b, userData);
}

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userData, setUserData] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [busca, setBusca] = useState('');
  const [totalNotificacoesNaoLidas, setTotalNotificacoesNaoLidas] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [favoritosMap, setFavoritosMap] = useState({});
  const [salvandoFavoritoId, setSalvandoFavoritoId] = useState(null);
  const [filtroProfissionais, setFiltroProfissionais] = useState('proximos');

  const [statsProfissional, setStatsProfissional] = useState([
    {
      id: '1',
      label: 'Hoje',
      value: '0',
      icon: 'calendar-outline',
      color: colors.primary,
    },
    {
      id: '2',
      label: 'Pendentes',
      value: '0',
      icon: 'time-outline',
      color: colors.warning || '#F59E0B',
    },
    {
      id: '3',
      label: 'Serviços',
      value: '0',
      icon: 'construct-outline',
      color: '#E91E63',
    },
  ]);

  const carregarResumoProfissional = useCallback(async (uid) => {
    try {
      const hojeStr = getHojeStrLocal();

      const agendamentosQuery = query(
        collection(db, 'agendamentos'),
        where('clinicaId', '==', uid)
      );

      const [agendamentosSnap, servicosSnap] = await Promise.all([
        getDocs(agendamentosQuery),
        getDocs(collection(db, 'usuarios', uid, 'servicos')),
      ]);

      let totalHoje = 0;
      let totalPendentes = 0;

      agendamentosSnap.forEach((docSnap) => {
        const dados = docSnap.data();
        const dataAgendamento =
          dados?.dataFiltro ||
          dados?.data ||
          dados?.dataAgendamento ||
          '';

        const status = normalizarTexto(dados?.status);

        if (dataAgendamento === hojeStr) {
          totalHoje += 1;
        }

        if (
          status === 'pendente' ||
          status === 'aguardando' ||
          status === 'aguardando_confirmacao'
        ) {
          totalPendentes += 1;
        }
      });

      setStatsProfissional([
        {
          id: '1',
          label: 'Hoje',
          value: String(totalHoje),
          icon: 'calendar-outline',
          color: colors.primary,
        },
        {
          id: '2',
          label: 'Pendentes',
          value: String(totalPendentes),
          icon: 'time-outline',
          color: colors.warning || '#F59E0B',
        },
        {
          id: '3',
          label: 'Serviços',
          value: String(servicosSnap.size),
          icon: 'construct-outline',
          color: '#E91E63',
        },
      ]);
    } catch (error) {
      console.log('Erro ao carregar resumo profissional:', error);
    }
  }, []);

  const carregarUsuarioAtual = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const docRef = doc(db, 'usuarios', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const dados = { id: docSnap.id, ...docSnap.data() };
        setUserData(dados);

        const isProfissional =
          dados?.tipo === 'profissional' || dados?.perfil === 'profissional';

        if (isProfissional) {
          await carregarResumoProfissional(user.uid);
        }

        return dados;
      }

      const fallback = {
        uid: user.uid,
        nomeCompleto: user.displayName || 'Usuário',
        email: user.email || '',
      };

      setUserData(fallback);
      return fallback;
    } catch (error) {
      console.log('Erro ao carregar usuário atual:', error);
      return null;
    }
  }, [carregarResumoProfissional]);

  const carregarCategorias = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categorias'));

      const lista = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
        .filter((item) => item?.nome)
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
        .slice(0, 8);

      setCategorias(lista);
    } catch (error) {
      console.log('Erro ao carregar categorias:', error);
      setCategorias([]);
    }
  }, []);

  const carregarFavoritos = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setFavoritosMap({});
        return;
      }

      const favoritosSnap = await getDocs(
        collection(db, 'usuarios', user.uid, 'favoritos')
      );

      const favoritosObj = {};
      favoritosSnap.forEach((docSnap) => {
        favoritosObj[docSnap.id] = true;
      });

      setFavoritosMap(favoritosObj);
    } catch (error) {
      console.log('Erro ao carregar favoritos:', error);
      setFavoritosMap({});
    }
  }, []);

  const carregarProfissionaisDestaque = useCallback(async () => {
    let listaBase = [];

    try {
      const snapTipo = await getDocs(
        query(collection(db, 'usuarios'), where('tipo', '==', 'profissional'))
      );

      if (!snapTipo.empty) {
        listaBase = snapTipo.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
      }
    } catch (error) {
      console.log('Erro ao carregar profissionais por tipo:', error);
    }

    if (listaBase.length === 0) {
      try {
        const snapPerfil = await getDocs(
          query(collection(db, 'usuarios'), where('perfil', '==', 'profissional'))
        );

        if (!snapPerfil.empty) {
          listaBase = snapPerfil.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
        }
      } catch (error) {
        console.log('Erro ao carregar profissionais por perfil:', error);
      }
    }

    setProfissionais(listaBase);
  }, []);

  const carregarHome = useCallback(async () => {
    try {
      await Promise.all([
        carregarUsuarioAtual(),
        carregarCategorias(),
        carregarProfissionaisDestaque(),
        carregarFavoritos(),
      ]);
    } catch (error) {
      console.log('Erro ao carregar HomeScreen:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    carregarCategorias,
    carregarFavoritos,
    carregarProfissionaisDestaque,
    carregarUsuarioAtual,
  ]);

  useEffect(() => {
    carregarHome();
  }, [carregarHome]);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setTotalNotificacoesNaoLidas(0);
      return;
    }

    const notificacoesRef = collection(db, 'usuarios', user.uid, 'notificacoes');

    const unsubscribe = onSnapshot(
      notificacoesRef,
      (snapshot) => {
        const naoLidas = snapshot.docs.filter((docSnap) => {
          const dados = docSnap.data();
          return !dados?.lida;
        }).length;

        setTotalNotificacoesNaoLidas(naoLidas);
      },
      (error) => {
        if (error?.code !== 'permission-denied') {
          console.log('Erro ao ouvir notificações:', error);
        }
        setTotalNotificacoesNaoLidas(0);
      }
    );

    return () => unsubscribe();
  }, []);

  const isProfissional = useMemo(() => {
    return (
      userData?.tipo === 'profissional' || userData?.perfil === 'profissional'
    );
  }, [userData]);

  const bannersAtuais = useMemo(() => {
    return isProfissional ? BANNERS_PROFISSIONAL : BANNERS_CLIENTE;
  }, [isProfissional]);

  useEffect(() => {
    if (!bannersAtuais.length) return;

    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % bannersAtuais.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [bannersAtuais]);

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarHome();
  };

  const primeiroNome = useMemo(() => getPrimeiroNome(userData), [userData]);

  const statsAtuais = useMemo(() => {
    return isProfissional ? statsProfissional : FALLBACK_STATS_CLIENTE;
  }, [isProfissional, statsProfissional]);

  const bannerAtual = bannersAtuais[bannerIndex] || bannersAtuais[0];

  const cidadeUsuario = useMemo(() => {
    return normalizarTexto(
      userData?.localizacao?.cidade ||
      userData?.cidade ||
      ''
    );
  }, [userData]);

  const profissionaisOrdenados = useMemo(() => {
    return [...profissionais].sort((a, b) =>
      compararProfissionaisPorFiltro(a, b, userData, filtroProfissionais)
    );
  }, [profissionais, userData, filtroProfissionais]);

  const profissionaisDestaque = useMemo(() => {
    return profissionaisOrdenados.slice(0, 10);
  }, [profissionaisOrdenados]);

  const profissionaisProximos = useMemo(() => {
    const baseOrdenada = [...profissionaisOrdenados];

    if (filtroProfissionais === 'online') {
      const onlinePrimeiro = baseOrdenada.filter((item) =>
        estaOnline(item?.ultimoOnline || item?.lastSeen || item?.updatedAt)
      );

      if (onlinePrimeiro.length > 0) {
        return onlinePrimeiro.slice(0, 10);
      }
    }

    if (!cidadeUsuario) {
      return baseOrdenada.slice(0, 10);
    }

    const mesmaCidade = baseOrdenada.filter((item) => {
      const cidadeProfissional = normalizarTexto(
        item?.localizacao?.cidade ||
        item?.cidade ||
        ''
      );
      return cidadeProfissional === cidadeUsuario;
    });

    if (mesmaCidade.length > 0) {
      return mesmaCidade.slice(0, 10);
    }

    return baseOrdenada.slice(0, 10);
  }, [profissionaisOrdenados, cidadeUsuario, filtroProfissionais]);

  const abrirCategoria = (item) => {
    navigation.navigate('BuscaProfissionais', {
      categoria: item.nome || '',
      categoriaSlug: item.slug || '',
      categoriaId: item.id || '',
    });
  };

  const abrirProfissional = (item) => {
    navigation.navigate('PerfilProfissional', {
      proId: item.id,
      profissionalId: item.id,
    });
  };

  const pesquisar = () => {
    navigation.navigate('BuscaProfissionais', {
      buscaInicial: busca,
    });
  };

  const executarAcaoBanner = () => {
    if (!bannerAtual?.action) return;

    if (bannerAtual.action === 'buscar' || bannerAtual.action === 'explorar') {
      navigation.navigate('BuscaProfissionais');
      return;
    }

    if (bannerAtual.action === 'agenda') {
      navigation.navigate('MeusAgendamentosCliente');
      return;
    }

    if (bannerAtual.action === 'agendaPro') {
      navigation.navigate('AgendaProfissional');
      return;
    }

    if (bannerAtual.action === 'servicos') {
      navigation.navigate('ConfigurarServicos');
      return;
    }

    if (bannerAtual.action === 'financeiro') {
      navigation.navigate('RelatoriosPro');
    }
  };

  const toggleFavorito = useCallback(async (profissional) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Atenção', 'Você precisa estar logado para favoritar.');
      return;
    }

    try {
      setSalvandoFavoritoId(profissional.id);

      const favoritoRef = doc(
        db,
        'usuarios',
        user.uid,
        'favoritos',
        profissional.id
      );

      const jaFavorito = !!favoritosMap[profissional.id];

      if (jaFavorito) {
        await deleteDoc(favoritoRef);

        setFavoritosMap((prev) => {
          const novoMapa = { ...prev };
          delete novoMapa[profissional.id];
          return novoMapa;
        });
      } else {
        await setDoc(favoritoRef, {
          profissionalId: profissional.id,
          nome: getNomeProfissional(profissional),
          especialidade:
            profissional.especialidade ||
            profissional.categoriaNome ||
            '',
          cidade:
            profissional?.localizacao?.cidade ||
            profissional?.cidade ||
            '',
          categoriaSlug: profissional?.categoriaSlug || '',
          categoriaId: profissional?.categoriaId || '',
          createdAt: serverTimestamp(),
        });

        setFavoritosMap((prev) => ({
          ...prev,
          [profissional.id]: true,
        }));
      }
    } catch (error) {
      console.log('Erro ao favoritar na Home:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os favoritos.');
    } finally {
      setSalvandoFavoritoId(null);
    }
  }, [favoritosMap]);

  const ActionCard = ({ title, subtitle, icon, color, onPress }) => (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.88} onPress={onPress}>
      <View style={[styles.actionIconWrapper, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>

      <View style={styles.actionTextArea}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9AA0A6" />
    </TouchableOpacity>
  );

  const QuickStatCard = ({ label, value, icon, color }) => (
    <View style={styles.quickStatCard}>
      <View style={[styles.quickStatIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );

  const FiltroChip = ({ item }) => {
    const ativo = filtroProfissionais === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          ativo && styles.filterChipActive,
        ]}
        activeOpacity={0.88}
        onPress={() => setFiltroProfissionais(item.id)}
      >
        <Ionicons
          name={item.icon}
          size={15}
          color={ativo ? '#FFF' : colors.primary}
        />
        <Text
          style={[
            styles.filterChipText,
            ativo && styles.filterChipTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const ProfissionalAvatar = ({ item, nome }) => {
    const [imagemFalhou, setImagemFalhou] = useState(false);
    const temFoto = !!item?.fotoPerfil && !imagemFalhou;
    const palette = getAvatarPalette(nome);
    const inicial = getInitial(nome);

    return (
      <View
        style={[
          styles.avatarBoxHorizontal,
          {
            backgroundColor: palette.bg,
            borderColor: palette.ring,
          },
        ]}
      >
        {temFoto ? (
          <Image
            source={{ uri: item.fotoPerfil }}
            style={styles.avatarImage}
            resizeMode="cover"
            onError={() => setImagemFalhou(true)}
          />
        ) : (
          <>
            <View style={styles.avatarGlow} />
            <View style={styles.avatarFallback}>
              <View
                style={[
                  styles.avatarIconMiniBox,
                  { backgroundColor: palette.iconBg },
                ]}
              >
                <Ionicons name="person" size={18} color={palette.iconColor} />
              </View>

              <Text
                style={[
                  styles.avatarTextHorizontal,
                  { color: palette.textColor },
                ]}
              >
                {inicial}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  const ProfissionalCardHorizontal = ({ item }) => {
    const nome = getNomeProfissional(item);
    const especialidade =
      item.especialidade || item.categoriaNome || 'Serviços gerais';
    const avaliacao = parseNumber(item.avaliacaoMedia, 0);
    const totalAvaliacoes = parseNumber(item.totalAvaliacoes, 0);
    const localizacao = getCidadeEstado(item);
    const verificado = !!item.verificado;
    const favorito = !!favoritosMap[item.id];
    const salvando = salvandoFavoritoId === item.id;

    const online = estaOnline(item?.ultimoOnline || item?.lastSeen || item?.updatedAt);
    const topAvaliado = isTopAvaliado(avaliacao, totalAvaliacoes);

    const distanciaKm = getDistanciaProfissional(item, userData);
    const distanciaTexto =
      typeof distanciaKm === 'number'
        ? `${distanciaKm.toFixed(1)} km • ${localizacao}`
        : localizacao;

    return (
      <TouchableOpacity
        style={styles.profCardHorizontal}
        activeOpacity={0.92}
        onPress={() => abrirProfissional(item)}
      >
        <View style={styles.profImageTop}>
          <View style={styles.profBackgroundAccent} />

          <TouchableOpacity
            style={styles.favoriteButtonCard}
            activeOpacity={0.9}
            onPress={() => toggleFavorito(item)}
          >
            {salvando ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={favorito ? 'heart' : 'heart-outline'}
                size={18}
                color={favorito ? '#E63946' : colors.primary}
              />
            )}
          </TouchableOpacity>

          <ProfissionalAvatar item={item} nome={nome} />

          {verificado && (
            <View style={styles.verifiedBadgeOverlay}>
              <Ionicons name="checkmark-circle" size={14} color="#23A55A" />
            </View>
          )}

          {topAvaliado && (
            <View style={styles.badgeTop}>
              <Ionicons name="star" size={11} color="#FFF" />
              <Text style={styles.badgeTopText}>Top</Text>
            </View>
          )}
        </View>

        <View style={styles.profCardContent}>
          <Text style={styles.profNameHorizontal} numberOfLines={1}>
            {nome}
          </Text>

          <Text style={styles.profCategoryHorizontal} numberOfLines={1}>
            {especialidade}
          </Text>

          <View style={styles.miniInfoRow}>
            <Ionicons name="star" size={13} color="#F4B400" />
            <Text style={styles.miniInfoText}>
              {avaliacao.toFixed(1)} ({totalAvaliacoes})
            </Text>
          </View>

          <View style={styles.miniInfoRow}>
            <Ionicons name="location-outline" size={13} color={colors.secondary} />
            <Text style={styles.miniInfoText} numberOfLines={1}>
              {distanciaTexto}
            </Text>
          </View>

          {online && (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online agora</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} />

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notificationButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Notificacoes')}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.textDark} />

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
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Perfil')}
            >
              <Ionicons name="person-outline" size={22} color={colors.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.helloText}>Olá, {primeiroNome} 👋</Text>
        <Text style={styles.pageTitle}>
          {isProfissional
            ? 'Seu painel profissional'
            : 'O que você precisa hoje?'}
        </Text>

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
          <TouchableOpacity onPress={pesquisar} activeOpacity={0.85}>
            <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bannerCard}>
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextArea}>
              <Text style={styles.bannerTitle}>
                {bannerAtual?.title}
              </Text>
              <Text style={styles.bannerSubtitle}>
                {bannerAtual?.subtitle}
              </Text>

              <TouchableOpacity
                style={styles.bannerButton}
                activeOpacity={0.9}
                onPress={executarAcaoBanner}
              >
                <Text style={styles.bannerButtonText}>{bannerAtual?.cta}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.bannerIconBox}>
              <Ionicons name={bannerAtual?.icon || 'sparkles-outline'} size={34} color="#FFF" />
            </View>
          </View>

          <View style={styles.bannerDots}>
            {bannersAtuais.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.bannerDot,
                  index === bannerIndex && styles.bannerDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBox}>
              <Ionicons
                name={isProfissional ? 'briefcase-outline' : 'rocket-outline'}
                size={28}
                color="#fff"
              />
            </View>

            <View style={styles.heroTextBox}>
              <Text style={styles.heroTitle}>
                {isProfissional
                  ? 'Tudo importante na sua mão'
                  : 'Tudo para facilitar seu atendimento'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isProfissional
                  ? 'Acompanhe agenda, pedidos, serviços e notificações do dia em um só lugar.'
                  : 'Explore categorias, descubra profissionais bem avaliados e acompanhe seus pedidos com facilidade.'}
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
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>

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
                activeOpacity={0.88}
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
          <View style={[styles.featureCard, { backgroundColor: '#FFF7E8' }]}>
            <Ionicons name="flash-outline" size={22} color="#D9A300" />
            <Text style={styles.featureText}>Agendamento rápido</Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: '#EEF9F1' }]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#23A55A"
            />
            <Text style={styles.featureText}>Profissionais confiáveis</Text>
          </View>

          <View style={[styles.featureCard, { backgroundColor: '#EEF4FF' }]}>
            <Ionicons name="star-outline" size={22} color="#3A7BFF" />
            <Text style={styles.featureText}>Melhores avaliações</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profissionais próximos de você</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('BuscaProfissionais')}
          >
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTROS_HOME.map((item) => (
            <FiltroChip key={item.id} item={item} />
          ))}
        </ScrollView>

        {profissionaisProximos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
          >
            {profissionaisProximos.map((item) => (
              <ProfissionalCardHorizontal key={`perto-${item.id}`} item={item} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyProfCard}>
            <Ionicons name="location-outline" size={26} color={colors.secondary} />
            <Text style={styles.emptyProfTitle}>
              Ainda não encontramos profissionais para este filtro
            </Text>
            <Text style={styles.emptyProfText}>
              Tente trocar o filtro ou volte mais tarde para ver novas opções.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profissionais em destaque</Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('BuscaProfissionais')}
          >
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {profissionaisDestaque.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalListContent}
          >
            {profissionaisDestaque.map((item) => (
              <ProfissionalCardHorizontal key={`destaque-${item.id}`} item={item} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyProfCard}>
            <Ionicons name="people-outline" size={26} color={colors.secondary} />
            <Text style={styles.emptyProfTitle}>
              Ainda não há profissionais em destaque
            </Text>
            <Text style={styles.emptyProfText}>
              Assim que os profissionais começarem a se cadastrar e receber avaliações, eles aparecerão aqui.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Ações rápidas</Text>

        {!isProfissional && (
          <View style={styles.section}>
            <ActionCard
              title="Buscar Serviços"
              subtitle="Encontre profissionais disponíveis"
              icon="search-outline"
              color={colors.primary}
              onPress={() => navigation.navigate('BuscaProfissionais')}
            />

            <ActionCard
              title="Meus Agendamentos"
              subtitle="Acompanhe seus horários e pedidos"
              icon="calendar-outline"
              color={colors.success || '#22C55E'}
              onPress={() => navigation.navigate('MeusAgendamentosCliente')}
            />

            <ActionCard
              title="Dependentes"
              subtitle="Gerencie menores vinculados"
              icon="people-outline"
              color="#7C3AED"
              onPress={() => navigation.navigate('ListaMenores')}
            />

            <ActionCard
              title="Notificações"
              subtitle="Veja novidades e atualizações"
              icon="notifications-outline"
              color="#F59E0B"
              onPress={() => navigation.navigate('Notificacoes')}
            />
          </View>
        )}

        {isProfissional && (
          <View style={styles.section}>
            <ActionCard
              title="Agenda"
              subtitle="Veja sua agenda e pedidos"
              icon="today-outline"
              color={colors.primary}
              onPress={() => navigation.navigate('AgendaProfissional')}
            />

            <ActionCard
              title="Serviços"
              subtitle="Configure o que você oferece"
              icon="construct-outline"
              color={colors.warning || '#F59E0B'}
              onPress={() => navigation.navigate('ConfigurarServicos')}
            />

            <ActionCard
              title="Financeiro"
              subtitle="Acompanhe ganhos e relatórios"
              icon="bar-chart-outline"
              color="#E91E63"
              onPress={() => navigation.navigate('RelatoriosPro')}
            />

            <ActionCard
              title="Equipe"
              subtitle="Gerencie colaboradores"
              icon="people-circle-outline"
              color="#607D8B"
              onPress={() => navigation.navigate('GerenciarColaboradores')}
            />

            <ActionCard
              title="Notificações"
              subtitle="Acompanhe novidades e avaliações"
              icon="notifications-outline"
              color="#F59E0B"
              onPress={() => navigation.navigate('Notificacoes')}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.secondary,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logo: {
    width: 150,
    height: 56,
    resizeMode: 'contain',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  helloText: {
    marginTop: 14,
    fontSize: 14,
    color: colors.secondary,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 4,
    marginBottom: 18,
  },

  searchBox: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    fontSize: 15,
    color: colors.textDark,
  },

  bannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
    lineHeight: 26,
  },

  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 14,
  },

  bannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerButtonText: {
    color: '#FFF',
    fontWeight: '800',
    marginRight: 8,
  },

  bannerIconBox: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bannerDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginRight: 6,
  },

  bannerDotActive: {
    width: 20,
    backgroundColor: '#FFF',
  },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 22,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  heroTextBox: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },

  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.92)',
  },

  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 18,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  quickStatCard: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  quickStatIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  quickStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },

  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 14,
  },

  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  categoryCard: {
    width: '23%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 98,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  categoryIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F4F6FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
    lineHeight: 16,
  },

  emptyBox: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },

  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  featureCard: {
    width: '31.5%',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },

  featureText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textDark,
    lineHeight: 16,
  },

  filtersRow: {
    paddingBottom: 12,
    paddingRight: 4,
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },

  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  filterChipTextActive: {
    color: '#FFF',
  },

  horizontalListContent: {
    paddingBottom: 6,
    paddingRight: 4,
  },

  profCardHorizontal: {
    width: 220,
    backgroundColor: '#FFF',
    borderRadius: 22,
    marginRight: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  profImageTop: {
    height: 120,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  profBackgroundAccent: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -36,
    right: -18,
  },

  favoriteButtonCard: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 2,
  },

  avatarBoxHorizontal: {
    width: 78,
    height: 78,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  avatarFallback: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarIconMiniBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  avatarTextHorizontal: {
    fontSize: 24,
    fontWeight: '800',
  },

  verifiedBadgeOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  badgeTop: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: '#F4B400',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  badgeTopText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },

  profCardContent: {
    padding: 14,
  },

  profNameHorizontal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },

  profCategoryHorizontal: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 10,
  },

  miniInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  miniInfoText: {
    marginLeft: 5,
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
    flex: 1,
  },

  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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
    color: '#22C55E',
  },

  emptyProfCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 24,
  },

  emptyProfTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },

  emptyProfText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: colors.secondary,
    textAlign: 'center',
  },

  section: {
    marginBottom: 12,
  },

  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  actionIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  actionTextArea: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 3,
  },

  actionSubtitle: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
});