import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring
} from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from "../../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import colors from "../../constants/colors";
import { registrarPushTokenUsuario } from "../../utils/pushTokenUtils";
import PrimaryButton from "../../components/PrimaryButton";
import DesktopWrapper from '../../components/DesktopWrapper';
import { validarCPF, validarEmail, validarTelefone, verificarDadosDuplicados } from "../../utils/validators";

import logo from '../../../assets/logo.png';

export default function SignUpCliente({ navigation, route }) {
  const { width: screenWidth } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && screenWidth > 800;

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');

  const [pais, setPais] = useState('Brasil');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cep, setCep] = useState('');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [loading, setLoading] = useState(false);

  // Monitora se voltou da tela de Termos com aceite
  useEffect(() => {
    if (route.params?.termosAceitos) {
      setAceitaTermos(true);
    }
  }, [route.params?.termosAceitos]);

  const telefoneRef = useRef(null);
  const cpfRef = useRef(null);
  const cidadeRef = useRef(null);
  const cepRef = useRef(null);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarSenhaRef = useRef(null);

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

  const paises = [
    "Brasil", "Portugal", "Argentina", "Chile", "Uruguai", "Paraguai",
    "Bolívia", "Peru", "Colômbia", "Venezuela", "Equador", "México",
    "Estados Unidos", "Canadá", "Espanha", "França", "Alemanha",
    "Itália", "Reino Unido", "Irlanda", "Suíça", "Bélgica",
    "Holanda", "Luxemburgo", "Austrália", "Japão",
  ];

  const estadosBrasil = [
    { label: "Selecione o Estado", value: "" },
    { label: "Acre", value: "AC" }, { label: "Alagoas", value: "AL" },
    { label: "Amapá", value: "AP" }, { label: "Amazonas", value: "AM" },
    { label: "Bahia", value: "BA" }, { label: "Ceará", value: "CE" },
    { label: "Distrito Federal", value: "DF" }, { label: "Espírito Santo", value: "ES" },
    { label: "Goiás", value: "GO" }, { label: "Maranhão", value: "MA" },
    { label: "Mato Grosso", value: "MT" }, { label: "Mato Grosso do Sul", value: "MS" },
    { label: "Minas Gerais", value: "MG" }, { label: "Pará", value: "PA" },
    { label: "Paraíba", value: "PB" }, { label: "Paraná", value: "PR" },
    { label: "Pernambuco", value: "PE" }, { label: "Piauí", value: "PI" },
    { label: "Rio de Janeiro", value: "RJ" }, { label: "Rio Grande do Norte", value: "RN" },
    { label: "Rio Grande do Sul", value: "RS" }, { label: "Rondônia", value: "RO" },
    { label: "Roraima", value: "RR" }, { label: "Santa Catarina", value: "SC" },
    { label: "São Paulo", value: "SP" }, { label: "Sergipe", value: "SE" },
    { label: "Tocantins", value: "TO" },
  ];

  const estadosGenericos = [
    { label: "Selecione a Região / Estado", value: "" },
    { label: "Não informado", value: "N/I" },
  ];

  const estadosParaMostrar = useMemo(() => {
    if (pais === 'Brasil') return estadosBrasil;
    return estadosGenericos;
  }, [pais]);

  const validarCampos = () => {
    if (!aceitaTermos) {
      Alert.alert("Termos de Uso", "Você precisa aceitar os termos para criar sua conta.");
      return false;
    }
    if (!nome.trim()) {
      Alert.alert("Atenção", "Informe seu nome completo.");
      return false;
    }
    if (!telefone.trim()) {
      Alert.alert("Atenção", "Informe seu telefone ou WhatsApp.");
      return false;
    }
    if (!validarTelefone(telefone)) {
      Alert.alert("Telefone Inválido", "Informe um telefone válido com DDD e 9 dígitos.");
      return false;
    }
    if (cpf.trim() && !validarCPF(cpf)) {
      Alert.alert("CPF Inválido", "O CPF informado é inválido. Verifique os números digitados.");
      return false;
    }
    if (!pais.trim()) {
      Alert.alert("Atenção", "Informe o país.");
      return false;
    }
    if (!estado) {
      Alert.alert("Atenção", "Selecione o estado ou região.");
      return false;
    }
    if (!cidade.trim()) {
      Alert.alert("Atenção", "Informe a cidade.");
      return false;
    }
    if (!cep.trim()) {
      Alert.alert("Atenção", "Informe o CEP.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Atenção", "Informe o e-mail.");
      return false;
    }
    if (!validarEmail(email)) {
      Alert.alert("E-mail Inválido", "O formato do e-mail é inválido.");
      return false;
    }
    if (!senha.trim()) {
      Alert.alert("Atenção", "Informe a senha.");
      return false;
    }
    if (senha.trim().length < 6) {
      Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      return false;
    }
    if (!confirmarSenha.trim()) {
      Alert.alert("Atenção", "Confirme a senha.");
      return false;
    }
    if (senha !== confirmarSenha) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return false;
    }
    return true;
  };

  const handleCadastro = async () => {
    Keyboard.dismiss();

    if (!validarCampos()) return;
    setLoading(true);

    try {
      const duplicidade = await verificarDadosDuplicados(cpf.trim(), telefone.trim());
      if (duplicidade.existe) {
        setLoading(false);
        Alert.alert(
          "Dados já em uso",
          `O ${duplicidade.tipo === 'documento' ? 'CPF' : 'Telefone/WhatsApp'} informado já está vinculado a outra conta.`
        );
        return;
      }

      const userCert = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      // 2. Grava o perfil com Transação para Gerar ID Sequencial
      const userRef = doc(db, "usuarios", userCert.user.uid);
      const counterRef = doc(db, 'config', 'contadores');

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 1;
        
        if (counterDoc.exists()) {
          currentCount = (counterDoc.data().usuarios || 0) + 1;
        }

        const codigoConecta = `CS-BR-${String(currentCount).padStart(6, '0')}`;
        
        transaction.set(counterRef, { usuarios: currentCount }, { merge: true });
        transaction.set(userRef, {
          uid: userCert.user.uid,
          nome: nome.trim(),
          nomeCompleto: nome.trim(),
          telefone: telefone.trim(),
          whatsapp: telefone.trim(),
          cpf: cpf.trim(),
          localizacao: {
            pais: pais.trim(),
            estado,
            cidade: cidade.trim(),
            cep: cep.trim(),
          },
          email: email.trim().toLowerCase(),
          tipo: 'cliente',
          perfil: 'cliente',
          codigoConecta: codigoConecta, // ID OFICIAL GERADO
          pushToken: '',
          fotoPerfil: '',
          dataCriacao: serverTimestamp(),
        });
      });

      await registrarPushTokenUsuario(userCert.user.uid);

      Alert.alert("Bem-vindo!", "Conta de cliente criada com sucesso.");
      // Não navegar manualmente.
      // O App.js já redireciona automaticamente.
    } catch (e) {
      console.log("Erro ao cadastrar cliente:", e);

      let mensagem = "Erro ao cadastrar.";

      if (e.code === 'auth/email-already-in-use') {
        mensagem = "Este e-mail já está cadastrado.";
      } else if (e.code === 'auth/invalid-email') {
        mensagem = "O e-mail informado é inválido.";
      } else if (e.code === 'auth/weak-password') {
        mensagem = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (e.message) {
        mensagem = e.message;
      }

      Alert.alert("Erro ao cadastrar", mensagem);
    } finally {
      setLoading(false);
    }
  };

  const renderSignUpForm = (isSplit = false) => (
    <View style={[styles.card, isSplit && styles.cardSplit]}>
      <View style={styles.cardHeader}>
        <Image source={logo} style={styles.cardLogo} />
        <Text style={styles.cardBrandName}>Coneta Solutions</Text>
      </View>

      <Text style={styles.sectionTitle}>Crie sua conta de Cliente</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Nome Completo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: João da Silva"
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
          returnKeyType="next"
          onSubmitEditing={() => telefoneRef.current?.focus()}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInputLeft}>
          <Text style={styles.label}>WhatsApp / Celular *</Text>
          <TextInput
            ref={telefoneRef}
            style={styles.input}
            placeholder="(11) 99999-9999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={telefone}
            onChangeText={setTelefone}
            returnKeyType="next"
            onSubmitEditing={() => cpfRef.current?.focus()}
          />
        </View>

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>CPF *</Text>
          <TextInput
            ref={cpfRef}
            style={styles.input}
            placeholder="000.000.000-00"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={cpf}
            onChangeText={setCpf}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        </View>
      </View>

      <View style={styles.formDivider} />
      <Text style={styles.subSectionTitle}>Localização</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>País *</Text>
        <View style={styles.pickerOuter}>
          <Picker
            selectedValue={pais}
            onValueChange={(v) => {
              setPais(v);
              setEstado('');
            }}
            style={styles.picker}
            dropdownIconColor={colors.textDark}
          >
            {paises.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInputLeft}>
          <Text style={styles.label}>Estado *</Text>
          <View style={styles.pickerOuter}>
            <Picker
              selectedValue={estado}
              onValueChange={(v) => setEstado(v)}
              style={styles.picker}
              dropdownIconColor={colors.textDark}
            >
              {estadosParaMostrar.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>Cidade *</Text>
          <TextInput
            ref={cidadeRef}
            style={styles.input}
            placeholder="Sua cidade"
            placeholderTextColor="#999"
            value={cidade}
            onChangeText={setCidade}
            returnKeyType="next"
            onSubmitEditing={() => cepRef.current?.focus()}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>CEP *</Text>
        <TextInput
          ref={cepRef}
          style={styles.input}
          placeholder="00000-000"
          placeholderTextColor="#999"
          keyboardType="numeric"
          value={cep}
          onChangeText={setCep}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      </View>

      <View style={styles.formDivider} />
      <Text style={styles.subSectionTitle}>Dados de Acesso</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>E-mail *</Text>
        <TextInput
          ref={emailRef}
          style={styles.input}
          placeholder="seu@email.com"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
          onSubmitEditing={() => senhaRef.current?.focus()}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInputLeft}>
          <Text style={styles.label}>Senha *</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              ref={senhaRef}
              style={styles.passwordInput}
              placeholder="6+ dígitos"
              placeholderTextColor="#999"
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              autoCorrect={false}
              value={senha}
              onChangeText={setSenha}
              returnKeyType="next"
              onSubmitEditing={() => confirmarSenhaRef.current?.focus()}
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

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>Confirmar Senha *</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              ref={confirmarSenhaRef}
              style={styles.passwordInput}
              placeholder="Repita a senha"
              placeholderTextColor="#999"
              secureTextEntry={!mostrarConfirmarSenha}
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              returnKeyType="done"
              onSubmitEditing={handleCadastro}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setMostrarConfirmarSenha((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mostrarConfirmarSenha ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.termsContainer}>
        <Switch
          value={aceitaTermos}
          onValueChange={setAceitaTermos}
          trackColor={{ false: "#CCC", true: colors.primary }}
          thumbColor="#FFF"
        />
        <TouchableOpacity
          onPress={() => navigation.navigate("TermosUso")}
          style={styles.termsTextBox}
        >
          <Text style={styles.termsText}>
            Li e aceito os <Text style={styles.link}>Termos de Uso</Text> *
          </Text>
        </TouchableOpacity>
      </View>

      <PrimaryButton
        title="CRIAR MINHA CONTA"
        onPress={handleCadastro}
        loading={loading}
      />

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginLinkText}>
          Já tem uma conta? <Text style={styles.loginLinkHighlight}>Fazer login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWebSplitLayout = () => (
    <View style={styles.splitWrapper}>
      <View style={styles.brandingSection}>
        <View style={styles.brandingContent}>
          <Animated.Text
            entering={FadeInLeft.delay(200).duration(800)}
            style={styles.brandingTitle}
          >
            Sua jornada no <Text style={styles.highlightText}>Coneta Solutions</Text> começa aqui.
          </Animated.Text>
          <Animated.Text
            entering={FadeInLeft.delay(400).duration(800)}
            style={styles.brandingSubtitle}
          >
            Cadastre-se como cliente para agendar horários, favoritar profissionais e receber lembretes automáticos.
          </Animated.Text>

          <View style={styles.featuresList}>
            <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E8F0FE' }]}>
                <Ionicons name="search" size={20} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Busque por categoria ou local</Text>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E6F4EA' }]}>
                <Ionicons name="time" size={20} color="#34A853" />
              </View>
              <Text style={styles.featureText}>Agende em segundos</Text>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#FEF7E0' }]}>
                <Ionicons name="heart" size={20} color="#FBBC04" />
              </View>
              <Text style={styles.featureText}>Salve seus favoritos</Text>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={[styles.floatingCircle, animatedStyle0, { top: '15%', left: '10%', width: 60, height: 60, opacity: 0.1 }]} />
        <Animated.View style={[styles.floatingCircle, animatedStyle20, { bottom: '20%', right: '15%', width: 100, height: 100, opacity: 0.05 }]} />
        <Animated.View style={[styles.floatingCircle, animatedStyleM10, { top: '40%', right: '10%', width: 40, height: 40, opacity: 0.1, backgroundColor: colors.warning }]} />
      </View>

      <View style={styles.formSection}>
        <Animated.View
          entering={FadeInRight.delay(200).duration(800)}
          style={styles.formContainer}
        >
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 40 }}
          >
            {renderSignUpForm(true)}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );

  const renderMobileLayout = () => (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.mobileHeaderArea}>
        <Text style={styles.mobileSubtitle}>
          Crie sua conta para começar a agendar serviços com facilidade.
        </Text>
      </View>
      {renderSignUpForm()}
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
  flex: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: '#F0F3F8',
  },

  container: {
    flex: 1,
    backgroundColor: '#F0F3F8',
  },

  scrollContent: {
    padding: 24,
    paddingBottom: 150,
  },

  mobileHeaderArea: {
    alignItems: 'center',
    marginBottom: 24,
  },

  mobileSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.secondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Layout Web Split
  splitWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },

  brandingSection: {
    flex: 1,
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
    maxWidth: 500,
    alignSelf: 'center',
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
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
  },

  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },

  cardLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 8,
  },

  cardBrandName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 18,
    textAlign: 'center',
  },

  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 12,
  },

  formDivider: {
    height: 1,
    backgroundColor: '#EEF1F4',
    marginVertical: 20,
  },

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C6470',
    marginBottom: 5,
  },

  input: {
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#333',
  },

  pickerOuter: {
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  picker: {
    height: Platform.OS === 'ios' ? 180 : 56,
    width: '100%',
    color: '#222',
    backgroundColor: '#F8FAFD',
  },

  pickerItem: {
    color: '#222',
    fontSize: 16,
  },

  row: {
    flexDirection: 'row',
  },

  halfInputLeft: {
    flex: 1,
    marginRight: 10,
  },

  halfInputRight: {
    flex: 1,
  },

  passwordWrapper: {
    minHeight: 50,
    backgroundColor: '#F8FAFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 6,
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

  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  termsTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  termsText: {
    fontSize: 14,
    color: '#5C6470',
    lineHeight: 20,
  },

  link: {
    color: colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});