import React, { useState, useEffect, useMemo } from 'react';
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

export default function PerfilProfissional({ route, navigation }) {
  const { proId } = route.params || {};

  const [perfil, setPerfil] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorito, setFavorito] = useState(false);
  const [salvandoFavorito, setSalvandoFavorito] = useState(false);

  useEffect(() => {
    if (proId) {
      carregarDados();
    }
  }, [proId]);

  const carregarDados = async () => {
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
      }
    } catch (error) {
      console.log("Erro ao carregar perfil profissional:", error);
      Alert.alert("Erro", "Não foi possível carregar o perfil.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorito = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Atenção", "Você precisa estar logado para favoritar.");
      return;
    }

    if (!perfil) return;

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
          nome: perfil?.nome || perfil?.nomeCompleto || perfil?.nomeNegocio || "Profissional",
          especialidade: perfil?.especialidade || "",
          cidade: perfil?.localizacao?.cidade || "",
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
      servicos: servicosSelecionados,
    });
  };

  const totalSelecionado = servicosSelecionados.reduce(
    (acc, item) => acc + Number(item.preco || 0),
    0
  );

  const resumoAvaliacoes = useMemo(() => {
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
  }, [avaliacoes]);

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
    <View style={styles.mainContainer}>
      <ScrollView>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1625834317364-b32c140fd360?q=80&w=1000&auto=format&fit=crop',
          }}
          style={styles.cover}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.profileInfoArea}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(perfil?.nome || perfil?.nomeCompleto || perfil?.nomeNegocio || "P").charAt(0)}
            </Text>
          </View>

          <Text style={styles.nomeClinica}>
            {perfil?.nome || perfil?.nomeCompleto || perfil?.nomeNegocio || "Profissional"}
          </Text>

          <Text style={styles.especialidade}>
            {perfil?.especialidade || "Especialidade não informada"}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={colors.warning || "#FFC107"} />
            <Text style={styles.ratingText}> {textoAvaliacao}</Text>
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
                {perfil?.localizacao?.cidade || "Localização"}
              </Text>
            </View>

            <View style={[styles.statBox, styles.statMiddle]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
              <Text style={styles.statText}>
                {resumoAvaliacoes.quantidade} avaliação{resumoAvaliacoes.quantidade === 1 ? "" : "ões"}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.statText}>Verificado</Text>
            </View>
          </View>

          {!!perfil?.bio && (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>{perfil.bio}</Text>
            </View>
          )}
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Serviços</Text>

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
                >
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{servico.nome}</Text>
                    <Text style={styles.servicePrice}>
                      R$ {Number(servico.preco || 0).toFixed(2)}
                    </Text>
                  </View>

                  <Ionicons
                    name={selecionado ? "checkmark-circle" : "add-circle-outline"}
                    size={28}
                    color={selecionado ? colors.success : colors.primary}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.avaliacoesSection}>
          <Text style={styles.sectionTitle}>Avaliações</Text>

          {avaliacoes.length === 0 ? (
            <Text style={styles.emptyText}>Este profissional ainda não recebeu avaliações.</Text>
          ) : (
            avaliacoes.map((item) => (
              <View key={item.id} style={styles.avaliacaoCard}>
                <View style={styles.avaliacaoHeader}>
                  <View style={{ flex: 1 }}>
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

        <View style={{ height: 120 }} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cover: {
    height: 180,
    width: '100%',
    backgroundColor: colors.primary,
  },

  backBtn: {
    marginTop: 45,
    marginLeft: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },

  profileInfoArea: {
    backgroundColor: '#FFF',
    marginTop: -30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: 'center',
    paddingBottom: 20,
  },

  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.inputFill,
    borderWidth: 4,
    borderColor: '#FFF',
    marginTop: -40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },

  nomeClinica: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    color: colors.textDark,
    textAlign: 'center',
  },

  especialidade: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
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
    width: '90%',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#EEE',
  },

  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },

  bioBox: {
    width: '90%',
    marginTop: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
  },

  bioText: {
    fontSize: 14,
    color: colors.textDark,
    lineHeight: 20,
    textAlign: 'center',
  },

  servicesSection: {
    padding: 20,
  },

  avaliacoesSection: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.textDark,
  },

  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },

  serviceCard: {
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
  },

  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },

  serviceInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },

  servicePrice: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },

  avaliacaoCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  avaliacaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    marginLeft: 10,
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
    padding: 20,
    paddingBottom: 35,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#EEE',
    elevation: 20,
  },

  footerLabel: {
    fontSize: 12,
    color: colors.secondary,
  },

  footerPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  btnFinal: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
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