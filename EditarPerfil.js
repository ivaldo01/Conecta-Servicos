import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

function EditarPerfil({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
        Alert.alert("Erro", "Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, []);

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSalvando(true);
    try {
      const perfilRef = doc(db, "usuarios", user.uid);
      await updateDoc(perfilRef, {
        ...perfil,
        updatedAt: new Date().toISOString()
      });
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Erro ao atualizar perfil: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Editar Perfil</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nome Completo / Razão Social</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={perfil.nome}
          onChangeText={(text) => setPerfil({ ...perfil, nome: text })}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[styles.input, { backgroundColor: '#f0f0f0' }]}
          placeholder="Email"
          value={perfil.email}
          editable={false} // E-mail geralmente não se muda assim por segurança
        />

        <Text style={styles.label}>WhatsApp (Importante para OS)</Text>
        <TextInput
          style={styles.input}
          placeholder="Telefone/WhatsApp"
          value={perfil.telefone || perfil.whatsapp}
          onChangeText={(text) => setPerfil({ ...perfil, whatsapp: text, telefone: text })}
          keyboardType="phone-pad"
        />

        {/* Campos Dinâmicos que você criou */}
        {perfil.cpf !== undefined && (
          <>
            <Text style={styles.label}>CPF</Text>
            <TextInput style={styles.input} placeholder="CPF" value={perfil.cpf} onChangeText={(text) => setPerfil({ ...perfil, cpf: text })} />
          </>
        )}

        {perfil.cnpj !== undefined && (
          <>
            <Text style={styles.label}>CNPJ</Text>
            <TextInput style={styles.input} placeholder="CNPJ" value={perfil.cnpj} onChangeText={(text) => setPerfil({ ...perfil, cnpj: text })} />
          </>
        )}

        <Text style={styles.label}>Endereço Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Rua, Número, Bairro, Cidade"
          value={perfil.endereco}
          onChangeText={(text) => setPerfil({ ...perfil, endereco: text })}
        />

        {/* Campo de Bio para o Profissional */}
        <Text style={styles.label}>Sobre / Descrição</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Fale um pouco sobre seus serviços..."
          value={perfil.bio}
          onChangeText={(text) => setPerfil({ ...perfil, bio: text })}
          multiline
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={handleUpdate}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.buttonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.primary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#333'
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default EditarPerfil;