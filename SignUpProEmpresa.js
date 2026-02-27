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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';


// =========================
// 🔹 MÁSCARAS MANUAIS
// =========================

function formatCPFCNPJ(value) {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return cleaned
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
}

function formatCEP(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2');
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

export default function SignUpProEmpresa({ navigation }) {

  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastroPro = async () => {

    if (!nome || !documento || !especialidade || !cep || !endereco || !numero) {
      Alert.alert("Erro", "Preencha todos os campos obrigatórios.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    setLoading(true);

    try {

      // 🔥 Geocoding
      let latitude = -23.5505;
      let longitude = -46.6333;

      try {
        const query = `${endereco}, ${numero}, ${cep}, Brasil`;

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
          { headers: { 'User-Agent': 'ConectaServicos/1.0' } }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            latitude = parseFloat(data[0].lat);
            longitude = parseFloat(data[0].lon);
          }
        }

      } catch (geoError) {
        console.log("Erro geocoding:", geoError);
      }

      const location = {
        latitude,
        longitude
      };

      // =========================
      // 🔒 DADOS PRIVADOS
      // =========================

      await setDoc(doc(db, "usuarios", user.uid), {
        nome,
        email: user.email,
        documento,
        telefone,
        tipo: "profissional",
        createdAt: serverTimestamp()
      }, { merge: true });

      // =========================
      // 🌍 DADOS PÚBLICOS
      // =========================

      await setDoc(doc(db, "profissionais", user.uid), {
        nome,
        especialidade,
        descricao: descricao || "",
        location,
        ativo: true,
        createdAt: serverTimestamp()
      });

      Alert.alert("Sucesso!", "Perfil profissional criado com sucesso.");
      navigation.replace("ConfigurarAgenda");

    } catch (error) {
      console.error("Erro cadastro profissional:", error);
      Alert.alert("Erro", "Falha ao criar perfil profissional.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfil Profissional</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome *"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="CPF ou CNPJ *"
        keyboardType="numeric"
        value={documento}
        onChangeText={(text) => setDocumento(formatCPFCNPJ(text))}
      />

      <TextInput
        style={styles.input}
        placeholder="Especialidade *"
        value={especialidade}
        onChangeText={setEspecialidade}
      />

      <TextInput
        style={styles.input}
        placeholder="CEP *"
        keyboardType="numeric"
        value={cep}
        onChangeText={(text) => setCep(formatCEP(text))}
      />

      <TextInput
        style={styles.input}
        placeholder="Rua *"
        value={endereco}
        onChangeText={setEndereco}
      />

      <TextInput
        style={styles.input}
        placeholder="Número *"
        keyboardType="numeric"
        value={numero}
        onChangeText={setNumero}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone"
        keyboardType="numeric"
        value={telefone}
        onChangeText={(text) => setTelefone(formatTelefone(text))}
      />

      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Descrição"
        value={descricao}
        onChangeText={setDescricao}
        multiline
      />

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <CustomButton
            title="Salvar Perfil"
            icon="checkmark-circle"
            color={colors.success}
            onPress={handleCadastroPro}
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