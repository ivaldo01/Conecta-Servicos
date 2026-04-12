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
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import colors from "../../constants/colors";
import PrimaryButton from "../../components/PrimaryButton";
import { prepararDadosCategoriaParaProfissional } from "../../utils/categoriaUtils";
import { registrarPushTokenUsuario } from "../../utils/pushTokenUtils";
import DesktopWrapper from '../../components/DesktopWrapper';
import { validarCPF, validarCNPJ, validarEmail, validarTelefone, verificarDadosDuplicados } from "../../utils/validators";

import logo from '../../../assets/logo.png';

export default function SignUpProEmpresa({ navigation, route }) {
  const { width: screenWidth } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && screenWidth > 800;
  const [tipoCadastro, setTipoCadastro] = useState('autonomo');

  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [bio, setBio] = useState('');

  const [pais, setPais] = useState('Brasil');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');

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

  const nomeNegocioRef = useRef(null);
  const telefoneRef = useRef(null);
  const cpfCnpjRef = useRef(null);
  const especialidadeRef = useRef(null);
  const bioRef = useRef(null);
  const cidadeRef = useRef(null);
  const cepRef = useRef(null);
  const enderecoRef = useRef(null);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const confirmarSenhaRef = useRef(null);

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

  const tituloDocumento = tipoCadastro === 'empresa' ? 'CNPJ' : 'CPF';
  const placeholderDocumento =
    tipoCadastro === 'empresa' ? '00.000.000/0000-00' : '000.000.000-00';

  const tituloPrincipal =
    tipoCadastro === 'empresa'
      ? 'Criar Conta Profissional'
      : 'Criar Perfil Profissional';

  const subtituloPrincipal =
    tipoCadastro === 'empresa'
      ? 'Cadastre sua empresa para oferecer serviços no Coneta Solutions'
      : 'Cadastre seu perfil para atender clientes no Coneta Solutions';

  const validarCampos = () => {
    if (!aceitaTermos) {
      Alert.alert("Termos de Uso", "Você precisa aceitar os termos para criar sua conta.");
      return false;
    }
    if (!nomeCompleto.trim()) {
      Alert.alert(
        "Atenção",
        tipoCadastro === 'empresa'
          ? "Informe o nome do responsável."
          : "Informe seu nome completo."
      );
      return false;
    }
    if (tipoCadastro === 'empresa' && !nomeNegocio.trim()) {
      Alert.alert("Atenção", "Informe o nome da empresa ou negócio.");
      return false;
    }
    if (!telefone.trim()) {
      Alert.alert("Atenção", "Informe o telefone ou WhatsApp.");
      return false;
    }
    if (!validarTelefone(telefone)) {
      Alert.alert("Telefone Inválido", "Informe um telefone válido com DDD e 9 dígitos.");
      return false;
    }
    if (!cpfCnpj.trim()) {
      Alert.alert(
        "Atenção",
        tipoCadastro === 'empresa'
          ? "Informe o CNPJ."
          : "Informe o CPF."
      );
      return false;
    }
    if (tipoCadastro === 'empresa') {
      if (!validarCNPJ(cpfCnpj)) {
        Alert.alert("CNPJ Inválido", "O CNPJ informado é inválido. Verifique os números digitados.");
        return false;
      }
    } else {
      if (!validarCPF(cpfCnpj)) {
        Alert.alert("CPF Inválido", "O CPF informado é inválido. Verifique os números digitados.");
        return false;
      }
    }
    if (!especialidade.trim()) {
      Alert.alert("Atenção", "Informe a especialidade principal.");
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
    if (!endereco.trim()) {
      Alert.alert("Atenção", "Informe o endereço.");
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
      const duplicidade = await verificarDadosDuplicados(cpfCnpj.trim(), telefone.trim());
      if (duplicidade.existe) {
        setLoading(false);
        Alert.alert(
          "Dados já em uso",
          `O ${duplicidade.tipo === 'documento' ? (tipoCadastro === 'empresa' ? 'CNPJ' : 'CPF') : 'Telefone/WhatsApp'} informado já está vinculado a outra conta.`
        );
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      const user = userCredential.user;
      let dadosCategoria = {
        especialidade: especialidade.trim(),
        categoriaId: 'default',
        categoriaSlug: 'default',
        categoriaIcone: 'briefcase-outline'
      };

      try {
        dadosCategoria = await prepararDadosCategoriaParaProfissional(especialidade);
      } catch (categoriaError) {
        console.log("Erro silencioso ao preparar a categoria (Ignorado):", categoriaError?.message || categoriaError);
      }

      const nomeExibicao =
        tipoCadastro === 'empresa' ? nomeNegocio.trim() : nomeCompleto.trim();

      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        tipo: 'profissional',
        perfil: 'profissional',
        tipoCadastroProfissional: tipoCadastro,

        nome: nomeExibicao,
        nomeCompleto: nomeCompleto.trim(),
        nomeNegocio: nomeNegocio.trim(),
        responsavel: nomeCompleto.trim(),

        telefone: telefone.trim(),
        whatsapp: telefone.trim(),
        cpfCnpj: cpfCnpj.trim(),

        email: email.trim().toLowerCase(),
        bio: bio.trim(),
        fotoPerfil: '',
        pushToken: '',

        endereco: endereco.trim(),
        localizacao: {
          pais: pais.trim(),
          estado,
          cidade: cidade.trim(),
          cep: cep.trim(),
        },

        avaliacaoMedia: 0,
        totalAvaliacoes: 0,
        verificado: false,
        criadoEm: serverTimestamp(),
        dataCriacao: serverTimestamp(),

        ...dadosCategoria,
      });

      await registrarPushTokenUsuario(user.uid);

      Alert.alert(
        "Bem-vindo!",
        tipoCadastro === 'empresa'
          ? "Conta profissional da empresa criada com sucesso."
          : "Conta profissional criada com sucesso."
      );
      // Não navegar manualmente.
      // O App.js já redireciona automaticamente.
    } catch (e) {
      console.log("Erro ao cadastrar profissional:", e);

      let mensagem = "Não foi possível finalizar o cadastro.";

      if (e.code === 'auth/email-already-in-use') {
        mensagem = "Este e-mail já está cadastrado.";
      } else if (e.code === 'auth/invalid-email') {
        mensagem = "O e-mail informado é inválido.";
      } else if (e.code === 'auth/weak-password') {
        mensagem = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (
        e.code === 'permission-denied' ||
        String(e.message || '').includes('Missing or insufficient permissions')
      ) {
        mensagem = "Sem permissão no Firestore. Publique as regras atualizadas antes de cadastrar.";
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

      <Text style={styles.sectionTitle}>{tituloPrincipal}</Text>

      <View style={styles.segmentWrapper}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            tipoCadastro === 'autonomo' && styles.segmentButtonActive,
          ]}
          onPress={() => setTipoCadastro('autonomo')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.segmentText,
              tipoCadastro === 'autonomo' && styles.segmentTextActive,
            ]}
          >
            Autônomo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentButton,
            tipoCadastro === 'empresa' && styles.segmentButtonActive,
          ]}
          onPress={() => setTipoCadastro('empresa')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.segmentText,
              tipoCadastro === 'empresa' && styles.segmentTextActive,
            ]}
          >
            Empresa
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipBox}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.tipText}>
          {tipoCadastro === 'empresa'
            ? 'Ideal para negócios com marca própria, equipe ou estabelecimento.'
            : 'Ideal para profissionais que trabalham por conta própria.'}
        </Text>
      </View>

      <View style={styles.formDivider} />

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {tipoCadastro === 'empresa' ? 'Nome do Responsável *' : 'Nome Completo *'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={
            tipoCadastro === 'empresa'
              ? 'Ex: João da Silva'
              : 'Ex: Maria Oliveira Santos'
          }
          placeholderTextColor="#999"
          value={nomeCompleto}
          onChangeText={setNomeCompleto}
          returnKeyType="next"
          onSubmitEditing={() => {
            if (tipoCadastro === 'empresa') {
              nomeNegocioRef.current?.focus();
            } else {
              telefoneRef.current?.focus();
            }
          }}
        />
      </View>

      {tipoCadastro === 'empresa' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da Empresa / Negócio *</Text>
          <TextInput
            ref={nomeNegocioRef}
            style={styles.input}
            placeholder="Ex: Tech Soluções Elétricas"
            placeholderTextColor="#999"
            value={nomeNegocio}
            onChangeText={setNomeNegocio}
            returnKeyType="next"
            onSubmitEditing={() => telefoneRef.current?.focus()}
          />
        </View>
      )}

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
            onSubmitEditing={() => cpfCnpjRef.current?.focus()}
          />
        </View>

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>{tituloDocumento} *</Text>
          <TextInput
            ref={cpfCnpjRef}
            style={styles.input}
            placeholder={placeholderDocumento}
            placeholderTextColor="#999"
            value={cpfCnpj}
            onChangeText={setCpfCnpj}
            returnKeyType="next"
            onSubmitEditing={() => especialidadeRef.current?.focus()}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Especialidade Principal *</Text>
        <TextInput
          ref={especialidadeRef}
          style={styles.input}
          placeholder="Ex: Eletricista, Cabeleireiro, Pintor..."
          placeholderTextColor="#999"
          value={especialidade}
          onChangeText={setEspecialidade}
          returnKeyType="next"
          onSubmitEditing={() => bioRef.current?.focus()}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Resumo / Biografia</Text>
        <TextInput
          ref={bioRef}
          style={[styles.input, styles.textArea]}
          placeholder="Fale um pouco sobre você, sua experiência e seus serviços..."
          placeholderTextColor="#999"
          value={bio}
          onChangeText={setBio}
          multiline
          textAlignVertical="top"
        />
      </View>

      <Text style={[styles.sectionTitle, { fontSize: 16, marginTop: 10, textAlign: 'left' }]}>
        Localização
      </Text>

      <View style={styles.row}>
        <View style={styles.halfInputLeft}>
          <Text style={styles.label}>País *</Text>
          <View style={styles.pickerOuter}>
            <Picker
              selectedValue={pais}
              onValueChange={(itemValue) => {
                setPais(itemValue);
                setEstado('');
              }}
              style={styles.picker}
            >
              {paises.map((p) => (
                <Picker.Item key={p} label={p} value={p} style={styles.pickerItem} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>Estado / Região *</Text>
          <View style={styles.pickerOuter}>
            <Picker
              selectedValue={estado}
              onValueChange={(itemValue) => setEstado(itemValue)}
              style={styles.picker}
            >
              {estadosParaMostrar.map((est) => (
                <Picker.Item key={est.value} label={est.label} value={est.value} style={styles.pickerItem} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInputLeft}>
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

        <View style={styles.halfInputRight}>
          <Text style={styles.label}>CEP / Código Postal *</Text>
          <TextInput
            ref={cepRef}
            style={styles.input}
            placeholder="00000-000"
            placeholderTextColor="#999"
            value={cep}
            onChangeText={setCep}
            returnKeyType="next"
            onSubmitEditing={() => enderecoRef.current?.focus()}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Endereço Completo *</Text>
        <TextInput
          ref={enderecoRef}
          style={styles.input}
          placeholder="Rua, Número, Bairro"
          placeholderTextColor="#999"
          value={endereco}
          onChangeText={setEndereco}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>E-mail de Acesso *</Text>
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
        title={tipoCadastro === 'empresa' ? 'CRIAR CONTA DA EMPRESA' : 'CRIAR PERFIL PROFISSIONAL'}
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
            Sua vitrine profissional no <Text style={styles.highlightText}>Coneta Solutions</Text>.
          </Animated.Text>
          <Animated.Text
            entering={FadeInLeft.delay(400).duration(800)}
            style={styles.brandingSubtitle}
          >
            Cadastre sua empresa ou perfil autônomo para alcançar mais clientes e gerenciar sua agenda com eficiência.
          </Animated.Text>

          <View style={styles.featuresList}>
            <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E8F0FE' }]}>
                <Ionicons name="trending-up" size={20} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>Aumente sua visibilidade</Text>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#E6F4EA' }]}>
                <Ionicons name="calendar" size={20} color="#34A853" />
              </View>
              <Text style={styles.featureText}>Gestão completa de agenda</Text>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: '#FEF7E0' }]}>
                <Ionicons name="stats-chart" size={20} color="#FBBC04" />
              </View>
              <Text style={styles.featureText}>Relatórios de desempenho</Text>
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
          {subtituloPrincipal}
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

  textArea: {
    minHeight: 95,
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

  segmentWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3F5F7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  segmentButtonActive: {
    backgroundColor: colors.primary,
  },

  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },

  segmentTextActive: {
    color: '#FFF',
  },

  tipBox: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  tipText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
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
