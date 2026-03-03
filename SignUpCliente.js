import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function SignUpCliente({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          Alert.alert("Erro", "CEP não encontrado.");
        } else {
          setEndereco(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch (e) {
        Alert.alert("Aviso", "Não foi possível buscar o CEP automaticamente. Digite o endereço manualmente.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSignUp = async () => {
    if (!nome || !email || !password || !cep || !numero || !endereco) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }
    if (!aceitouTermos) {
      Alert.alert("Atenção", "Você precisa aceitar os Termos de Uso.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        nome,
        email,
        cep: cep.replace(/\D/g, ''),
        enderecoResidencial: `${endereco}, ${numero}`,
        tipo: "cliente",
        dataCadastro: new Date(),
        status: "ativo"
      });
      Alert.alert("Sucesso!", "Sua conta foi criada!");
      navigation.replace("Main");
    } catch (error) {
      let message = "Erro ao criar conta.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      Alert.alert("Erro", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta Cliente</Text>
      <TextInput style={styles.input} placeholder="Nome Completo" value={nome} onChangeText={setNome} />

      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1, marginRight: 10 }]}
          placeholder="CEP (Só números)"
          value={cep}
          onChangeText={setCep}
          onBlur={handleCepBlur}
          keyboardType="numeric"
          maxLength={8}
        />
        {loadingCep && <ActivityIndicator color={colors.primary} style={{ marginBottom: 15 }} />}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Endereço (Rua, Bairro...)"
        value={endereco}
        onChangeText={setEndereco}
      />

      <TextInput style={styles.input} placeholder="Número e Complemento" value={numero} onChangeText={setNumero} />
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />

      <View style={styles.checkboxContainer}>
        <TouchableOpacity style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]} onPress={() => setAceitouTermos(!aceitouTermos)}>
          {aceitouTermos && <Ionicons name="checkmark" size={18} color="#FFF" />}
        </TouchableOpacity>
        <Text>Li e aceito os Termos de Uso</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color={colors.primary} /> : <CustomButton title="Finalizar Cadastro" onPress={handleSignUp} color={aceitouTermos ? colors.primary : '#CCC'} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.primary, borderRadius: 6, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary }
});