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

function parseCoord(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  const numero =
    typeof valor === 'string'
      ? parseFloat(String(valor).replace(',', '.'))
      : Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function normalizarTexto(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function getNomeProfissional(profissional) {
  return (
    profissional?.nome ||
    profissional?.nomeCompleto ||
    profissional?.nomeNegocio ||
    profissional?.nomeFantasia ||
    "Profissional"
  );
}

function getAvatarUri(profissional) {
  return (
    profissional?.fotoPerfil ||
    profissional?.foto ||
    profissional?.avatar ||
    profissional?.photoURL ||
    profissional?.photoUrl ||
    null
  );
}

function getBannerUri(profissional) {
  return (
    profissional?.bannerPerfil ||
    profissional?.banner ||
    profissional?.capaPerfil ||
    profissional?.capa ||
    profissional?.bannerUrl ||
    profissional?.imagemBanner ||
    null
  );
}

function getCidadeProfissional(item) {
  return (
    item?.localizacao?.cidade ||
    item?.cidade ||
    'Cidade não informada'
  );
}

function getEstadoProfissional(item) {
  return (
    item?.localizacao?.estado ||
    item?.estado ||
    ''
  );
}

function getEspecialidadeProfissional(item) {
  return (
    item?.especialidade ||
    item?.categoriaNome ||
    item?.nomeNegocio ||
    'Especialidade não informada'
  );
}

function temCoordenadasValidas(item) {
  return (
    item?.latitudeParsed !== null &&
    item?.longitudeParsed !== null &&
    item?.latitudeParsed !== 0 &&
    item?.longitudeParsed !== 0
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

function getInitial(nome = '') {
  return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

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
      const profissionaisPorTipoQuery = query(
        collection(db, "usuarios"),
        where("tipo", "==", "profissional")
      );

      const profissionaisPorTipoSnap = await getDocs(profissionaisPorTipoQuery);

      if (!profissionaisPorTipoSnap.empty) {
        listaBase = profissionaisPorTipoSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        console.log('[BuscaProfissionais] Profissionais carregados por tipo:', listaBase.length);
      } else {
        console.warn('[BuscaProfissionais] Nenhum profissional encontrado com tipo=profissional');
      }
    } catch (error) {
      console.error("Erro ao carregar profissionais por tipo:", error);
    }

    if (listaBase.length === 0) {
      try {
        const profissionaisPorPerfilQuery = query(
          collection(db, "usuarios"),
          where("perfil", "==", "profissional")
        );

        const profissionaisPorPerfilSnap = await getDocs(profissionaisPorPerfilQuery);

        if (!profissionaisPorPerfilSnap.empty) {
          listaBase = profissionaisPorPerfilSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          console.log('[BuscaProfissionais] Profissionais carregados por perfil:', listaBase.length);
        } else {
          console.warn('[BuscaProfissionais] Nenhum profissional encontrado com perfil=profissional');
        }
      } catch (error) {
        console.error("Erro ao carregar profissionais por perfil:", error);
      }
    }

    if (listaBase.length === 0) {
      console.error('[BuscaProfissionais] ALERTA: Nenhum profissional foi encontrado no banco de dados');
    }

    return listaBase;
  }, []);

  const carregarDados = useCallback(async () => {
    setLoading(true);

    try {
      const user = auth.currentUser;

      // Carregar profissionais base
      const profissionaisBase = await carregarProfissionaisBase();

      console.log('[BuscaProfissionais] Profissionais carregados:', profissionaisBase.length);

      // Carregar favoritos (com tratamento de erro)
      let favoritosSnap = null;
      if (user) {
        try {
          favoritosSnap = await getDocs(collection(db, "usuarios", user.uid, "favoritos"));
        } catch (favError) {
          console.log('[BuscaProfissionais] Erro ao carregar favoritos (continuando):', favError.message);
          favoritosSnap = { forEach: () => { } }; // Mock empty snapshot
        }
      }

      // Carregar avaliacoes de cada profissional (estão em usuarios/{userId}/avaliacoes)
      const avaliacoesAgrupadas = {};

      for (const profissional of profissionaisBase) {
        try {
          const avaliacoesRef = collection(db, "usuarios", profissional.id, "avaliacoes");
          const avaliacoesSnap = await getDocs(avaliacoesRef);

          avaliacoesSnap.forEach((docSnap) => {
            const dados = docSnap.data();
            const nota = Number(dados?.nota || dados?.estrelas || 0);

            if (!avaliacoesAgrupadas[profissional.id]) {
              avaliacoesAgrupadas[profissional.id] = {
                soma: 0,
                quantidade: 0,
              };
            }

            avaliacoesAgrupadas[profissional.id].soma += nota;
            avaliacoesAgrupadas[profissional.id].quantidade += 1;
          });
        } catch (error) {
          console.log(`[BuscaProfissionais] Erro ao carregar avaliacoes de ${profissional.id}:`, error.message);
          // Continua sem avaliacoes para este profissional
        }
      }

      console.log('[BuscaProfissionais] Dados carregados:', {
        profissionaisCount: profissionaisBase.length,
        favoritosCount: favoritosSnap?.size || 0,
        avaliacoesProfs: Object.keys(avaliacoesAgrupadas).length,
      });

      const favoritosObj = {};
      if (favoritosSnap) {
        favoritosSnap.forEach((docSnap) => {
          favoritosObj[docSnap.id] = true;
        });
      }

      setFavoritosMap(favoritosObj);

      const lista = profissionaisBase
        .filter((dados) => !!dados?.id)
        .map((dados) => {
          const resumo = avaliacoesAgrupadas[dados.id] || { soma: 0, quantidade: 0 };
          const media = resumo.quantidade > 0 ? resumo.soma / resumo.quantidade : 0;

          return {
            ...dados,
            latitudeParsed:
              parseCoord(dados?.localizacao?.latitude) ??
              parseCoord(dados?.localizacao?.lat) ??
              parseCoord(dados?.latitude) ??
              parseCoord(dados?.lat),
            longitudeParsed:
              parseCoord(dados?.localizacao?.longitude) ??
              parseCoord(dados?.localizacao?.lng) ??
              parseCoord(dados?.localizacao?.lon) ??
              parseCoord(dados?.longitude) ??
              parseCoord(dados?.lng) ??
              parseCoord(dados?.lon),
            mediaAvaliacao: media,
            quantidadeAvaliacoes: resumo.quantidade,
            favorito: !!favoritosObj[dados.id],
          };
        });

      const ordenada = ordenarProfissionais(lista);
      setProfissionais(ordenada);

      if (ordenada.length > 0) {
        setSelectedPro(ordenada[0]);
      }

      if (lista.length === 0) {
        console.warn('[BuscaProfissionais] Nenhum profissional foi retornado da query');
      }
    } catch (e) {
      console.error("Erro ao carregar profissionais:", e);
      Alert.alert("Erro", "Não foi possível carregar os profissionais. " + (e?.message || ''));
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
          especialidade: profissional.especialidade || profissional.categoriaNome || "",
          cidade: profissional.localizacao?.cidade || profissional.cidade || "",
          categoriaSlug: profissional.categoriaSlug || "",
          categoriaId: profissional.categoriaId || "",
          fotoPerfil: getAvatarUri(profissional) || '',
          bannerPerfil: getBannerUri(profissional) || '',
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
    const termo = normalizarTexto(busca);

    const listaFiltradaPorCategoria = profissionais.filter((p) => {
      if (verTodasCategorias) return true;

      if (categoriaIdSelecionada && p.categoriaId === categoriaIdSelecionada) return true;

      if (
        categoriaSlugSelecionada &&
        normalizarTexto(p.categoriaSlug) === normalizarTexto(categoriaSlugSelecionada)
      ) {
        return true;
      }

      if (
        categoriaSelecionada &&
        normalizarTexto(p.especialidade) === normalizarTexto(categoriaSelecionada)
      ) {
        return true;
      }

      if (
        categoriaSelecionada &&
        normalizarTexto(p.categoriaNome) === normalizarTexto(categoriaSelecionada)
      ) {
        return true;
      }

      if (!categoriaIdSelecionada && !categoriaSlugSelecionada && !categoriaSelecionada) {
        return true;
      }

      return false;
    });

    if (!termo) {
      return ordenarProfissionais(listaFiltradaPorCategoria);
    }

    const filtrados = listaFiltradaPorCategoria.filter((p) => {
      const campos = [
        getNomeProfissional(p),
        p?.especialidade,
        p?.categoriaNome,
        p?.categoriaSlug,
        p?.nomeNegocio,
        p?.nomeFantasia,
        p?.descricao,
        p?.descricaoPublica,
        p?.bio,
        p?.localizacao?.cidade,
        p?.cidade,
        p?.localizacao?.estado,
        p?.estado,
      ];

      return campos.some((campo) => normalizarTexto(campo).includes(termo));
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

  useEffect(() => {
    if (!selectedPro && profissionaisFiltrados.length > 0) {
      setSelectedPro(profissionaisFiltrados[0]);
      return;
    }

    if (
      selectedPro &&
      !profissionaisFiltrados.some((item) => item.id === selectedPro.id)
    ) {
      setSelectedPro(profissionaisFiltrados[0] || null);
    }
  }, [profissionaisFiltrados, selectedPro]);

  const abrirPerfil = useCallback((pro) => {
    Keyboard.dismiss();
    navigation.navigate("PerfilPublicoProfissional", {
      proId: pro.id,
      profissionalId: pro.id,
      clinicaId: pro.id,
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

  const destaques = useMemo(() => {
    return profissionaisFiltrados.slice(0, 6);
  }, [profissionaisFiltrados]);

  const renderResultado = useCallback(({ item }) => {
    const avatarUri = getAvatarUri(item);
    const bannerUri = getBannerUri(item);
    const favorito = !!item.favorito;
    const salvando = salvandoFavoritoId === item.id;
    const selecionado = selectedPro?.id === item.id;
    const temLocalizacao = temCoordenadasValidas(item);

    return (
      <TouchableOpacity
        style={[styles.resultCard, selecionado && styles.resultCardSelected]}
        onPress={() => setSelectedPro(item)}
        activeOpacity={0.92}
      >
        <View style={styles.resultBannerArea}>
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.resultBannerImage} />
          ) : (
            <View style={styles.resultBannerFallback}>
              <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.70)" />
            </View>
          )}

          <View style={styles.resultBannerOverlay} />

          <TouchableOpacity
            onPress={() => toggleFavorito(item)}
            style={styles.favoriteFloatButton}
            activeOpacity={0.9}
          >
            {salvando ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={favorito ? "heart" : "heart-outline"}
                size={19}
                color={favorito ? "#E63946" : colors.primary}
              />
            )}
          </TouchableOpacity>

          <View style={styles.resultAvatarWrapper}>
            <View style={styles.resultAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.resultAvatarImage} />
              ) : (
                <Text style={styles.resultAvatarText}>
                  {getInitial(getNomeProfissional(item))}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.resultContent}>
          <View style={styles.resultTopRow}>
            <Text style={styles.resultName} numberOfLines={1}>
              {getNomeProfissional(item)}
            </Text>
          </View>

          <Text style={styles.resultSub} numberOfLines={1}>
            {getEspecialidadeProfissional(item)}
          </Text>

          <View style={styles.badgesRow}>
            <View style={styles.infoBadge}>
              <Ionicons name="star" size={13} color="#F4B400" />
              <Text style={styles.infoBadgeText}>{textoAvaliacao(item)}</Text>
            </View>

            <View style={styles.infoBadge}>
              <Ionicons name="location-outline" size={13} color={colors.primary} />
              <Text style={styles.infoBadgeText} numberOfLines={1}>
                {getCidadeProfissional(item)}
              </Text>
            </View>

            {favorito && (
              <View style={[styles.infoBadge, styles.infoBadgeFavorito]}>
                <Ionicons name="heart" size={12} color="#E63946" />
                <Text style={[styles.infoBadgeText, styles.infoBadgeFavoritoText]}>
                  Favorito
                </Text>
              </View>
            )}
          </View>

          {!temLocalizacao && (
            <Text style={styles.resultWarning}>
              Localização não informada
            </Text>
          )}

          <View style={styles.resultFooterRow}>
            <Text style={styles.resultFooterText}>
              {selecionado ? 'Selecionado' : 'Selecionar profissional'}
            </Text>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [salvandoFavoritoId, selectedPro, textoAvaliacao, toggleFavorito]);

  const selectedBannerUri = getBannerUri(selectedPro);
  const selectedAvatarUri = getAvatarUri(selectedPro);
  const selectedFavorito = !!selectedPro?.favorito;
  const salvandoSelecionado = salvandoFavoritoId === selectedPro?.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topArea}>
        <View style={styles.topAreaCircleOne} />
        <View style={styles.topAreaCircleTwo} />

        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.titleArea}>
            <Text style={styles.pageTitle}>Buscar profissionais</Text>
            <Text style={styles.pageSubtitle}>{subtituloBusca}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={22} color="#999" />
          <TextInput
            style={styles.input}
            placeholder="Buscar por nome, serviço ou cidade"
            placeholderTextColor="#999"
            value={busca}
            onChangeText={setBusca}
          />

          {busca.length > 0 && (
            <TouchableOpacity style={styles.filterBtn} onPress={() => setBusca('')}>
              <Ionicons name="close-circle" size={20} color="#AAA" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Carregando profissionais...</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <View style={styles.heroLeft}>
                <Text style={styles.heroTitle}>Encontre o profissional ideal</Text>
                <Text style={styles.heroDescription}>
                  Navegue pelos melhores resultados, veja avaliações, favoritos e escolha com mais segurança.
                </Text>
              </View>

              <View style={styles.heroIconBox}>
                <Ionicons name="sparkles-outline" size={30} color={colors.primary} />
              </View>
            </View>

            {destaques.length > 0 && (
              <View style={styles.quickSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Destaques</Text>
                  <Text style={styles.sectionSubtitle}>Mais bem avaliados e favoritos</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickScrollContent}
                >
                  {destaques.map((item) => {
                    const avatarUri = getAvatarUri(item);
                    const favorito = !!item.favorito;
                    const selecionado = selectedPro?.id === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.quickCard,
                          selecionado && styles.quickCardSelected,
                        ]}
                        onPress={() => setSelectedPro(item)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.quickAvatar}>
                          {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.quickAvatarImage} />
                          ) : (
                            <Text style={styles.quickAvatarText}>
                              {getInitial(getNomeProfissional(item))}
                            </Text>
                          )}
                        </View>

                        <Text style={styles.quickName} numberOfLines={1}>
                          {getNomeProfissional(item)}
                        </Text>

                        <Text style={styles.quickSpec} numberOfLines={1}>
                          {getEspecialidadeProfissional(item)}
                        </Text>

                        <View style={styles.quickBottomRow}>
                          <View style={styles.quickRating}>
                            <Ionicons name="star" size={12} color="#F4B400" />
                            <Text style={styles.quickRatingText}>
                              {item.quantidadeAvaliacoes
                                ? item.mediaAvaliacao.toFixed(1)
                                : 'Novo'}
                            </Text>
                          </View>

                          {favorito && (
                            <Ionicons name="heart" size={14} color="#E63946" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {selectedPro && (
              <TouchableOpacity
                activeOpacity={0.95}
                style={styles.proCard}
                onPress={() => abrirPerfil(selectedPro)}
              >
                <View style={styles.proCardBannerArea}>
                  {selectedBannerUri ? (
                    <Image source={{ uri: selectedBannerUri }} style={styles.proCardBannerImage} />
                  ) : (
                    <View style={styles.proCardBannerFallback}>
                      <Ionicons name="image-outline" size={26} color="rgba(255,255,255,0.75)" />
                    </View>
                  )}

                  <View style={styles.proCardBannerOverlay} />

                  <TouchableOpacity
                    onPress={() => toggleFavorito(selectedPro)}
                    style={styles.proCardFavoriteButton}
                    activeOpacity={0.9}
                  >
                    {salvandoSelecionado ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons
                        name={selectedFavorito ? "heart" : "heart-outline"}
                        size={20}
                        color={selectedFavorito ? "#E63946" : colors.primary}
                      />
                    )}
                  </TouchableOpacity>

                  <View style={styles.proCardAvatarWrapper}>
                    <View style={styles.avatar}>
                      {selectedAvatarUri ? (
                        <Image source={{ uri: selectedAvatarUri }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {getInitial(getNomeProfissional(selectedPro))}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.proCardContent}>
                  <View style={styles.selectedTopRow}>
                    <Text style={styles.proName} numberOfLines={1}>
                      {getNomeProfissional(selectedPro)}
                    </Text>
                  </View>

                  <Text style={styles.proSpec} numberOfLines={1}>
                    {getEspecialidadeProfissional(selectedPro)}
                  </Text>

                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={15} color={colors.primary} />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {getCidadeProfissional(selectedPro)}
                      {getEstadoProfissional(selectedPro)
                        ? ` - ${getEstadoProfissional(selectedPro)}`
                        : ''}
                    </Text>
                  </View>

                  <View style={styles.proBadgesRow}>
                    <View style={styles.proInfoBadge}>
                      <Ionicons name="star" size={13} color="#F4B400" />
                      <Text style={styles.proInfoBadgeText}>{textoAvaliacao(selectedPro)}</Text>
                    </View>

                    {selectedFavorito && (
                      <View style={[styles.proInfoBadge, styles.proInfoBadgeFavorito]}>
                        <Ionicons name="heart" size={12} color="#E63946" />
                        <Text style={[styles.proInfoBadgeText, styles.proInfoBadgeFavoritoText]}>
                          Favorito
                        </Text>
                      </View>
                    )}

                    {temCoordenadasValidas(selectedPro) && (
                      <View style={styles.proInfoBadge}>
                        <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                        <Text style={styles.proInfoBadgeText}>Endereço disponível</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.proCardBottom}>
                    <View style={styles.proCardHintBox}>
                      <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
                      <Text style={styles.proCardHintText}>Ver perfil público e agendar</Text>
                    </View>

                    <View style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>Ver Perfil</Text>
                      <Ionicons name="chevron-forward" size={18} color="#FFF" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.resultsSection}>
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
                  removeClippedSubviews={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  scrollEnabled={false}
                />
              )}
            </View>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F9',
  },

  topArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 10,
  },

  topAreaCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -36,
    right: -20,
  },

  topAreaCircleTwo: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -16,
    left: -10,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    zIndex: 2,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  titleArea: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
  },

  pageSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.84)',
  },

  searchBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E4EAF2',
    zIndex: 2,
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

  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.secondary,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  heroSection: {
    backgroundColor: '#1E2535',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1E2535',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  heroLeft: {
    flex: 1,
    paddingRight: 12,
  },

  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },

  heroDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.84)',
  },

  heroIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickSection: {
    marginBottom: 18,
  },

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textDark,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.secondary,
  },

  quickScrollContent: {
    paddingRight: 10,
  },

  quickCard: {
    width: 145,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  quickCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FBFF',
  },

  quickAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },

  quickAvatarImage: {
    width: '100%',
    height: '100%',
  },

  quickAvatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 20,
  },

  quickName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
  },

  quickSpec: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },

  quickBottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  quickRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  quickRatingText: {
    marginLeft: 4,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
  },

  proCard: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  proCardBannerArea: {
    height: 112,
    position: 'relative',
    backgroundColor: '#7C93C3',
  },

  proCardBannerImage: {
    width: '100%',
    height: '100%',
  },

  proCardBannerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  proCardBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },

  proCardFavoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  proCardAvatarWrapper: {
    position: 'absolute',
    left: 16,
    bottom: -28,
    zIndex: 5,
  },

  proCardContent: {
    paddingTop: 34,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFF',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },

  selectedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  proName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    flex: 1,
    paddingRight: 10,
  },

  proSpec: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
    marginBottom: 8,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  locationText: {
    fontSize: 13,
    color: colors.secondary,
    marginLeft: 6,
    flex: 1,
  },

  proBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },

  proInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },

  proInfoBadgeFavorito: {
    backgroundColor: '#FDECEE',
  },

  proInfoBadgeText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
    marginLeft: 4,
    flexShrink: 1,
  },

  proInfoBadgeFavoritoText: {
    color: '#E63946',
  },

  proCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  proCardHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },

  proCardHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
    flex: 1,
  },

  viewBtn: {
    backgroundColor: colors.primary,
    borderRadius: 15,
    height: 46,
    minWidth: 128,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  viewBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 5,
  },

  resultsSection: {
    backgroundColor: '#FFF',
    borderRadius: 26,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#E8EDF5',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  resultCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FBFDFF',
  },

  resultBannerArea: {
    height: 78,
    backgroundColor: '#7C93C3',
    position: 'relative',
  },

  resultBannerImage: {
    width: '100%',
    height: '100%',
  },

  resultBannerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resultBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },

  favoriteFloatButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  resultAvatarWrapper: {
    position: 'absolute',
    left: 14,
    bottom: -22,
    zIndex: 4,
  },

  resultAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.inputFill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFF',
  },

  resultAvatarImage: {
    width: '100%',
    height: '100%',
  },

  resultAvatarText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 20,
  },

  resultContent: {
    paddingTop: 30,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  resultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  resultName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    flex: 1,
    paddingRight: 8,
  },

  resultSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 10,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },

  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },

  infoBadgeFavorito: {
    backgroundColor: '#FDECEE',
  },

  infoBadgeText: {
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '700',
    marginLeft: 4,
    flexShrink: 1,
  },

  infoBadgeFavoritoText: {
    color: '#E63946',
  },

  resultWarning: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 2,
  },

  resultFooterRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },

  resultFooterText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 4,
  },

  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
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