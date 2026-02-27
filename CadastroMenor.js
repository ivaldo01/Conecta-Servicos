import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';

// Funções de Máscara
function formatCPF(value) {
  return value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatRG(value) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1})$/, '$1-$2');
}

function formatTelefone(value) {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export default function CadastroMenor({ navigation }) {
  const [nomeMenor, setNomeMenor] = useState('');
  const [idadeMenor, setIdadeMenor] = useState('');
  const [cpfMenor, setCpfMenor] = useState('');
  const [rgMenor, setRgMenor] = useState('');
  const [telefoneMenor, setTelefoneMenor] = useState('');

  const handleCadastroMenor = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Erro", "Você precisa estar logado.");
      return;
    }

    if (!nomeMenor || !idadeMenor) {
      Alert.alert("Atenção", "Nome e Idade são obrigatórios.");
      return;
    }

    try {
      // LGPD: Salvando com rastro do responsável e consentimento explícito
      await addDoc(collection(db, "usuarios", user.uid, "menores"), {
        nome: nomeMenor,
        idade: idadeMenor,
        cpf: cpfMenor,
        rg: rgMenor,
        telefone: telefoneMenor,
        responsavelId: user.uid,
        consentimentoResponsavel: true,
        dataCadastro: serverTimestamp()
      });

      Alert.alert("Sucesso", "Menor cadastrado com segurança e conformidade LGPD.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar: " + error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro de Menor</Text>

      <TextInput style={styles.input} placeholder="Nome Completo" value={nomeMenor} onChangeText={setNomeMenor} />
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
        placeholder="Telefone do Responsável"
        keyboardType="numeric"
        value={telefoneMenor}
        onChangeText={(t) => setTelefoneMenor(formatTelefone(t))}
      />

      <Text style={styles.legendaLgpd}>
        * Ao cadastrar, você confirma ser o responsável legal por este menor.
      </Text>

      <View style={styles.buttonContainer}>
        <CustomButton title="Cadastrar Menor" icon="person-add" color={colors.primary} onPress={handleCadastroMenor} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: 'bold', color: colors.textDark },
  input: { width: '100%', height: 50, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  buttonContainer: { width: '100%', marginTop: 10 },
  legendaLgpd: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 15, fontStyle: 'italic' }
});