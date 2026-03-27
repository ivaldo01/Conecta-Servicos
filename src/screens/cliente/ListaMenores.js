import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { useFocusEffect } from '@react-navigation/native'; // Importante para atualizar a lista ao voltar
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';

function ListaMenores({ navigation }) {
  const [menores, setMenores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Esta função corre sempre que a tela ganha foco (quando entras ou voltas para ela)
  useFocusEffect(
    React.useCallback(() => {
      fetchMenores();
    }, [])
  );

  const fetchMenores = async () => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // O caminho exato conforme as regras de segurança que configuramos
      const menoresRef = collection(doc(db, "usuarios", user.uid), "menores");
      const snapshot = await getDocs(menoresRef);

      // Mapeamento corrigido: agora usa os nomes simples (nome, idade, etc)
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setMenores(lista);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      Alert.alert("Erro", "Não foi possível carregar a lista de menores.");
    } finally {
      setLoading(false);
    }
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
              if (!user) return;
              // Apaga o documento específico dentro da subcoleção do usuário
              await deleteDoc(doc(db, "usuarios", user.uid, "menores", id));
              setMenores(menores.filter(m => m.id !== id));
              Alert.alert("Sucesso", "Registo removido.");
            } catch (error) {
              Alert.alert("Erro", "Falha ao excluir: " + error.message);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* CORREÇÃO AQUI: Usando os nomes exatos do Firebase (sem o sufixo 'Menor') */}
      <Text style={styles.cardTitle}>{item.nome || "Sem nome"}</Text>
      <Text style={styles.cardText}>Idade: {item.idade}</Text>
      <Text style={styles.cardText}>CPF: {item.cpf}</Text>
      <Text style={styles.cardText}>RG: {item.rg}</Text>
      <Text style={styles.cardText}>Telefone: {item.telefone}</Text>

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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meus Dependentes (Menores)</Text>

      {menores.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: '#888' }}>Nenhum menor cadastrado.</Text>
        </View>
      ) : (
        <FlatList
          data={menores}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.textDark, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: colors.primary },
  cardText: { fontSize: 14, marginBottom: 3, color: '#555' },
  cardButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }
});

export default ListaMenores;