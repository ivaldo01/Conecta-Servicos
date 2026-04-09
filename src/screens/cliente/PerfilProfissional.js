import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import Sidebar from '../../components/Sidebar';

function getNomeProfissional(perfil) {
  return (
    perfil?.nome ||
    perfil?.nomeCompleto ||
    perfil?.nomeNegocio ||
    "Profissional"
  );
}

function getEspecialidadeProfissional(perfil) {
  return (
    perfil?.especialidade ||
    perfil?.categoriaNome ||
    "Especialidade não informada"
  );
}

function getCidadeProfissional(perfil) {
  return (
    perfil?.cidade ||
    perfil?.localizacao?.cidade ||
    "Cidade não informada"
  );
}

function getBairroProfissional(perfil) {
  return (
    perfil?.bairro ||
    perfil?.localizacao?.bairro ||
    ""
  );
}

function getTextoLocalizacao(perfil) {
  const bairro = getBairroProfissional(perfil);
  const cidade = getCidadeProfissional(perfil);

  if (bairro && cidade && cidade !== "Cidade não informada") {
    return `${bairro} - ${cidade}`;
  }

  return cidade;
}

function getInitial(nome = '') {
  return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

export default function PerfilProfissional({ route, navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

  const proId = route?.params?.proId || route?.params?.profissionalId || null;

  const [perfil, setPerfil] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorito, setFavorito] = useState(false);
  const [salvandoFavorito, setSalvandoFavorito] = useState(false);

  const carregarDados = useCallback(async () => {
    if (!proId) {
      Alert.alert("Erro", "Profissional não informado.");
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);

      const perfilRef = doc(db, "usuarios", proId);
      const perfilSnap = await getDoc(perfilRef);

      if (!perfilSnap.exists()) {
        Alert.alert("Erro", "Profissional não encontrado.");
        navigation.goBack();
        return;
      }

      const perfilData = { id: perfilSnap.id, ...perfilSnap.data() };
      setPerfil(perfilData);

      const servicosRef = collection(db, "usuarios", proId, "servicos");
      const servicosSnap = await getDocs(servicosRef);
      const listaServicos = servicosSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setServicos(listaServicos);

      const avaliacoesQuery = query(
        collection(db, "usuarios", proId, "avaliacoes"),
        where("profissionalId", "==", proId)
      );

      const avaliacoesSnap = await getDocs(avaliacoesQuery);
      const listaAvaliacoes = avaliacoesSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      const ordenadas = listaAvaliacoes.sort((a, b) => {
        const dataA = a.createdAt?.seconds || 0;
        const dataB = b.createdAt?.seconds || 0;
        return dataB - dataA;
      });

      setAvaliacoes(ordenadas);

      const user = auth.currentUser;
      if (user) {
        const favoritoRef = doc(db, "usuarios", user.uid, "favoritos", proId);
        const favoritoSnap = await getDoc(favoritoRef);
        setFavorito(favoritoSnap.exists());
      } else {
        setFavorito(false);
      }
    } catch (error) {
      console.log("Erro ao carregar perfil profissional:", error);
      Alert.alert("Erro", "Não foi possível carregar o perfil.");
    } finally {
      setLoading(false);
    }
  }, [navigation, proId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleFavorito = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Atenção", "Você precisa estar logado para favoritar.");
      return;
    }

    if (!perfil || !proId) return;

    try {
      setSalvandoFavorito(true);

      const favoritoRef = doc(db, "usuarios", user.uid, "favoritos", proId);

      if (favorito) {
        await deleteDoc(favoritoRef);
        setFavorito(false);
        Alert.alert("Pronto", "Profissional removido dos favoritos.");
      } else {
        await setDoc(favoritoRef, {
          profissionalId: proId,
          nome: getNomeProfissional(perfil),
          especialidade: perfil?.especialidade || "",
          cidade: perfil?.localizacao?.cidade || perfil?.cidade || "",
          categoriaSlug: perfil?.categoriaSlug || "",
          categoriaId: perfil?.categoriaId || "",
          createdAt: serverTimestamp(),
        });

        setFavorito(true);
        Alert.alert("Pronto", "Profissional adicionado aos favoritos.");
      }
    } catch (error) {
      console.log("Erro ao favoritar profissional:", error);
      Alert.alert("Erro", "Não foi possível atualizar seus favoritos.");
    } finally {
      setSalvandoFavorito(false);
    }
  };

  const toggleServico = (servico) => {
    const jaSelecionado = servicosSelecionados.some((s) => s.id === servico.id);

    if (jaSelecionado) {
      setServicosSelecionados((prev) => prev.filter((s) => s.id !== servico.id));
    } else {
      setServicosSelecionados((prev) => [...prev, servico]);
    }
  };

  const continuarAgendamento = () => {
    if (servicosSelecionados.length === 0) {
      Alert.alert("Atenção", "Selecione pelo menos um serviço.");
      return;
    }

    navigation.push("AgendamentoFinal", {
      clinicaId: proId,
      profissionalId: proId,
      servicos: servicosSelecionados,
    });
  };

  const totalSelecionado = servicosSelecionados.reduce(
    (acc, item) => acc + Number(item.preco || 0),
    0
  );

  const resumoAvaliacoes = useMemo(() => {
    if (perfil?.avaliacaoMedia !== undefined && perfil?.totalAvaliacoes !== undefined) {
      return {
        media: Number(perfil.avaliacaoMedia || 0),
        quantidade: Number(perfil.totalAvaliacoes || 0),
      };
    }

    if (!avaliacoes.length) {
      return {
        media: 0,
        quantidade: 0,
      };
    }

    const soma = avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0);
    const media = soma / avaliacoes.length;

    return {
      media,
      quantidade: avaliacoes.length,
    };
  }, [avaliacoes, perfil]);

  const textoAvaliacao = useMemo(() => {
    if (resumoAvaliacoes.quantidade === 0) {
      return "Sem avaliações ainda";
    }

    if (resumoAvaliacoes.quantidade === 1) {
      return `${resumoAvaliacoes.media.toFixed(1)} (1 avaliação)`;
    }

    return `${resumoAvaliacoes.media.toFixed(1)} (${resumoAvaliacoes.quantidade} avaliações)`;
  }, [resumoAvaliacoes]);

  const formatarDataAvaliacao = (createdAt) => {
    if (!createdAt?.seconds) return "Data não informada";

    const data = new Date(createdAt.seconds * 1000);
    return data.toLocaleDateString('pt-BR');
  };

  const renderEstrelas = (nota) => {
    return [1, 2, 3, 4, 5].map((valor) => (
      <Ionicons
        key={valor}
        name={valor <= Number(nota || 0) ? "star" : "star-outline"}
        size={16}
        color={colors.warning || "#FFC107"}
        style={{ marginRight: 2 }}
      />
    ));
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const MainContent = (
    <View style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={isLargeScreen && styles.scrollContentLarge}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1625834317364-b32c140fd360?q=80&w=1000&auto=format&fit=crop',
          }}
          style={[styles.cover, isLargeScreen && styles.coverLarge]}
        >
          <View style={styles.coverOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topFavoriteBtn}
              onPress={toggleFavorito}
              disabled={salvandoFavorito}
            >
              {salvandoFavorito ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Ionicons
                  name={favorito ? "heart" : "heart-outline"}
                  size={22}
                  color="#FFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={isLargeScreen ? styles.webContainer : null}>
          <View style={[styles.profileInfoArea, isLargeScreen && styles.profileInfoAreaLarge]}>
            <View style={[styles.avatarContainer, isLargeScreen && styles.avatarContainerLarge]}>
              <Text style={[styles.avatarText, isLargeScreen && styles.avatarTextLarge]}>
                {getInitial(getNomeProfissional(perfil))}
              </Text>
            </View>

            <View style={isLargeScreen ? styles.headerTextRow : null}>
              <View style={isLargeScreen ? styles.headerMainInfo : null}>
                <Text style={styles.nomeClinica}>
                  {getNomeProfissional(perfil)}
                </Text>

                <Text style={styles.especialidade}>
                  {getEspecialidadeProfissional(perfil)}
                </Text>

                <View style={[styles.ratingRow, isLargeScreen && styles.ratingRowLarge]}>
                  <Ionicons name="star" size={16} color={colors.warning || "#FFC107"} />
                  <Text style={styles.ratingText}> {textoAvaliacao}</Text>
                </View>
              </View>

              {isLargeScreen && (
                <TouchableOpacity
                  style={[
                    styles.favoriteButton,
                    favorito && styles.favoriteButtonActive,
                    salvandoFavorito && { opacity: 0.7 },
                  ]}
                  onPress={toggleFavorito}
                  disabled={salvandoFavorito}
                >
                  {salvandoFavorito ? (
                    <ActivityIndicator color={favorito ? "#FFF" : colors.primary} size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={favorito ? "heart" : "heart-outline"}
                        size={18}
                        color={favorito ? "#FFF" : colors.primary}
                      />
                      <Text
                        style={[
                          styles.favoriteButtonText,
                          favorito && styles.favoriteButtonTextActive,
                        ]}
                      >
                        {favorito ? "Favoritado" : "Favoritar"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.chipRow}>
              <View style={styles.infoChip}>
                <Ionicons name="location-outline" size={15} color={colors.primary} />
                <Text style={styles.infoChipText}>
                  {getTextoLocalizacao(perfil)}
                </Text>
              </View>

              <View style={styles.infoChip}>
                <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
                <Text style={styles.infoChipText}>Perfil profissional</Text>
              </View>
            </View>

            {!isLargeScreen && (
              <TouchableOpacity
                style={[
                  styles.favoriteButton,
                  favorito && styles.favoriteButtonActive,
                  salvandoFavorito && { opacity: 0.7 },
                ]}
                onPress={toggleFavorito}
                disabled={salvandoFavorito}
              >
                {salvandoFavorito ? (
                  <ActivityIndicator color={favorito ? "#FFF" : colors.primary} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={favorito ? "heart" : "heart-outline"}
                      size={18}
                      color={favorito ? "#FFF" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.favoriteButtonText,
                        favorito && styles.favoriteButtonTextActive,
                      ]}
                    >
                      {favorito ? "Favoritado" : "Favoritar"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={styles.statText}>
                  {getTextoLocalizacao(perfil)}
                </Text>
              </View>

              <View style={[styles.statBox, styles.statMiddle]}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
                <Text style={styles.statText}>
                  {resumoAvaliacoes.quantidade} avaliação{resumoAvaliacoes.quantidade === 1 ? "" : "ões"}
                </Text>
              </View>

              <View style={styles.statBox}>
                <Ionicons name="star-outline" size={20} color={colors.primary} />
                <Text style={styles.statText}>
                  {resumoAvaliacoes.quantidade > 0 ? resumoAvaliacoes.media.toFixed(1) : "Novo"}
                </Text>
              </View>
            </View>

            {!!perfil?.bio && (
              <View style={styles.bioBox}>
                <Text style={styles.bioTitle}>Sobre</Text>
                <Text style={styles.bioText}>{perfil.bio}</Text>
              </View>
            )}
          </View>

          <View style={isLargeScreen ? styles.mainGridDesktop : null}>
            <View style={isLargeScreen ? styles.gridColLeft : null}>
              <View style={styles.servicesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Serviços</Text>
                  <Text style={styles.sectionCount}>{servicos.length}</Text>
                </View>

                {servicos.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum serviço cadastrado.</Text>
                ) : (
                  servicos.map((servico) => {
                    const selecionado = servicosSelecionados.some((s) => s.id === servico.id);

                    return (
                      <TouchableOpacity
                        key={servico.id}
                        style={[styles.serviceCard, selecionado && styles.selectedCard]}
                        onPress={() => toggleServico(servico)}
                        activeOpacity={0.9}
                      >
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{servico.nome}</Text>
                          {!!servico.descricao && (
                            <Text style={styles.serviceDescription} numberOfLines={2}>
                              {servico.descricao}
                            </Text>
                          )}
                          <Text style={styles.servicePrice}>
                            R$ {Number(servico.preco || 0).toFixed(2)}
                          </Text>
                        </View>

                        <Ionicons
                          name={selecionado ? "checkmark-circle" : "add-circle-outline"}
                          size={30}
                          color={selecionado ? colors.success : colors.primary}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>

            <View style={isLargeScreen ? styles.gridColRight : null}>
              <View style={styles.avaliacoesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Avaliações</Text>
                  <Text style={styles.sectionCount}>{avaliacoes.length}</Text>
                </View>

                {avaliacoes.length === 0 ? (
                  <Text style={styles.emptyText}>Este profissional ainda não recebeu avaliações.</Text>
                ) : (
                  avaliacoes.map((item) => (
                    <View key={item.id} style={styles.avaliacaoCard}>
                      <View style={styles.avaliacaoHeader}>
                        <View style={styles.avaliacaoNameArea}>
                          <Text style={styles.avaliacaoNome}>
                            {item.clienteNome || "Cliente"}
                          </Text>
                          <Text style={styles.avaliacaoData}>
                            {formatarDataAvaliacao(item.createdAt)}
                          </Text>
                        </View>

                        <View style={styles.estrelasRow}>
                          {renderEstrelas(item.nota)}
                        </View>
                      </View>

                      {!!item.comentario && item.comentario.trim() !== "" ? (
                        <Text style={styles.avaliacaoComentario}>{item.comentario}</Text>
                      ) : (
                        <Text style={styles.avaliacaoSemComentario}>Sem comentário</Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: servicosSelecionados.length > 0 ? 120 : 30 }} />
      </ScrollView>

      {servicosSelecionados.length > 0 && (
        <View style={[styles.footer, isLargeScreen && styles.footerLarge]}>
          <View style={isLargeScreen ? styles.webContainerFooter : null}>
            <View style={styles.footerInner}>
              <View>
                <Text style={styles.footerLabel}>Total Selecionado</Text>
                <Text style={styles.footerPrice}>R$ {totalSelecionado.toFixed(2)}</Text>
              </View>

              <TouchableOpacity style={[styles.btnFinal, isLargeScreen && styles.btnFinalLarge]} onPress={continuarAgendamento}>
                <Text style={styles.btnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      {isLargeScreen ? (
        <View style={styles.webLayout}>
          <Sidebar navigation={navigation} activeRoute="BuscaProfissionais" />
          <View style={styles.webContentArea}>
            {MainContent}
          </View>
        </View>
      ) : (
        <SafeAreaView style={styles.mainContainer} edges={['bottom']}>
          {MainContent}
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    overflow: 'hidden',
  },
  webContentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: '100%',
    display: 'flex',
    overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100%' : 'auto',
  },
  scrollContentLarge: {
    paddingBottom: 40,
  },
  webContainer: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cover: {
    height: 220,
    width: '100%',
    backgroundColor: colors.primary,
  },
  coverLarge: {
    height: 280,
  },
  coverOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 18,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topFavoriteBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoArea: {
    backgroundColor: '#FFF',
    marginTop: -34,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 22,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  profileInfoAreaLarge: {
    marginTop: -60,
    borderRadius: 32,
    padding: 40,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F1F5F9',
    borderWidth: 4,
    borderColor: '#FFF',
    marginTop: -44,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarContainerLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginTop: -110,
    alignSelf: 'flex-start',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
  },
  avatarTextLarge: {
    fontSize: 48,
  },
  headerTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 20,
  },
  headerMainInfo: {
    flex: 1,
  },
  nomeClinica: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 12,
    color: '#1E293B',
    textAlign: 'center',
  },
  especialidade: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  ratingRowLarge: {
    justifyContent: 'flex-start',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
    width: '100%',
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 20,
    backgroundColor: '#FFF',
    alignSelf: 'center',
  },
  favoriteButtonActive: {
    backgroundColor: colors.primary,
  },
  favoriteButtonText: {
    color: colors.primary,
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 15,
  },
  favoriteButtonTextActive: {
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  bioBox: {
    width: '100%',
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  bioText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
  },
  mainGridDesktop: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 32,
  },
  gridColLeft: {
    flex: 1.5,
  },
  gridColRight: {
    flex: 1,
  },
  servicesSection: {
    paddingHorizontal: 0,
    paddingTop: 20,
  },
  avaliacoesSection: {
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
  },
  sectionCount: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}10`,
    textAlign: 'center',
    lineHeight: 32,
    color: colors.primary,
    fontWeight: '800',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontSize: 15,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: 16,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
  },
  servicePrice: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 10,
  },
  avaliacaoCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avaliacaoNameArea: {
    flex: 1,
    paddingRight: 12,
  },
  avaliacaoNome: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  avaliacaoData: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  estrelasRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avaliacaoComentario: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  avaliacaoSemComentario: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
  },
  footerLarge: {
    paddingHorizontal: 0,
  },
  webContainerFooter: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  footerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 2,
  },
  btnFinal: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnFinalLarge: {
    minWidth: 200,
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    marginRight: 12,
  },
});