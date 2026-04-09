import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebaseConfig';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import colors from '../../constants/colors';
import Sidebar from '../../components/Sidebar';

export default function CadastroMenor({ navigation }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && width > 768;

  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [loading, setLoading] = useState(false);

  const formatarData = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setDataNascimento(formatted);
  };

  const handleSalvar = async () => {
    if (!nome || !dataNascimento || !parentesco) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (dataNascimento.length !== 10) {
      Alert.alert('Erro', 'Data de nascimento inválida.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      await addDoc(collection(db, 'usuarios', user.uid, 'dependentes'), {
        nome,
        dataNascimento,
        parentesco,
        criadoEm: serverTimestamp(),
      });

      Alert.alert('Sucesso', 'Dependente cadastrado com sucesso!');
      navigation.goBack();
    } catch (error) {
      console.log('Erro ao cadastrar dependente:', error);
      Alert.alert('Erro', 'Não foi possível salvar o dependente.');
    } finally {
      setLoading(false);
    }
  };

  const MainContent = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
    >
      <View style={isLargeScreen ? styles.webContainer : null}>
        <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
          {!isLargeScreen && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={styles.titleArea}>
            <Text style={[styles.title, isLargeScreen && styles.titleLarge]}>Novo Dependente</Text>
            <Text style={[styles.subtitle, isLargeScreen && styles.subtitleLarge]}>Cadastre um menor para agendamentos</Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nome do dependente"
                value={nome}
                onChangeText={setNome}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Nascimento</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={dataNascimento}
                onChangeText={formatarData}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Parentesco</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="people-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Filho, Sobrinho, etc."
                value={parentesco}
                onChangeText={setParentesco}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Salvar Dependente</Text>
              </>
            )}
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
        <SafeAreaView style={{ flex: 1 }}>
          {MainContent}
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  titleLarge: {
    color: '#1E293B',
    fontSize: 32,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  subtitleLarge: {
    color: '#64748B',
    fontSize: 16,
  },
  form: {
    marginTop: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    marginTop: 12,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
