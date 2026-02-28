import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function SignUpProEmpresa({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const formatPhone = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15);
  };

  const handleCepBlur = async () => {
    if (cep.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
          Alert.alert("Erro", "CEP não encontrado.");
        } else {
          setEndereco(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
        }
      } catch (e) {
        Alert.alert("Erro", "Falha ao buscar CEP.");
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSignUp = async () => {
    if (!nome || !email || !password || !especialidade || !cep || !numero) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // BUSCA COORDENADAS REAIS
      let lat = -23.5505; let lng = -46.6333;
      try {
        const fullAddr = `${endereco}, ${numero}, Brazil`;
        const geo = await Location.geocodeAsync(fullAddr);
        if (geo.length > 0) {
          lat = geo[0].latitude;
          lng = geo[0].longitude;
        }
      } catch (e) { console.log("Erro GPS:", e); }

      await setDoc(doc(db, "usuarios", userCredential.user.uid), {
        nome, email, especialidade, whatsapp, cep,
        enderecoCompleto: `${endereco}, ${numero}`,
        tipo: "profissional", status: "ativo",
        dataCadastro: new Date(),
        latitude: lat, longitude: lng,
      });

      navigation.replace("Main");
    } catch (error) { Alert.alert("Erro", error.message); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro Profissional</Text>
      <TextInput style={styles.input} placeholder="Nome da Empresa" value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="Especialidade" value={especialidade} onChangeText={setEspecialidade} />
      <TextInput style={styles.input} placeholder="WhatsApp" value={whatsapp} onChangeText={(t) => setWhatsapp(formatPhone(t))} keyboardType="phone-pad" />
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1, marginRight: 10 }]} placeholder="CEP" value={cep} onChangeText={setCep} onBlur={handleCepBlur} keyboardType="numeric" maxLength={8} />
        {loadingCep && <ActivityIndicator color={colors.primary} />}
      </View>
      <TextInput style={styles.input} placeholder="Endereço" value={endereco} onChangeText={setEndereco} />
      <TextInput style={styles.input} placeholder="Número" value={numero} onChangeText={setNumero} />
      <TextInput style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAceitouTermos(!aceitouTermos)}>
        <Ionicons name={aceitouTermos ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
        <Text style={{ marginLeft: 8 }}>Aceito os termos</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator size="large" /> : <CustomButton title="Cadastrar" onPress={handleSignUp} color={colors.primary} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 25 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }
});