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
          <View style={styles.resultMainRow}>
            <View style={styles.resultAvatar}>
              {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.resultAvatarImage} /> : (
                <Text style={styles.resultAvatarText}>{getInitial(getNomeProfissional(item))}</Text>
              )}
            </View>

            <View style={styles.resultIdentity}>
              <View style={styles.resultNameRow}>
              <Text style={[styles.resultName, { flexShrink: 1 }]} numberOfLines={1}>{getNomeProfissional(item)}</Text>
              {temSeloVerificado(item?.planoAtivo) && (
                  <Ionicons name="checkmark-circle" size={17} color={colors.primary} style={{ marginLeft: 5 }} />
              )}
              </View>
              <Text style={styles.resultSub} numberOfLines={1}>{getEspecialidadeProfissional(item)}</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
              <View style={styles.infoBadge}>
                <Ionicons name="star" size={12} color="#F4B400" />
              <Text style={styles.infoBadgeText} numberOfLines={1}>{textoAvaliacao(item)}</Text>
              </View>
              <View style={styles.infoBadge}>
                <Ionicons name="location-outline" size={12} color={colors.primary} />
              <Text style={styles.infoBadgeText} numberOfLines={1}>{getCidadeProfissional(item)}</Text>
              </View>
          </View>

          <View style={styles.resultFooter}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDotSmall, { backgroundColor: item?.atendendo ? '#22C55E' : '#94A3B8' }]} />
              <Text style={styles.statusText}>{item?.atendendo ? 'Disponível agora' : 'Ver disponibilidade'}</Text>
            </View>
            <TouchableOpacity style={styles.profileLink} onPress={() => abrirPerfil(item)}>
              <Text style={styles.profileLinkText}>Ver perfil</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [abrirPerfil, favoritosMap, salvandoFavoritoId, selectedPro, toggleFavorito, textoAvaliacao]);

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
            <View style={styles.selectedEyebrowRow}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.selectedEyebrow}>PROFISSIONAL EM DESTAQUE</Text>
            </View>
            <View style={styles.proCardContent}>
              <View style={styles.selectedAvatar}>
                {getAvatarUri(selectedPro) ? (
                  <Image source={{ uri: getAvatarUri(selectedPro) }} style={styles.resultAvatarImage} />
                ) : (
                  <Text style={styles.selectedAvatarText}>{getInitial(getNomeProfissional(selectedPro))}</Text>
                )}
              </View>
              <View style={styles.selectedInfo}>
                <View style={styles.resultNameRow}>
                  <Text style={styles.proName} numberOfLines={1}>{getNomeProfissional(selectedPro)}</Text>
                {temSeloVerificado(selectedPro?.planoAtivo) && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 5 }} />
                )}
              </View>
                <Text style={styles.proSpec} numberOfLines={1}>{getEspecialidadeProfissional(selectedPro)}</Text>
              </View>
              <View style={styles.viewBtn}>
                <Text style={styles.viewBtnText}>Ver perfil</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
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
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.resultsEyebrow}>PROFISSIONAIS</Text>
              <Text style={styles.resultsTitle}>Resultados</Text>
            </View>
            <View style={styles.resultsCountBadge}>
              <Text style={styles.resultsCountText}>{profissionaisFiltrados.length}</Text>
            </View>
          </View>
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
  container: { flex: 1, backgroundColor: colors.background },
  topArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.primaryDark,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backButton: {
    width: 42,
    height: 42,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pageTitle: { fontSize: 21, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.68)', marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: colors.textDark },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 36 },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  resultCardSelected: { borderColor: '#93B4F8', backgroundColor: '#FBFDFF' },
  badgeDestaque: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', marginLeft: 3, letterSpacing: 0.5 },
  favoriteFloatButton: { position: 'absolute', top: 12, right: 12, zIndex: 10, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  resultContent: { paddingTop: 26 },
  resultMainRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 36 },
  resultAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  resultAvatarImage: { width: '100%', height: '100%' },
  resultAvatarText: { fontSize: 21, fontWeight: '800', color: colors.primary },
  resultIdentity: { flex: 1, marginLeft: 13, minWidth: 0 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  resultName: { fontSize: 17, fontWeight: '800', color: colors.textDark },
  resultSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  badgesRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  infoBadge: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceMuted, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10 },
  infoBadgeText: { flex: 1, fontSize: 11, marginLeft: 4, color: colors.textSecondary },
  resultFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  profileLink: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  profileLinkText: { fontSize: 12, fontWeight: '800', color: colors.primary, marginRight: 5 },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  proCard: { backgroundColor: colors.surface, borderRadius: 22, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: colors.border, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  selectedEyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  selectedEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: colors.primary, marginLeft: 6 },
  proCardContent: { flexDirection: 'row', alignItems: 'center' },
  selectedAvatar: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primarySoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontSize: 20, fontWeight: '800', color: colors.primary },
  selectedInfo: { flex: 1, minWidth: 0, marginLeft: 12 },
  proName: { flexShrink: 1, color: colors.textDark, fontSize: 16, fontWeight: '800' },
  proSpec: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, height: 38, borderRadius: 12, marginLeft: 10 },
  viewBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800', marginRight: 5 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 14 },
  resultsEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.primary, marginBottom: 3 },
  resultsTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark },
  resultsCountBadge: { minWidth: 34, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  resultsCountText: { fontSize: 13, fontWeight: '800', color: colors.primary },
});
