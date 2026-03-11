import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';

function formatCPF(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatRG(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

function formatTelefone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function EditarMenor({ route, navigation }) {
  const { menorId } = route.params;

  const [nomeMenor, setNomeMenor] = useState('');
  const [idadeMenor, setIdadeMenor] = useState('');
  const [cpfMenor, setCpfMenor] = useState('');
  const [rgMenor, setRgMenor] = useState('');
  const [telefoneMenor, setTelefoneMenor] = useState('');

  useEffect(() => {
    const fetchMenor = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const menorRef = doc(db, "usuarios", user.uid, "menores", menorId);
        const menorSnap = await getDoc(menorRef);
        if (menorSnap.exists()) {
          const data = menorSnap.data();
          setNomeMenor(data.nomeMenor || '');
          setIdadeMenor(data.idadeMenor || '');
          setCpfMenor(data.cpfMenor || '');
          setRgMenor(data.rgMenor || '');
          setTelefoneMenor(data.telefoneMenor || '');
        }
      } catch (error) {
        alert("Erro ao carregar dados: " + error.message);
      }
    };
    fetchMenor();
  }, [menorId]);

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const menorRef = doc(db, "usuarios", user.uid, "menores", menorId);
      await updateDoc(menorRef, {
        nomeMenor,
        idadeMenor,
        cpfMenor,
        rgMenor,
        telefoneMenor,
        updatedAt: serverTimestamp()
      });
      alert("Dados atualizados com sucesso!");
      navigation.goBack();
    } catch (error) {
      alert("Erro ao atualizar: " + error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Editar Menor</Text>

      <TextInput style={styles.input} placeholder="Nome" value={nomeMenor} onChangeText={setNomeMenor} />
      <TextInput style={styles.input} placeholder="Idade" value={idadeMenor} onChangeText={setIdadeMenor} keyboardType="numeric" />

      <TextInput
        style={styles.input}
        placeholder="CPF"
        keyboardType="numeric"
        value={cpfMenor}
        onChangeText={(t) => setCpfMenor(formatCPF(t))}
      />

      <TextInput
        style={styles.input}
        placeholder="RG"
        keyboardType="numeric"
        value={rgMenor}
        onChangeText={(t) => setRgMenor(formatRG(t))}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone"
        keyboardType="numeric"
        value={telefoneMenor}
        onChangeText={(t) => setTelefoneMenor(formatTelefone(t))}
      />

      <View style={styles.buttonContainer}>
        <CustomButton title="Salvar Alterações" icon="save" color={colors.success} onPress={handleUpdate} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: 'bold', color: colors.textDark },
  input: { width: '90%', padding: 10, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, borderRadius: 8, backgroundColor: '#fff' },
  buttonContainer: { width: '90%', marginTop: 20 },
});

export default EditarMenor;