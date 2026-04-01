import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';

function ListaMenores({ navigation }) {
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
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.nome || "Sem nome"}</Text>
      <Text style={styles.cardText}>Idade: {item.idade || "-"}</Text>

      {!!item.cpf && (
        <Text style={styles.cardText}>CPF: {item.cpf}</Text>
      )}

      {!!item.telefone && (
        <Text style={styles.cardText}>Telefone: {item.telefone}</Text>
      )}

      <View style={styles.cardButtons}>
        <CustomButton
          title="Editar"
          icon="create"
          color={colors.success}
          onPress={() => navigation.navigate("EditarMenor", { menorId: item.id })}
        />
        <CustomButton
          title="Excluir"
          icon="trash"
          color={colors.danger}
          onPress={() => handleDelete(item.id)}
        />
      </View>
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
    <View style={styles.container}>
      <View style={styles.header}>
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
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.topActionArea}>
        <CustomButton
          title="Novo Dependente"
          icon="person-add"
          color={colors.primary}
          onPress={irParaCadastro}
        />
      </View>

      {menores.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="people-outline" size={30} color={colors.primary} />
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
            <Ionicons name="add-circle-outline" size={18} color="#FFF" />
            <Text style={styles.emptyButtonText}>Cadastrar dependente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={menores}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.fab}
            onPress={irParaCadastro}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: 12,
    color: colors.secondary,
    fontSize: 14,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  headerTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
  },

  addTopButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  topActionArea: {
    marginBottom: 14,
  },

  listContent: {
    paddingBottom: 100,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },

  emptyButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyButtonText: {
    marginLeft: 8,
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.primary,
  },

  cardText: {
    fontSize: 14,
    marginBottom: 3,
    color: '#555',
  },

  cardButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
});

export default ListaMenores;