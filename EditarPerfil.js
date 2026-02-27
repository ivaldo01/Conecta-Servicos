import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

function EditarPerfil({ navigation }) {
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

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const perfilRef = doc(db, "usuarios", user.uid);
      await updateDoc(perfilRef, {
        ...perfil,
        updatedAt: new Date().toISOString()
      });
      alert("Perfil atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      alert("Erro ao atualizar perfil: " + error.message);
    }
  };

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
      <Text style={styles.title}>Editar Perfil</Text>

      <TextInput style={styles.input} placeholder="Nome" value={perfil.nome} onChangeText={(text) => setPerfil({ ...perfil, nome: text })} />
      <TextInput style={styles.input} placeholder="Email" value={perfil.email} onChangeText={(text) => setPerfil({ ...perfil, email: text })} keyboardType="email-address" autoCapitalize="none" />
      {perfil.telefone !== undefined && (
        <TextInput style={styles.input} placeholder="Telefone" value={perfil.telefone} onChangeText={(text) => setPerfil({ ...perfil, telefone: text })} />
      )}
      {perfil.cpf !== undefined && (
        <TextInput style={styles.input} placeholder="CPF" value={perfil.cpf} onChangeText={(text) => setPerfil({ ...perfil, cpf: text })} />
      )}
      {perfil.rg !== undefined && (
        <TextInput style={styles.input} placeholder="RG" value={perfil.rg} onChangeText={(text) => setPerfil({ ...perfil, rg: text })} />
      )}
      {perfil.cnpj !== undefined && (
        <TextInput style={styles.input} placeholder="CNPJ" value={perfil.cnpj} onChangeText={(text) => setPerfil({ ...perfil, cnpj: text })} />
      )}
      {perfil.endereco !== undefined && (
        <TextInput style={styles.input} placeholder="Endereço" value={perfil.endereco} onChangeText={(text) => setPerfil({ ...perfil, endereco: text })} />
      )}

      <View style={styles.buttonContainer}>
        <CustomButton title="Salvar Alterações" icon="save" color={colors.success} onPress={handleUpdate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.textDark, textAlign: 'center' },
  input: { width: '100%', padding: 12, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, borderRadius: 8 },
  buttonContainer: { marginTop: 10 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginVertical: 8 },
  buttonText: { color: colors.textLight, fontSize: 16, fontWeight: 'bold' }
});

export default EditarPerfil;