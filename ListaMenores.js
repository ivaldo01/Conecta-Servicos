import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

function ListaMenores({ navigation }) {
  const [menores, setMenores] = useState([]);

  useEffect(() => {
    const fetchMenores = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const menoresRef = collection(doc(db, "usuarios", user.uid), "menores");
        const snapshot = await getDocs(menoresRef);
        const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMenores(lista);
      } catch (error) {
        alert("Erro ao carregar menores: " + error.message);
      }
    };
    fetchMenores();
  }, []);

  const handleDelete = async (id) => {
    Alert.alert(
      "Confirmar exclusão",
      "Tem certeza que deseja excluir este menor?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, "usuarios", user.uid, "menores", id));
            setMenores(menores.filter(m => m.id !== id));
            alert("Menor excluído com sucesso!");
          } catch (error) {
            alert("Erro ao excluir: " + error.message);
          }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.nomeMenor}</Text>
      <Text style={styles.cardText}>Idade: {item.idadeMenor}</Text>
      <Text style={styles.cardText}>CPF: {item.cpfMenor}</Text>
      <Text style={styles.cardText}>RG: {item.rgMenor}</Text>
      <Text style={styles.cardText}>Telefone: {item.telefoneMenor}</Text>

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista de Menores</Text>
      <FlatList
        data={menores}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: colors.textDark, textAlign: 'center' },
  card: { backgroundColor: colors.card, padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: colors.textDark },
  cardText: { fontSize: 14, marginBottom: 3, color: '#555' },
  cardButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginHorizontal: 5, flex: 1 },
  buttonText: { color: colors.textLight, fontSize: 14, fontWeight: 'bold' }
});

export default ListaMenores;