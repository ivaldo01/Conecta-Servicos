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
  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

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

  const MainContent = (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={isLargeScreen ? styles.webContainer : null}>
        <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
          <View style={styles.headerCircle} />
          <View style={styles.headerCircleTwo} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Editar Dependente</Text>
            <Text style={styles.subtitle}>
              Atualize as informações do seu dependente.
            </Text>
          </View>
        </View>

        <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
          <View style={isLargeScreen ? styles.formGrid : null}>
            <View style={isLargeScreen ? styles.formCol : null}>
              <Text style={styles.inputLabel}>NOME COMPLETO</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: João da Silva"
                value={nome}
                onChangeText={setNome}
                returnKeyType="next"
                onSubmitEditing={() => idadeRef.current?.focus()}
              />

              <Text style={styles.inputLabel}>IDADE</Text>
              <TextInput
                ref={idadeRef}
                style={styles.input}
                placeholder="Ex: 12"
                value={idade}
                onChangeText={setIdade}
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => cpfRef.current?.focus()}
              />
            </View>

            <View style={isLargeScreen ? styles.formCol : null}>
              <Text style={styles.inputLabel}>CPF (OPCIONAL)</Text>
              <TextInput
                ref={cpfRef}
                style={styles.input}
                placeholder="000.000.000-00"
                value={cpf}
                onChangeText={(text) => setCpf(formatCPF(text))}
                keyboardType="numeric"
                returnKeyType="next"
                onSubmitEditing={() => telefoneRef.current?.focus()}
              />

              <Text style={styles.inputLabel}>TELEFONE (OPCIONAL)</Text>
              <TextInput
                ref={telefoneRef}
                style={styles.input}
                placeholder="(00) 00000-0000"
                value={telefone}
                onChangeText={(text) => setTelefone(formatTelefone(text))}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleUpdate}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isLargeScreen && styles.saveButtonLarge]}
            onPress={handleUpdate}
            activeOpacity={0.9}
          >
            <Ionicons name="save-outline" size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.screenContainer}>
      {isLargeScreen ? (
        <View style={styles.webLayout}>
          <Sidebar navigation={navigation} activeRoute="Perfil" />
          <View style={styles.webContentArea}>
            {MainContent}
          </View>
        </View>
      ) : (
        <SafeAreaView style={styles.container} edges={['top']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              {MainContent}
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    overflow: 'hidden',
  },
  webContentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: '100%',
    display: 'flex',
    overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100%' : 'auto',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentLarge: {
    padding: 40,
    paddingTop: 48,
  },
  webContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerLarge: {
    paddingTop: 32,
    paddingBottom: 32,
    borderRadius: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  headerCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -34,
    right: -18,
  },
  headerCircleTwo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -18,
    left: -10,
  },
  headerContent: {
    flex: 1,
    zIndex: 2,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLarge: {
    padding: 32,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  formCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E293B',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  saveButtonLarge: {
    maxWidth: 300,
    alignSelf: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default EditarMenor;