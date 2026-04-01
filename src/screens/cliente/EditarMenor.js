import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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

function EditarMenor({ route, navigation }) {
  const { menorId } = route.params;

  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');

  const idadeRef = useRef(null);
  const cpfRef = useRef(null);
  const telefoneRef = useRef(null);

  useEffect(() => {
    const fetchMenor = async () => {
      const user = auth.currentUser;
      if (!user?.uid) return;

      try {
        const menorRef = doc(db, "usuarios", user.uid, "menores", menorId);
        const menorSnap = await getDoc(menorRef);

        if (menorSnap.exists()) {
          const data = menorSnap.data();
          setNome(data.nome || '');
          setIdade(data.idade || '');
          setCpf(data.cpf || '');
          setTelefone(data.telefone || '');
        }
      } catch (error) {
        console.log("Erro ao carregar menor:", error);
        Alert.alert("Erro", "Erro ao carregar dados: " + error.message);
      }
    };

    fetchMenor();
  }, [menorId]);

  const handleUpdate = async () => {
    Keyboard.dismiss();

    const user = auth.currentUser;
    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    if (!nome.trim() || !idade.trim()) {
      Alert.alert("Atenção", "Preencha nome e idade.");
      return;
    }

    try {
      const menorRef = doc(db, "usuarios", user.uid, "menores", menorId);

      await updateDoc(menorRef, {
        nome: nome.trim(),
        idade: idade.trim(),
        cpf: cpf.trim(),
        telefone: telefone.trim(),
        atualizadoEm: serverTimestamp(),
      });

      Alert.alert("Sucesso", "Dados atualizados com sucesso!");
      navigation.goBack();
    } catch (error) {
      console.log("Erro ao atualizar menor:", error);
      Alert.alert("Erro", "Erro ao atualizar: " + error.message);
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
          <Text style={styles.title}>Editar Dependente</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome"
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
            keyboardType="numeric"
            value={cpf}
            onChangeText={(t) => setCpf(formatCPF(t))}
            returnKeyType="next"
            onSubmitEditing={() => telefoneRef.current?.focus()}
          />

          <TextInput
            ref={telefoneRef}
            style={styles.input}
            placeholder="Telefone (opcional)"
            keyboardType="numeric"
            value={telefone}
            onChangeText={(t) => setTelefone(formatTelefone(t))}
            returnKeyType="done"
            onSubmitEditing={handleUpdate}
          />

          <View style={styles.buttonContainer}>
            <CustomButton
              title="Salvar Alterações"
              icon="save"
              color={colors.success}
              onPress={handleUpdate}
            />
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
    color: colors.textDark,
  },

  input: {
    width: '90%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: colors.textDark,
  },

  buttonContainer: {
    width: '90%',
    marginTop: 20,
  },
});

export default EditarMenor;