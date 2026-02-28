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
  const [loadingCep, setLoadingCep] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Função para buscar endereço via CEP
  const handleCepBlur = async () => {
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
          Alert.alert("Erro", "CEP não encontrado.");
        } else {
          // Preenche o endereço automaticamente
          setEndereco(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao buscar CEP. Verifique sua conexão.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSignUp = async () => {
    // Validação de campos obrigatórios
    if (!nome || !email || !password || !cep || !numero) {
      Alert.alert("Erro", "Por favor, preencha todos os campos, incluindo seu endereço.");
      return;
    }

    if (!aceitouTermos) {
      Alert.alert("Atenção", "Você precisa aceitar os Termos de Uso.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Salva no Firestore incluindo os dados de localização
      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        nome,
        email,
        cep,
        enderecoResidencial: `${endereco}, ${numero}`,
        tipo: "cliente",
        dataCadastro: new Date(),
        status: "ativo"
      });

      Alert.alert("Sucesso!", "Sua conta foi criada com sucesso.");
      navigation.replace("Main");
    } catch (error) {
      let message = "Erro ao criar conta.";
      if (error.code === 'auth/email-already-in-use') message = "Este e-mail já está em uso.";
      if (error.code === 'auth/weak-password') message = "A senha deve ter pelo menos 6 caracteres.";
      Alert.alert("Erro", message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Criar Conta Cliente</Text>
      <Text style={styles.subtitle}>Preencha seus dados para agendar serviços com facilidade.</Text>

      <TextInput style={styles.input} placeholder="Nome Completo" value={nome} onChangeText={setNome} />

      {/* Bloco de CEP e Endereço */}
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
        style={[styles.input, { backgroundColor: '#F0F0F0' }]}
        placeholder="Endereço (Preenchido via CEP)"
        value={endereco}
        editable={false} // Mantemos false para o cliente não alterar o que o CEP trouxe
      />

      <TextInput
        style={styles.input}
        placeholder="Número e Complemento (Apto, Casa...)"
        value={numero}
        onChangeText={setNumero}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Crie uma Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={[styles.checkbox, aceitouTermos && styles.checkboxChecked]}
          onPress={() => setAceitouTermos(!aceitouTermos)}
        >
          {aceitouTermos && <Ionicons name="checkmark" size={18} color="#FFF" />}
        </TouchableOpacity>
        <View style={styles.textContainer}>
          <Text style={styles.termosText}>Li e aceito os </Text>
          <TouchableOpacity onPress={() => navigation.navigate('TermosUso')}>
            <Text style={styles.termosLink}>Termos de Uso e Privacidade</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CustomButton
        title="Finalizar Cadastro"
        onPress={handleSignUp}
        color={aceitouTermos ? colors.primary : '#CCC'}
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
        <Text style={{ color: '#666', textAlign: 'center' }}>Já tenho conta? Voltar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.textDark, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#EEE', elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, marginTop: 10 },
  checkbox: { width: 24, height: 24, borderWidth: 2, borderColor: colors.primary, borderRadius: 6, marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  checkboxChecked: { backgroundColor: colors.primary },
  textContainer: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
  termosText: { fontSize: 14, color: '#444' },
  termosLink: { fontSize: 14, color: colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }
});