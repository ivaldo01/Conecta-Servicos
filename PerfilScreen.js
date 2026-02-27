import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

function PerfilScreen({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerfil = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const perfilRef = doc(db, "usuarios", user.uid);
        const perfilSnap = await getDoc(perfilRef);
        if (perfilSnap.exists()) {
          setPerfil(perfilSnap.data());
        }
      } catch (error) {
        alert("Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Perfil não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meu Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>Nome: {perfil.nome}</Text>
        <Text style={styles.cardText}>Email: {perfil.email}</Text>
        {perfil.telefone && <Text style={styles.cardText}>Telefone: {perfil.telefone}</Text>}
        {perfil.cpf && <Text style={styles.cardText}>CPF: {perfil.cpf}</Text>}
        {perfil.rg && <Text style={styles.cardText}>RG: {perfil.rg}</Text>}
        {perfil.cnpj && <Text style={styles.cardText}>CNPJ: {perfil.cnpj}</Text>}
        {perfil.endereco && <Text style={styles.cardText}>Endereço: {perfil.endereco}</Text>}
        <Text style={styles.cardText}>Perfil: {perfil.perfil}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Editar Perfil" 
          icon="create" 
          color={colors.warning} 
          onPress={() => navigation.navigate("EditarPerfil")} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.textDark, textAlign: 'center' },
  card: { backgroundColor: colors.card, padding: 15, borderRadius: 10, marginBottom: 20, elevation: 2 },
  cardText: { fontSize: 16, marginBottom: 8, color: '#555' },
  buttonContainer: { marginTop: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginVertical: 8 },
  buttonText: { color: colors.textLight, fontSize: 16, fontWeight: 'bold' }
});

export default PerfilScreen;