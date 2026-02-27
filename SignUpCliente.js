import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';

import { db, auth } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import colors from "./colors";
import CustomButton from './components/CustomButton';


// =========================
// 🔹 MÁSCARAS MANUAIS
// =========================

function formatCPF(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatTelefone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}


// =========================
// 🔹 COMPONENTE
// =========================

export default function SignUpCliente({ navigation }) {

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {

    if (!nome || !cpf || !email || !senha) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        senha
      );

      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        cpf,
        telefone,
        email,
        tipo: "cliente",
        createdAt: serverTimestamp()
      });

      Alert.alert("Sucesso!", "Cadastro realizado com sucesso.");

      navigation.replace("Home");

    } catch (error) {
      console.error("Erro cadastro cliente:", error);
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro Cliente</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome *"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="CPF *"
        keyboardType="numeric"
        value={cpf}
        onChangeText={(text) => setCpf(formatCPF(text))}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone"
        keyboardType="numeric"
        value={telefone}
        onChangeText={(text) => setTelefone(formatTelefone(text))}
      />

      <TextInput
        style={styles.input}
        placeholder="Email *"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha *"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <CustomButton
            title="Cadastrar"
            icon="person-add"
            color={colors.primary}
            onPress={handleCadastro}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.textDark
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  buttonContainer: {
    marginTop: 10
  }
});