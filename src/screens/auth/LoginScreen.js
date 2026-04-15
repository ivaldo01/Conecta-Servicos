import React, { useRef, useState, useEffect } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  Layout,
  withSpring,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, deleteUser, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import DesktopWrapper from '../../components/DesktopWrapper';
import { getEmailFromCid } from '../../utils/idUtils';


import logo from '../../../assets/logo.png';

export default function LoginScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && screenWidth > 800;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const senhaInputRef = useRef(null);

  const handleRecuperarSenha = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Informe seu e-mail no campo acima para recuperar a senha.');
      return;
    }
    
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert('E-mail enviado', 'Verifique sua caixa de entrada (e spam) para criar uma nova senha.');
    } catch (error) {
      console.log('Erro ao recuperar senha:', error);
      let mensagem = 'Não foi possível enviar o e-mail de recuperação.';
      if (error.code === 'auth/user-not-found') {
         mensagem = 'Usuário não cadastrado com esse e-mail.';
      } else if (error.code === 'auth/invalid-email') {
         mensagem = 'O e-mail informado é inválido.';
      }
      Alert.alert('Erro', mensagem);
    } finally {
      setLoading(false);
    }
  };

  // Animação para os círculos flutuantes
  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle0 = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(floatValue.value * 20) }]
  }));

  const animatedStyle20 = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(floatValue.value * 20 + 20) }]
  }));

  const animatedStyleM10 = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(floatValue.value * 20 - 10) }]
  }));

  const handleLogin = async () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }

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

      let loginEmail = email.trim().toLowerCase();

      // Implementação do Login Híbrido (CID ou Email)
      if (loginEmail.startsWith('cs')) {
        const foundEmail = await getEmailFromCid(loginEmail);
        if (!foundEmail) {
          throw new Error('ConectaID não encontrado ou inválido.');
        }
        loginEmail = foundEmail;
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginEmail,
        senha
      );


      const user = userCredential.user;

      // Verifica se a conta está marcada para exclusão
      const perfilRef = doc(db, "usuarios", user.uid);
      const perfilDoc = await getDoc(perfilRef);

      if (perfilDoc.exists()) {
        const perfilData = perfilDoc.data();

        if (perfilData.excluirEm) {
          const dataExclusao = perfilData.excluirEm.toDate();
          const agora = new Date();

          if (dataExclusao > agora) {
            // Conta ainda está no período de recuperação
            const diasRestantes = Math.ceil((dataExclusao - agora) / (1000 * 60 * 60 * 24));

            Alert.alert(
              "Conta Marcada para Exclusão",
              `Sua conta está marcada para exclusão em ${diasRestantes} dias (${dataExclusao.toLocaleDateString('pt-BR')}).\n\nVocê pode recuperar sua conta agora ou confirmar a exclusão.`,
              [
                {
                  text: "Recuperar Conta",
                  onPress: async () => {
                    try {
                      // Remove os campos de exclusão
                      await updateDoc(perfilRef, {
                        excluirEm: deleteField(),
                        ativo: true,
                        dataDesativacao: deleteField(),
                        motivoExclusao: deleteField(),
                        dataRecuperacao: new Date(),
                      });
                      Alert.alert("Sucesso", "Sua conta foi recuperada com sucesso!");
                      // Navegação automática será feita pelo App.js
                    } catch (error) {
                      console.log("Erro ao recuperar conta:", error);
                      Alert.alert("Erro", "Não foi possível recuperar a conta. Tente novamente.");
                      await auth.signOut();
                    }
                  }
                },
                {
                  text: "Confirmar Exclusão",
                  style: "destructive",
                  onPress: async () => {
                    await auth.signOut();
                    Alert.alert(
                      "Exclusão Confirmada",
                      `Sua conta será permanentemente excluída em ${dataExclusao.toLocaleDateString('pt-BR')}.\n\nDurante esse período você não poderá acessar o aplicativo.`
                    );
                  }
                }
              ]
            );
            return; // Impede navegação automática
          } else {
            // Período de 30 dias expirou - deleta a conta permanentemente
            try {
              // Deleta documento do Firestore
              await deleteDoc(perfilRef);

              // Deleta usuário do Auth
              await deleteUser(user);

              Alert.alert(
                "Conta Excluída Permanentemente",
                "O período de recuperação expirou e sua conta foi permanentemente excluída."
              );
            } catch (deleteError) {
              console.log("Erro ao deletar conta expirada:", deleteError);
              await auth.signOut();
              Alert.alert(
                "Conta Excluída",
                "O período de recuperação expirou. Sua conta foi desativada."
              );
            }
            return;
          }
        }
      }

      // Se não estiver marcada para exclusão, deixa o App.js redirecionar normalmente

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

      if (Platform.OS === 'web') {
        alert('Erro ao entrar: ' + mensagem);
      } else {
        Alert.alert('Erro ao entrar', mensagem);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = (isSplit = false) => (
    <View style={[styles.card, isSplit && styles.cardSplit]}>
      <View style={styles.cardHeader}>
        <Image source={logo} style={styles.cardLogo} />
        <Text style={styles.cardBrandName}>Conecta Solutions</Text>
      </View>

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
        <View style={styles.inputHint}>
          <Ionicons name="information-circle-outline" size={12} color={colors.secondary} />
          <Text style={styles.inputHintText}>Use seu e-mail ou seu ConectaID (CID)</Text>
        </View>
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
        <TouchableOpacity 
          style={styles.forgotPasswordButton} 
          onPress={handleRecuperarSenha}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
        </TouchableOpacity>
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
  );

  const renderWebSplitLayout = () => (
    <View style={styles.splitWrapper}>
      {/* Lado Esquerdo - Branding */}
      <View style={styles.brandingSection}>
        <View style={styles.brandingContent}>
          <Animated.Text
            entering={FadeInLeft.delay(200).duration(800)}
            style={styles.brandingTitle}
          >
            Encontre e reserve os melhores <Text style={styles.highlightText}>serviços</Text> da sua região.
          </Animated.Text>
          <Animated.Text
            entering={FadeInLeft.delay(400).duration(800)}
            style={styles.brandingSubtitle}
          >
            Tudo o que você precisa em um só lugar. De barbearias a consultórios, agende com facilidade e rapidez.
          </Animated.Text>

          <View style={styles.featuresList}>
            <Animated.View
              entering={FadeInUp.delay(600).duration(600)}
              style={styles.featureItem}
            >
              <View style={[styles.featureIcon, { backgroundColor: '#E8F0FE' }]}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Agendamento online 24h</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(800).duration(600)}
              style={styles.featureItem}
            >
              <View style={[styles.featureIcon, { backgroundColor: '#E6F4EA' }]}>
                <Ionicons name="notifications" size={20} color="#34A853" />
              </View>
              <Text style={styles.featureText}>Lembretes automáticos</Text>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(1000).duration(600)}
              style={styles.featureItem}
            >
              <View style={[styles.featureIcon, { backgroundColor: '#FEF7E0' }]}>
                <Ionicons name="star" size={20} color="#FBBC04" />
              </View>
              <Text style={styles.featureText}>Avaliações reais</Text>
            </Animated.View>
          </View>
        </View>

        {/* Elementos Decorativos Flutuantes com Animação */}
        <Animated.View style={[styles.floatingCircle, animatedStyle0, { top: '15%', left: '10%', width: 60, height: 60, opacity: 0.1 }]} />
        <Animated.View style={[styles.floatingCircle, animatedStyle20, { bottom: '20%', right: '15%', width: 100, height: 100, opacity: 0.05 }]} />
        <Animated.View style={[styles.floatingCircle, animatedStyleM10, { top: '40%', right: '10%', width: 40, height: 40, opacity: 0.1, backgroundColor: colors.warning }]} />
      </View>

      {/* Lado Direito - Formulário */}
      <View style={styles.formSection}>
        <Animated.View
          entering={FadeInRight.delay(200).duration(800)}
          style={styles.formContainer}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40 }}
          >
            {renderLoginForm(true)}
            <View style={styles.footerWeb}>
              <Text style={styles.footerWebText}>© 2024 Coneta Solutions</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );

  const renderMobileLayout = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.mobileHeaderArea}>
        <Text style={styles.subtitle}>
          A melhor plataforma para contratar e gerenciar seus serviços
        </Text>
      </View>
      {renderLoginForm()}
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 40}
      >
        {isWebLarge ? (
          renderWebSplitLayout()
        ) : (
          <DesktopWrapper style={styles.flex}>
            {Platform.OS === 'web' ? (
              renderMobileLayout()
            ) : (
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                {renderMobileLayout()}
              </TouchableWithoutFeedback>
            )}
          </DesktopWrapper>
        )}
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
    backgroundColor: '#F0F2F5', // Cinza Facebook
  },

  // Layout Mobile
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    paddingBottom: 80,
  },

  mobileHeaderArea: {
    alignItems: 'center',
    marginBottom: 24,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.secondary,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  // Layout Web Split
  splitWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },

  brandingSection: {
    flex: 1.2,
    backgroundColor: '#FFF',
    paddingHorizontal: '8%',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    paddingTop: '10%', // Sobe o conteúdo
  },

  brandingContent: {
    maxWidth: 600,
    zIndex: 2,
  },

  brandingTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.textDark,
    lineHeight: 56,
    marginBottom: 24,
    letterSpacing: -1,
  },

  highlightText: {
    color: colors.primary,
  },

  brandingSubtitle: {
    fontSize: 20,
    color: colors.secondary,
    lineHeight: 30,
    marginBottom: 40,
  },

  featuresList: {
    gap: 16,
  },

  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
  },

  floatingCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  formSection: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    padding: 24,
    height: Platform.OS === 'web' ? '100vh' : '100%',
    overflow: 'hidden',
  },

  formContainer: {
    width: '100%',
    maxWidth: 400,
    flex: 1,
  },

  // Card de Login
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8, // Facebook style is less rounded
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#dddfe2',
  },

  cardSplit: {
    padding: 24,
    borderRadius: 12,
  },

  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },

  cardLogo: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 10,
  },

  cardBrandName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 18,
    textAlign: 'center',
  },

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dddfe2',
    color: '#1c1e21',
  },

  passwordWrapper: {
    height: 52,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dddfe2',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },

  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1c1e21',
    paddingVertical: 12,
  },

  eyeButton: {
    padding: 8,
  },

  loginButton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 6,
  },

  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
  },

  forgotPasswordText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  loginButtonDisabled: {
    opacity: 0.75,
  },

  loginButtonIcon: {
    marginRight: 8,
  },

  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  chooseProfileButton: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dddfe2',
    alignItems: 'center',
  },

  chooseProfileText: {
    fontSize: 14,
    color: colors.textDark,
  },

  chooseProfileLink: {
    color: colors.primary,
    fontWeight: '700',
  },

  termsButton: {
    marginTop: 14,
    alignItems: 'center',
  },

  termsText: {
    fontSize: 13,
    color: colors.secondary,
  },

  footerWeb: {
    marginTop: 24,
    alignItems: 'center',
  },

  footerWebText: {
    fontSize: 12,
    color: colors.secondary,
  },

  inputHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },

  inputHintText: {
    fontSize: 10,
    color: colors.secondary,
  },
});

