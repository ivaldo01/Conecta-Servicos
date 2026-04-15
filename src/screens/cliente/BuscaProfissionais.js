import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Keyboard,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { getPrioridadeBusca, getPlanoProfissional, temSeloVerificado } from "../../constants/plans";
import BannerAd from "../../components/ads/BannerAd";

// --- Funções Auxiliares ---
function parseCoord(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'string' ? parseFloat(String(valor).replace(',', '.')) : Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarTexto(texto = '') {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function getNomeProfissional(profissional) {
  return profissional?.nome || profissional?.nomeCompleto || profissional?.nomeNegocio || profissional?.nomeFantasia || "Profissional";
}

function getAvatarUri(profissional) {
  return profissional?.fotoPerfil || profissional?.foto || profissional?.avatar || profissional?.photoURL || profissional?.photoUrl || profissional?.fotoUrl || profissional?.imageUrl || null;
}

function getBannerUri(profissional) {
  return profissional?.bannerPerfil || profissional?.banner || profissional?.capaPerfil || profissional?.capa || profissional?.bannerUrl || profissional?.imagemBanner || profissional?.fotoBanner || null;
}

function getCidadeProfissional(item) {
  return item?.localizacao?.cidade || item?.cidade || 'Cidade não informada';
}

function getEstadoProfissional(item) {
  return item?.localizacao?.estado || item?.estado || '';
}

function getEspecialidadeProfissional(item) {
  return item?.especialidade || item?.categoriaNome || item?.nomeNegocio || 'Especialidade não informada';
}

function temCoordenadasValidas(item) {
  return item?.latitudeParsed !== null && item?.longitudeParsed !== null && item?.latitudeParsed !== 0 && item?.longitudeParsed !== 0;
}

function getInitial(nome = '') {
  return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

function ordenarProfissionais(lista, cidadeCliente = '') {
  return [...lista].sort((a, b) => {
    if (cidadeCliente) {
      const aMesmaCidade = normalizarTexto(getCidadeProfissional(a)) === normalizarTexto(cidadeCliente);
      const bMesmaCidade = normalizarTexto(getCidadeProfissional(b)) === normalizarTexto(cidadeCliente);
      if (aMesmaCidade !== bMesmaCidade) return aMesmaCidade ? -1 : 1;
    }

    const prioridadeA = getPrioridadeBusca(a?.planoAtivo);
    const prioridadeB = getPrioridadeBusca(b?.planoAtivo);
    if (prioridadeB !== prioridadeA) return prioridadeB - prioridadeA;
    if (Number(b.favorito) !== Number(a.favorito)) return Number(b.favorito) - Number(a.favorito);
    const distanciaA = Number(a.distanciaMetros ?? Infinity);
    const distanciaB = Number(b.distanciaMetros ?? Infinity);
    if (distanciaA !== distanciaB) return distanciaA - distanciaB;
    const ratingA = Number(a.rating ?? 0);
    const ratingB = Number(b.rating ?? 0);
    if (ratingB !== ratingA) return ratingB - ratingA;
    return (b.numAvaliacoes ?? 0) - (a.numAvaliacoes ?? 0);
  });
}

// --- Componente Principal ---
export default function BuscaProfissionais({ navigation, route }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(route?.params?.buscaInicial || '');
  const [selectedPro, setSelectedPro] = useState(null);
  const [favoritosMap, setFavoritosMap] = useState({});
  const [salvandoFavoritoId, setSalvandoFavoritoId] = useState(null);

  const categoriaSelecionada = route?.params?.categoria || '';
  const categoriaSlugSelecionada = route?.params?.categoriaSlug || '';
  const categoriaIdSelecionada = route?.params?.categoriaId || '';
  const verTodasCategorias = !!route?.params?.verTodasCategorias;

  useEffect(() => {
    setBusca(route?.params?.buscaInicial || '');
  }, [route?.params?.buscaInicial]);

  const carregarProfissionaisBase = useCallback(async () => {
    let listaBase = [];
    try {
      const q = query(collection(db, "usuarios"), where("tipo", "==", "profissional"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        listaBase = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
    }
    return listaBase;
  }, []);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const profissionaisBase = await carregarProfissionaisBase();

      let favoritosObj = {};
      let cidadeCliente = '';
      if (user) {
        const favSnap = await getDocs(collection(db, "usuarios", user.uid, "favoritos"));
        favSnap.forEach(d => { favoritosObj[d.id] = true; });

        try {
          const userSnap = await getDoc(doc(db, "usuarios", user.uid));
          if (userSnap.exists()) {
            const ud = userSnap.data();
            cidadeCliente = ud?.localizacao?.cidade || ud?.cidade || '';
          }
        } catch (err) { }
      }
      setFavoritosMap(favoritosObj);

      const avaliacoesAgrupadas = {};
      // Simplificação para performance: idealmente carregar isso via Cloud Function ou campo denormalizado
      for (const p of profissionaisBase) {
        const avSnap = await getDocs(collection(db, "usuarios", p.id, "avaliacoes"));
        let soma = 0;
        avSnap.forEach(d => soma += (d.data().nota || 0));
        avaliacoesAgrupadas[p.id] = { soma, quantidade: avSnap.size };
      }

      const lista = profissionaisBase.map(dados => {
        const resumo = avaliacoesAgrupadas[dados.id] || { soma: 0, quantidade: 0 };
        return {
          ...dados,
          latitudeParsed: parseCoord(dados?.localizacao?.latitude || dados?.latitude),
          longitudeParsed: parseCoord(dados?.localizacao?.longitude || dados?.longitude),
          mediaAvaliacao: resumo.quantidade > 0 ? resumo.soma / resumo.quantidade : 0,
          quantidadeAvaliacoes: resumo.quantidade,
          favorito: !!favoritosObj[dados.id],
        };
      });

      const ordenada = ordenarProfissionais(lista, cidadeCliente);
      setProfissionais(ordenada);
      if (ordenada.length > 0) setSelectedPro(ordenada[0]);
    } catch (e) {
      Alert.alert("Erro", "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [carregarProfissionaisBase]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const toggleFavorito = useCallback(async (profissional) => {
    const user = auth.currentUser;
    if (!user) return Alert.alert("Atenção", "Faça login para favoritar.");

    try {
      setSalvandoFavoritoId(profissional.id);
      const favoritoRef = doc(db, "usuarios", user.uid, "favoritos", profissional.id);
      const snap = await getDoc(favoritoRef);

      if (snap.exists()) {
        await deleteDoc(favoritoRef);
        setFavoritosMap(prev => ({ ...prev, [profissional.id]: false }));
      } else {
        await setDoc(favoritoRef, {
          profissionalId: profissional.id,
          nome: getNomeProfissional(profissional),
          createdAt: serverTimestamp(),
        });
        setFavoritosMap(prev => ({ ...prev, [profissional.id]: true }));
      }
      carregarDados(); // Recarrega para ordenar
    } catch (e) {
      Alert.alert("Erro", "Não foi possível atualizar favorito.");
    } finally {
      setSalvandoFavoritoId(null);
    }
  }, [carregarDados]);

  const profissionaisFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return profissionais.filter(p => {
      const correspondeCategoria = verTodasCategorias || !categoriaSelecionada ||
        normalizarTexto(p.especialidade).includes(normalizarTexto(categoriaSelecionada));
      const correspondeBusca = !termo || normalizarTexto(getNomeProfissional(p)).includes(termo);
      return correspondeCategoria && correspondeBusca;
    });
  }, [profissionais, busca, categoriaSelecionada, verTodasCategorias]);

  const abrirPerfil = useCallback((pro) => {
    navigation.navigate("PerfilPublicoProfissional", { proId: pro.id });
  }, [navigation]);

  const textoAvaliacao = useCallback((item) => {
    if (!item.quantidadeAvaliacoes) return "Sem avaliações";
    return `${item.mediaAvaliacao.toFixed(1)} (${item.quantidadeAvaliacoes})`;
  }, []);

  const renderResultado = useCallback(({ item }) => {
    const avatarUri = getAvatarUri(item);
    const favorito = favoritosMap[item.id];
    const salvando = salvandoFavoritoId === item.id;
    const selecionado = selectedPro?.id === item.id;
    const planoId = item?.planoAtivo || 'pro_iniciante';
    const prioridade = getPrioridadeBusca(planoId);

    return (
      <TouchableOpacity
        style={[styles.resultCard, selecionado && styles.resultCardSelected]}
        onPress={() => setSelectedPro(item)}
      >
        {prioridade > 0 && (
          <View style={[styles.badgeDestaque, { backgroundColor: prioridade >= 3 ? '#9B59B6' : '#3498DB' }]}>
            <Ionicons name="star" size={10} color="#FFF" />
            <Text style={styles.badgeText}>{prioridade >= 3 ? 'TOP' : 'DESTAQUE'}</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => toggleFavorito(item)} style={styles.favoriteFloatButton}>
          {salvando ? <ActivityIndicator size="small" color={colors.primary} /> : (
            <Ionicons name={favorito ? "heart" : "heart-outline"} size={19} color={favorito ? "#E63946" : colors.primary} />
          )}
        </TouchableOpacity>

        <View style={styles.resultContent}>
          <View style={styles.resultAvatarWrapper}>
            <View style={styles.resultAvatar}>
              {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.resultAvatarImage} /> : (
                <Text style={styles.resultAvatarText}>{getInitial(getNomeProfissional(item))}</Text>
              )}
            </View>
          </View>

          <View style={{ marginLeft: 70 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.resultName, { flexShrink: 1 }]} numberOfLines={1}>{getNomeProfissional(item)}</Text>
              {temSeloVerificado(item?.planoAtivo) && (
                <Ionicons name="checkmark-circle" size={16} color="#3498DB" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.resultSub} numberOfLines={1}>{getEspecialidadeProfissional(item)}</Text>

            <View style={styles.badgesRow}>
              <View style={styles.infoBadge}>
                <Ionicons name="star" size={12} color="#F4B400" />
                <Text style={styles.infoBadgeText}>{textoAvaliacao(item)}</Text>
              </View>
              <View style={styles.infoBadge}>
                <Ionicons name="location-outline" size={12} color={colors.primary} />
                <Text style={styles.infoBadgeText}>{getCidadeProfissional(item)}</Text>
              </View>
              <View style={[styles.infoBadge, { backgroundColor: item?.atendendo ? '#DCFCE7' : '#F1F5F9' }]}>
                <View style={[styles.statusDotSmall, { backgroundColor: item?.atendendo ? '#22C55E' : '#94A3B8' }]} />
                <Text style={[styles.infoBadgeText, { color: item?.atendendo ? '#166534' : '#64748B', fontWeight: 'bold' }]}>
                  {item?.atendendo ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [favoritosMap, salvandoFavoritoId, selectedPro, toggleFavorito, textoAvaliacao]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topArea}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Buscar profissionais</Text>
            <Text style={styles.pageSubtitle}>{categoriaSelecionada || 'Todos os serviços'}</Text>
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput style={styles.input} placeholder="Nome ou serviço..." value={busca} onChangeText={setBusca} />
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {selectedPro && (
          <TouchableOpacity style={styles.proCard} onPress={() => abrirPerfil(selectedPro)}>
            <View style={styles.proCardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <Text style={[styles.proName, { marginBottom: 0, flexShrink: 1 }]}>{getNomeProfissional(selectedPro)}</Text>
                {temSeloVerificado(selectedPro?.planoAtivo) && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginLeft: 6 }} />
                )}
              </View>
              <Text style={styles.proSpec}>{getEspecialidadeProfissional(selectedPro)}</Text>
              <View style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>Ver Perfil Completo</Text>
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Anúncio Patrocinado */}
        <BannerAd
          tipo="card"
          style={{ marginBottom: 16 }}
        />

        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Resultados ({profissionaisFiltrados.length})</Text>
          {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
            <FlatList
              data={profissionaisFiltrados}
              keyExtractor={(item) => item.id}
              renderItem={renderResultado}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF3F9' },
  topArea: { padding: 16, backgroundColor: colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  backButton: { marginRight: 12, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  pageSubtitle: { fontSize: 13, color: '#DDD' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 15, paddingHorizontal: 15, height: 50 },
  input: { flex: 1, marginLeft: 10 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 15, marginBottom: 12, elevation: 2, position: 'relative' },
  resultCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  badgeDestaque: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: 5, zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold', marginLeft: 3 },
  favoriteFloatButton: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
  resultAvatarWrapper: { position: 'absolute', left: 15, top: 15 },
  resultAvatar: { width: 55, height: 55, borderRadius: 27, backgroundColor: '#EEE', overflow: 'hidden', borderWidth: 2, borderColor: '#FFF' },
  resultAvatarImage: { width: '100%', height: '100%' },
  resultAvatarText: { fontSize: 20, fontWeight: 'bold', color: colors.primary, textAlign: 'center', lineHeight: 50 },
  resultName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  resultSub: { fontSize: 13, color: '#777', marginVertical: 3 },
  badgesRow: { flexDirection: 'row', marginTop: 5 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 10, backgroundColor: '#F0F0F0', padding: 4, borderRadius: 5 },
  infoBadgeText: { fontSize: 11, marginLeft: 3, color: '#555' },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  proCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 20, marginBottom: 20 },
  proName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  proSpec: { color: '#EEE', fontSize: 14, marginTop: 5 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 10, alignSelf: 'flex-start' },
  viewBtnText: { color: '#FFF', fontWeight: 'bold', marginRight: 5 },
  resultsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }
});