import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function CadastroMenor({ navigation }) {
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!nome || !idade) {
      Alert.alert("Atenção", "Preencha o nome e a idade.");
      return;
    }

    try {
      await addDoc(collection(db, "usuarios", user.uid, "menores"), {
        nome,
        idade,
        responsavelId: user.uid,
        consentimento: true,
        dataCadastro: serverTimestamp()
      });
      Alert.alert("Sucesso", "Dependente cadastrado!");
      navigation.goBack();
    } catch (e) { Alert.alert("Erro", e.message); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Novo Dependente</Text>
      <TextInput style={styles.input} placeholder="Nome do Menor" value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="Idade" value={idade} onChangeText={setIdade} keyboardType="numeric" />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Ao cadastrar, você declara ser o responsável legal conforme os
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('TermosUso')}>
          <Text style={styles.link}> Termos de Uso e Privacidade.</Text>
        </TouchableOpacity>
      </View>

      <CustomButton title="Salvar Dependente" icon="save" color={colors.primary} onPress={handleSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  infoBox: { marginBottom: 20, alignItems: 'center' },
  infoText: { fontSize: 13, color: '#666', textAlign: 'center' },
  link: { fontSize: 13, color: colors.primary, fontWeight: 'bold' }
});