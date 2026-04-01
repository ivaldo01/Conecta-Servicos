import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebaseConfig';
import colors from '../../constants/colors';

import logo from '../../../assets/logo.png';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const senhaInputRef = useRef(null);

  const handleLogin = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail.');
      return;
    }

    if (!senha.trim()) {
      Alert.alert('Atenção', 'Informe sua senha.');
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      // Não navegar manualmente.
      // O App.js já redireciona automaticamente pelo onAuthStateChanged.
    } catch (error) {
      console.log('Erro no login:', error);

      let mensagem = 'Não foi possível entrar.';

      if (error.code === 'auth/invalid-email') {
        mensagem = 'O e-mail informado é inválido.';
      } else if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        mensagem = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/too-many-requests') {
        mensagem = 'Muitas tentativas. Tente novamente mais tarde.';
      } else if (error.message) {
        mensagem = error.message;
      }

      Alert.alert('Erro ao entrar', mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoArea}>
              <Image source={logo} style={styles.logoImage} />
              <Text style={styles.subtitle}>
                Entre na sua conta para contratar ou gerenciar serviços com facilidade
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Entrar</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-mail</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={() => senhaInputRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    ref={senhaInputRef}
                    style={styles.passwordInput}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#999"
                    secureTextEntry={!mostrarSenha}
                    autoCorrect={false}
                    textContentType="password"
                    returnKeyType="done"
                    value={senha}
                    onChangeText={setSenha}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setMostrarSenha((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={mostrarSenha ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.88}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="log-in-outline"
                      size={18}
                      color="#FFF"
                      style={styles.loginButtonIcon}
                    />
                    <Text style={styles.loginButtonText}>Entrar</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chooseProfileButton}
                onPress={() => navigation.navigate('ChooseProfile')}
                activeOpacity={0.85}
              >
                <Text style={styles.chooseProfileText}>
                  Ainda não tem conta? <Text style={styles.chooseProfileLink}>Criar agora</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.termsButton}
                onPress={() => navigation.navigate('TermosUso')}
                activeOpacity={0.85}
              >
                <Text style={styles.termsText}>Termos de Uso</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  screen: {
    flex: 1,
    backgroundColor: '#F0F3F8',
  },

  content: {
    flexGrow: 1,
    padding: 18,
    justifyContent: 'center',
    paddingBottom: 32,
  },

  logoArea: {
    alignItems: 'center',
    marginBottom: 18,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  logoImage: {
    width: 118,
    height: 118,
    resizeMode: 'contain',
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.86)',
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 18,
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C6470',
    marginBottom: 6,
  },

  input: {
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#333',
  },

  passwordWrapper: {
    minHeight: 52,
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
  },

  eyeButton: {
    padding: 8,
  },

  loginButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  loginButtonDisabled: {
    opacity: 0.75,
  },

  loginButtonIcon: {
    marginRight: 8,
  },

  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  chooseProfileButton: {
    marginTop: 18,
    alignItems: 'center',
  },

  chooseProfileText: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
  },

  chooseProfileLink: {
    color: colors.primary,
    fontWeight: '800',
  },

  termsButton: {
    marginTop: 14,
    alignItems: 'center',
  },

  termsText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
});
