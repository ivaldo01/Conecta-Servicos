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
        collection(db, "avaliacoes"),
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

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1625834317364-b32c140fd360?q=80&w=1000&auto=format&fit=crop',
          }}
          style={styles.cover}
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

        <View style={styles.profileInfoArea}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitial(getNomeProfissional(perfil))}
            </Text>
          </View>

          <Text style={styles.nomeClinica}>
            {getNomeProfissional(perfil)}
          </Text>

          <Text style={styles.especialidade}>
            {getEspecialidadeProfissional(perfil)}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning || "#FFC107"} />
            <Text style={styles.ratingText}> {textoAvaliacao}</Text>
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

        <View style={{ height: servicosSelecionados.length > 0 ? 120 : 30 }} />
      </ScrollView>

      {servicosSelecionados.length > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>Total Selecionado</Text>
            <Text style={styles.footerPrice}>R$ {totalSelecionado.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.btnFinal} onPress={continuarAgendamento}>
            <Text style={styles.btnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },

  cover: {
    height: 220,
    width: '100%',
    backgroundColor: colors.primary,
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
    alignItems: 'center',
    paddingBottom: 22,
    paddingHorizontal: 16,
  },

  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.inputFill,
    borderWidth: 4,
    borderColor: '#FFF',
    marginTop: -44,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  avatarText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: colors.primary,
  },

  nomeClinica: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
    color: colors.textDark,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  especialidade: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 14,
    gap: 8,
  },

  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F7FB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  infoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDark,
    marginLeft: 6,
  },

  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 18,
    backgroundColor: '#FFF',
  },

  favoriteButtonActive: {
    backgroundColor: colors.primary,
  },

  favoriteButtonText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  favoriteButtonTextActive: {
    color: '#FFF',
  },

  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E8E8E8',
  },

  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 16,
  },

  bioBox: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
  },

  bioTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 8,
  },

  bioText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 21,
  },

  servicesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  avaliacoesSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
  },

  sectionCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.primary}18`,
    textAlign: 'center',
    lineHeight: 28,
    color: colors.primary,
    fontWeight: '800',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },

  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },

  serviceCard: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },

  serviceInfo: {
    flex: 1,
    paddingRight: 12,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
  },

  serviceDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },

  servicePrice: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '800',
    marginTop: 8,
  },

  avaliacaoCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  avaliacaoNameArea: {
    flex: 1,
    paddingRight: 10,
  },

  avaliacaoNome: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  avaliacaoData: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },

  estrelasRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avaliacaoComentario: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },

  avaliacaoSemComentario: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#EEE',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },

  footerLabel: {
    fontSize: 12,
    color: colors.secondary,
  },

  footerPrice: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 2,
  },

  btnFinal: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
});