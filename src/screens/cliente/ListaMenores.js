import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';
import Sidebar from '../../components/Sidebar';
import { SafeAreaView } from 'react-native-safe-area-context';

function ListaMenores({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

  const [menores, setMenores] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchMenores();
    }, [])
  );

  const fetchMenores = async () => {
    const user = auth.currentUser;

    if (!user?.uid) {
      setLoading(false);
      setMenores([]);
      return;
    }

    try {
      setLoading(true);

      const menoresRef = collection(doc(db, "usuarios", user.uid), "menores");
      const snapshot = await getDocs(menoresRef);

      const lista = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setMenores(lista);
    } catch (error) {
      console.error("Erro ao carregar menores:", error);
      Alert.alert("Erro", "Não foi possível carregar a lista de dependentes.");
    } finally {
      setLoading(false);
    }
  };

  const irParaCadastro = () => {
    navigation.navigate("CadastroMenor");
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir este dependente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (!user?.uid) return;

              await deleteDoc(doc(db, "usuarios", user.uid, "menores", id));
              setMenores((prev) => prev.filter((m) => m.id !== id));
              Alert.alert("Sucesso", "Registro removido.");
            } catch (error) {
              console.log("Erro ao excluir menor:", error);
              Alert.alert("Erro", "Falha ao excluir: " + error.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarMini}>
          <Text style={styles.avatarMiniText}>{getInicialNome(item.nome)}</Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>{item.nome || "Sem nome"}</Text>
          <Text style={styles.cardText}>Idade: {item.idade || "-"}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        {!!item.cpf && (
          <View style={styles.detailRow}>
            <Ionicons name="card-outline" size={14} color="#64748B" />
            <Text style={styles.cardTextDetail}>CPF: {item.cpf}</Text>
          </View>
        )}

        {!!item.telefone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#64748B" />
            <Text style={styles.cardTextDetail}>Telefone: {item.telefone}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate("EditarMenor", { menorId: item.id })}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editBtnText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.deleteBtnText}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getInicialNome = (nome) => {
    return nome ? nome.charAt(0).toUpperCase() : 'D';
  };

  const MainContent = (
    <View style={[styles.mainContent, isLargeScreen && styles.mainContentLarge]}>
      <View style={isLargeScreen ? styles.webContainer : null}>
        <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
          <View style={styles.headerTextArea}>
            <Text style={styles.title}>Meus Dependentes</Text>
            <Text style={styles.subtitle}>
              Cadastre menores para agendar atendimentos em nome deles.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addTopButton}
            activeOpacity={0.9}
            onPress={irParaCadastro}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {menores.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="people-outline" size={48} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>Nenhum dependente cadastrado</Text>
            <Text style={styles.emptyText}>
              Cadastre um menor para poder realizar agendamentos para ele.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={irParaCadastro}
              activeOpacity={0.9}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.emptyButtonText}>Cadastrar dependente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={isLargeScreen ? styles.gridDesktop : null}>
            {isLargeScreen ? (
              menores.map((item) => (
                <View key={item.id} style={styles.gridItemDesktop}>
                  {renderItem({ item })}
                </View>
              ))
            ) : (
              <FlatList
                data={menores}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </View>

      {!isLargeScreen && menores.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={irParaCadastro}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando dependentes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {isLargeScreen ? (
        <View style={styles.webLayout}>
          <Sidebar navigation={navigation} activeRoute="Perfil" />
          <View style={styles.webContentArea}>
            {MainContent}
          </View>
        </View>
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          {MainContent}
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContent: {
    flex: 1,
    padding: 20,
  },
  mainContentLarge: {
    padding: 40,
    paddingTop: 48,
  },
  webContainer: {
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: colors.primary,
    padding: 24,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerLarge: {
    marginBottom: 32,
  },
  headerTextArea: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  addTopButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  gridItemDesktop: {
    width: '31.5%',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 60,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    marginLeft: 10,
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLarge: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarMini: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  cardHeaderInfo: {
    marginLeft: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  cardDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTextDetail: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
    fontWeight: '500',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  editBtn: {
    borderColor: `${colors.primary}30`,
    backgroundColor: `${colors.primary}05`,
  },
  deleteBtn: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  editBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtnText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default ListaMenores;
