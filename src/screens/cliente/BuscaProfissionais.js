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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
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

const REGIAO_PADRAO = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

function parseCoord(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero =
    typeof valor === 'string'
      ? parseFloat(valor.replace(',', '.'))
      : Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function getNomeProfissional(profissional) {
  return (
    profissional.nome ||
    profissional.nomeCompleto ||
    profissional.nomeNegocio ||
    "Profissional"
  );
}

function temCoordenadasValidas(item) {
  return (
    item.latitudeParsed !== null &&
    item.longitudeParsed !== null &&
    item.latitudeParsed !== 0 &&
    item.longitudeParsed !== 0
  );
}

function ordenarProfissionais(lista) {
  return [...lista].sort((a, b) => {
    if (Number(b.favorito) !== Number(a.favorito)) {
      return Number(b.favorito) - Number(a.favorito);
    }

    if (b.mediaAvaliacao !== a.mediaAvaliacao) {
      return b.mediaAvaliacao - a.mediaAvaliacao;
    }

    if (b.quantidadeAvaliacoes !== a.quantidadeAvaliacoes) {
      return b.quantidadeAvaliacoes - a.quantidadeAvaliacoes;
    }

    const nomeA = getNomeProfissional(a).toLowerCase();
    const nomeB = getNomeProfissional(b).toLowerCase();

    return nomeA.localeCompare(nomeB);
  });
}

export default function BuscaProfissionais({ navigation, route }) {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState(route?.params?.buscaInicial || '');
  const [region, setRegion] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [favoritosMap, setFavoritosMap] = useState({});
  const [salvandoFavoritoId, setSalvandoFavoritoId] = useState(null);

  const categoriaSelecionada = route?.params?.categoria || '';
  const categoriaSlugSelecionada = route?.params?.categoriaSlug || '';
  const categoriaIdSelecionada = route?.params?.categoriaId || '';
  const verTodasCategorias = !!route?.params?.verTodasCategorias;

  const carregarProfissionaisBase = useCallback(async () => {
    try {
      const profissionaisPorTipoQuery = query(
        collection(db, "usuarios"),
        where("tipo", "==", "profissional")
      );

      const profissionaisPorTipoSnap = await getDocs(profissionaisPorTipoQuery);

      if (!profissionaisPorTipoSnap.empty) {
        return profissionaisPorTipoSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      }
    } catch (error) {
      console.log("Erro ao carregar profissionais por tipo:", error);
    }

    try {
      const profissionaisPorPerfilQuery = query(
        collection(db, "usuarios"),
        where("perfil", "==", "profissional")
      );

      const profissionaisPorPerfilSnap = await getDocs(profissionaisPorPerfilQuery);

      if (!profissionaisPorPerfilSnap.empty) {
        return profissionaisPorPerfilSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      }
    } catch (error) {
      console.log("Erro ao carregar profissionais por perfil:", error);
    }

    return [];
  }, []);

  const carregarDados = useCallback(async () => {
    setLoading(true);

    try {
      const user = auth.currentUser;

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } else {
        setRegion(REGIAO_PADRAO);
      }

      const [profissionaisBase, avaliacoesSnap, favoritosSnap] = await Promise.all([
        carregarProfissionaisBase(),
        getDocs(collection(db, "avaliacoes")),
        user ? getDocs(collection(db, "usuarios", user.uid, "favoritos")) : Promise.resolve(null),
      ]);

      const avaliacoesAgrupadas = {};

      avaliacoesSnap.forEach((docSnap) => {
        const dados = docSnap.data();
        const profissionalId = dados.profissionalId;

        if (!profissionalId) return;

        if (!avaliacoesAgrupadas[profissionalId]) {
          avaliacoesAgrupadas[profissionalId] = {
            soma: 0,
            quantidade: 0,
          };
        }

        avaliacoesAgrupadas[profissionalId].soma += Number(dados.nota || 0);
        avaliacoesAgrupadas[profissionalId].quantidade += 1;
      });

      const favoritosObj = {};
      if (favoritosSnap) {
        favoritosSnap.forEach((docSnap) => {
          favoritosObj[docSnap.id] = true;
        });
      }

      setFavoritosMap(favoritosObj);

      const lista = profissionaisBase.map((dados) => {
        const resumo = avaliacoesAgrupadas[dados.id] || { soma: 0, quantidade: 0 };
        const media = resumo.quantidade > 0 ? resumo.soma / resumo.quantidade : 0;

        return {
          ...dados,
          latitudeParsed: parseCoord(dados.latitude),
          longitudeParsed: parseCoord(dados.longitude),
          mediaAvaliacao: media,
          quantidadeAvaliacoes: resumo.quantidade,
          favorito: !!favoritosObj[dados.id],
        };
      });

      const ordenada = ordenarProfissionais(lista);
      setProfissionais(ordenada);
    } catch (e) {
      console.log("Erro ao carregar profissionais:", e);
      Alert.alert("Erro", "Não foi possível carregar os profissionais.");
      setRegion(REGIAO_PADRAO);
    } finally {
      setLoading(false);
    }
  }, [carregarProfissionaisBase]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const atualizarFavoritoNaLista = useCallback((proId, ehFavorito) => {
    setFavoritosMap((prev) => ({
      ...prev,
      [proId]: ehFavorito,
    }));

    setProfissionais((prev) => {
      const atualizada = prev.map((p) =>
        p.id === proId ? { ...p, favorito: ehFavorito } : p
      );

      return ordenarProfissionais(atualizada);
    });

    setSelectedPro((prev) => {
      if (!prev || prev.id !== proId) return prev;
      return { ...prev, favorito: ehFavorito };
    });
  }, []);

  const toggleFavorito = useCallback(async (profissional) => {
    Keyboard.dismiss();

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Atenção", "Você precisa estar logado para favoritar.");
      return;
    }

    try {
      setSalvandoFavoritoId(profissional.id);

      const favoritoRef = doc(db, "usuarios", user.uid, "favoritos", profissional.id);
      const snap = await getDoc(favoritoRef);

      if (snap.exists()) {
        await deleteDoc(favoritoRef);
        atualizarFavoritoNaLista(profissional.id, false);
      } else {
        await setDoc(favoritoRef, {
          profissionalId: profissional.id,
          nome: getNomeProfissional(profissional),
          especialidade: profissional.especialidade || "",
          cidade: profissional.localizacao?.cidade || profissional.cidade || "",
          categoriaSlug: profissional.categoriaSlug || "",
          categoriaId: profissional.categoriaId || "",
          createdAt: serverTimestamp(),
        });
        atualizarFavoritoNaLista(profissional.id, true);
      }
    } catch (error) {
      console.log("Erro ao favoritar:", error);
      Alert.alert("Erro", "Não foi possível atualizar os favoritos.");
    } finally {
      setSalvandoFavoritoId(null);
    }
  }, [atualizarFavoritoNaLista]);

  const profissionaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const listaFiltradaPorCategoria = profissionais.filter((p) => {
      if (verTodasCategorias) {
        return true;
      }

      if (categoriaIdSelecionada && p.categoriaId === categoriaIdSelecionada) {
        return true;
      }

      if (
        categoriaSlugSelecionada &&
        String(p.categoriaSlug || '').toLowerCase() ===
        String(categoriaSlugSelecionada).toLowerCase()
      ) {
        return true;
      }

      if (
        categoriaSelecionada &&
        String(p.especialidade || '').toLowerCase() ===
        String(categoriaSelecionada).toLowerCase()
      ) {
        return true;
      }

      if (
        categoriaSelecionada &&
        String(p.categoriaNome || '').toLowerCase() ===
        String(categoriaSelecionada).toLowerCase()
      ) {
        return true;
      }

      if (
        !categoriaIdSelecionada &&
        !categoriaSlugSelecionada &&
        !categoriaSelecionada
      ) {
        return true;
      }

      return false;
    });

    if (!termo) {
      return ordenarProfissionais(listaFiltradaPorCategoria);
    }

    const filtrados = listaFiltradaPorCategoria.filter((p) => {
      const nome = getNomeProfissional(p).toLowerCase();
      const especialidade = String(p.especialidade || '').toLowerCase();
      const nomeNegocio = String(p.nomeNegocio || '').toLowerCase();
      const categoriaNome = String(p.categoriaNome || '').toLowerCase();
      const categoriaSlug = String(p.categoriaSlug || '').toLowerCase();
      const cidade = String(p.localizacao?.cidade || p.cidade || '').toLowerCase();

      return (
        nome.includes(termo) ||
        especialidade.includes(termo) ||
        nomeNegocio.includes(termo) ||
        categoriaNome.includes(termo) ||
        categoriaSlug.includes(termo) ||
        cidade.includes(termo)
      );
    });

    return ordenarProfissionais(filtrados);
  }, [
    profissionais,
    busca,
    categoriaSelecionada,
    categoriaSlugSelecionada,
    categoriaIdSelecionada,
    verTodasCategorias,
  ]);

  const profissionaisComMapa = useMemo(() => {
    return profissionaisFiltrados.filter(temCoordenadasValidas);
  }, [profissionaisFiltrados]);

  const abrirPerfil = useCallback((pro) => {
    Keyboard.dismiss();
    navigation.navigate("PerfilProfissional", {
      proId: pro.id,
      profissionalId: pro.id,
    });
  }, [navigation]);

  const textoAvaliacao = useCallback((item) => {
    if (!item.quantidadeAvaliacoes) return "Sem avaliações";
    return `${item.mediaAvaliacao.toFixed(1)} (${item.quantidadeAvaliacoes})`;
  }, []);

  const tituloResultados = useMemo(() => {
    if (verTodasCategorias) {
      return `Categorias e profissionais (${profissionaisFiltrados.length})`;
    }

    if (categoriaSelecionada) {
      return `${categoriaSelecionada} (${profissionaisFiltrados.length})`;
    }

    return `Resultados (${profissionaisFiltrados.length})`;
  }, [categoriaSelecionada, profissionaisFiltrados.length, verTodasCategorias]);

  const subtituloBusca = useMemo(() => {
    if (verTodasCategorias) {
      return 'Explore os profissionais disponíveis';
    }

    if (categoriaSelecionada) {
      return `Profissionais da categoria ${categoriaSelecionada}`;
    }

    return 'Buscar por nome, serviço ou cidade';
  }, [categoriaSelecionada, verTodasCategorias]);

  const renderResultado = useCallback(({ item }) => {
    const temLocalizacao = temCoordenadasValidas(item);

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => abrirPerfil(item)}>
        <View style={styles.resultAvatar}>
          <Text style={styles.resultAvatarText}>
            {getNomeProfissional(item).charAt(0)}
          </Text>
        </View>

        <View style={styles.resultContent}>
          <View style={styles.resultTopRow}>
            <Text style={styles.resultName}>
              {getNomeProfissional(item)}
            </Text>

            <TouchableOpacity
              onPress={() => toggleFavorito(item)}
              style={styles.heartIconButton}
            >
              {salvandoFavoritoId === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={item.favorito ? "heart" : "heart-outline"}
                  size={20}
                  color={item.favorito ? "#E63946" : "#999"}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.resultSub}>
            {item.especialidade || item.categoriaNome || "Especialidade não informada"}
          </Text>

          <View style={styles.resultMetaRow}>
            <View style={styles.ratingMiniBox}>
              <Ionicons name="star" size={13} color={colors.warning || "#FFC107"} />
              <Text style={styles.resultRatingText}>{textoAvaliacao(item)}</Text>
            </View>

            <Text style={styles.resultCity}>
              {item.localizacao?.cidade || item.cidade || "Cidade não informada"}
            </Text>
          </View>

          {!temLocalizacao ? (
            <Text style={styles.resultWarning}>Sem localização no mapa</Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  }, [abrirPerfil, toggleFavorito, salvandoFavoritoId, textoAvaliacao]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topArea}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => {
              Keyboard.dismiss();
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textDark} />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={styles.pageTitle}>Explorar profissionais</Text>
            <Text style={styles.pageSubtitle}>{subtituloBusca}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.secondary} />

          <TextInput
            style={styles.input}
            placeholder="Buscar por nome, serviço ou cidade..."
            placeholderTextColor="#999"
            value={busca}
            onChangeText={setBusca}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />

          {busca?.length > 0 ? (
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => {
                Keyboard.dismiss();
                setBusca('');
              }}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.mapWrapper}>
        {region && (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            showsUserLocation
            onPress={() => {
              Keyboard.dismiss();
              setSelectedPro(null);
            }}
          >
            {profissionaisComMapa.map((pro) => (
              <Marker
                key={pro.id}
                coordinate={{
                  latitude: pro.latitudeParsed,
                  longitude: pro.longitudeParsed,
                }}
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedPro(pro);
                }}
              >
                <View style={[styles.customMarker, pro.favorito && styles.customMarkerFavorite]}>
                  <Ionicons
                    name={pro.favorito ? "heart" : "star"}
                    size={12}
                    color="#FFF"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.markerText}>
                    {pro.quantidadeAvaliacoes > 0 ? pro.mediaAvaliacao.toFixed(1) : "Novo"}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>
        )}
      </View>

      {selectedPro && (
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.proCard}
          onPress={() => abrirPerfil(selectedPro)}
        >
          <View style={styles.proInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getNomeProfissional(selectedPro).charAt(0)}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.selectedTopRow}>
                <Text style={styles.proName}>
                  {getNomeProfissional(selectedPro)}
                </Text>

                <TouchableOpacity
                  onPress={() => toggleFavorito(selectedPro)}
                  style={styles.heartIconButton}
                >
                  {salvandoFavoritoId === selectedPro.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name={selectedPro.favorito ? "heart" : "heart-outline"}
                      size={22}
                      color={selectedPro.favorito ? "#E63946" : "#999"}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.proSpec}>
                {selectedPro.especialidade || selectedPro.categoriaNome || "Especialidade não informada"}
              </Text>

              <View style={styles.ratingBox}>
                <Ionicons name="star" size={14} color={colors.warning || "#FFC107"} />
                <Text style={styles.ratingText}>{textoAvaliacao(selectedPro)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>Ver Perfil</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>{tituloResultados}</Text>
          <View style={styles.resultsBadge}>
            <Text style={styles.resultsBadgeText}>{profissionaisFiltrados.length}</Text>
          </View>
        </View>

        {profissionaisFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={26} color="#A0A0A0" />
            <Text style={styles.emptyText}>Nenhum profissional encontrado.</Text>
            <Text style={styles.emptySubtext}>
              Tente buscar por outro nome, cidade ou categoria.
            </Text>
          </View>
        ) : (
          <FlatList
            data={profissionaisFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderResultado}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(247,248,250,0.75)',
  },

  topArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#F7F8FA',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  titleArea: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
  },

  pageSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.secondary,
  },

  searchBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: colors.textDark,
  },

  filterBtn: {
    padding: 4,
  },

  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
  },

  map: {
    flex: 1,
  },

  customMarker: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  customMarkerFavorite: {
    backgroundColor: '#E63946',
  },

  markerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  proCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 255,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 20,
  },

  proInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },

  details: {
    marginLeft: 14,
    flex: 1,
  },

  selectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  proName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    flex: 1,
    paddingRight: 10,
  },

  proSpec: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 4,
  },

  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ratingText: {
    fontSize: 12,
    color: colors.secondary,
    marginLeft: 5,
    fontWeight: '600',
  },

  viewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 46,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 5,
  },

  resultsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 270,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 16,
    elevation: 15,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },

  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  resultsTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.textDark,
  },

  resultsBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}18`,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  resultsBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },

  listContent: {
    paddingBottom: 32,
  },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  resultAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resultAvatarText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },

  resultContent: {
    flex: 1,
    marginLeft: 12,
  },

  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
    flex: 1,
    paddingRight: 8,
  },

  heartIconButton: {
    padding: 4,
  },

  resultSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },

  ratingMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultRatingText: {
    fontSize: 12,
    color: colors.secondary,
    marginLeft: 4,
    fontWeight: '600',
  },

  resultCity: {
    fontSize: 12,
    color: '#888',
    marginLeft: 10,
  },

  resultWarning: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 3,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },

  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
  },

  emptySubtext: {
    color: '#999',
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
