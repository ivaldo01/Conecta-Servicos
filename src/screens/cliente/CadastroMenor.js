import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';

function formatCPF(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14);
}

function formatTelefone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
}

export default function CadastroMenor({ navigation }) {
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  const idadeRef = useRef(null);
  const cpfRef = useRef(null);
  const telefoneRef = useRef(null);

  const handleSave = async () => {
    Keyboard.dismiss();

    const user = auth.currentUser;

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (!nome.trim() || !idade.trim()) {
      Alert.alert("Atenção", "Preencha o nome e a idade.");
      return;
    }

    try {
      await addDoc(collection(db, "usuarios", user.uid, "menores"), {
        nome: nome.trim(),
        idade: idade.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
        responsavelId: user.uid,
        consentimento: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });

      Alert.alert("Sucesso", "Dependente cadastrado com sucesso!");
      navigation.goBack();
    } catch (e) {
      console.log("Erro ao cadastrar menor:", e);
      Alert.alert("Erro", e.message || "Não foi possível cadastrar o dependente.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Novo Dependente</Text>
          <Text style={styles.subtitle}>
            Cadastre um menor para poder agendar atendimentos em nome dele.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nome do menor"
            value={nome}
            onChangeText={setNome}
            returnKeyType="next"
            onSubmitEditing={() => idadeRef.current?.focus()}
          />

          <TextInput
            ref={idadeRef}
            style={styles.input}
            placeholder="Idade"
            value={idade}
            onChangeText={setIdade}
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => cpfRef.current?.focus()}
          />

          <TextInput
            ref={cpfRef}
            style={styles.input}
            placeholder="CPF (opcional)"
            value={cpf}
            onChangeText={(text) => setCpf(formatCPF(text))}
            keyboardType="numeric"
            returnKeyType="next"
            onSubmitEditing={() => telefoneRef.current?.focus()}
          />

          <TextInput
            ref={telefoneRef}
            style={styles.input}
            placeholder="Telefone (opcional)"
            value={telefone}
            onChangeText={(text) => setTelefone(formatTelefone(text))}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Ao cadastrar, você declara ser o responsável legal pelo menor.
            </Text>
          </View>

          <CustomButton
            title="Salvar Dependente"
            icon="save"
            color={colors.primary}
            onPress={handleSave}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.background,
    paddingBottom: 40,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.textDark,
  },

  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },

  input: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    color: colors.textDark,
  },

  infoBox: {
    marginBottom: 20,
    backgroundColor: '#FFF7E8',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0A8',
  },

  infoText: {
    fontSize: 13,
    color: '#7A5C00',
    textAlign: 'center',
    lineHeight: 18,
  },
});