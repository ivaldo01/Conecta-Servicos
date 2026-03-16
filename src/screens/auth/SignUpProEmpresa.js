import React, { useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from "../../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import colors from "../../constants/colors";
import PrimaryButton from "../../components/PrimaryButton";
import { prepararDadosCategoriaParaProfissional } from "../../utils/categoriaUtils";

import logo from '../../../assets/logo.png';

export default function SignUpProEmpresa({ navigation }) {
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
      ? 'Cadastre sua empresa para oferecer serviços no Conecta Serviços'
      : 'Cadastre seu perfil para atender clientes no Conecta Serviços';

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
    if (!cpfCnpj.trim()) {
      Alert.alert(
        "Atenção",
        tipoCadastro === 'empresa'
          ? "Informe o CNPJ."
          : "Informe o CPF."
      );
      return false;
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      const user = userCredential.user;
      const dadosCategoria = await prepararDadosCategoriaParaProfissional(especialidade);

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

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBanner}>
              <Image source={logo} style={styles.logo} />
              <Text style={styles.headerTitle}>{tituloPrincipal}</Text>
              <Text style={styles.headerSubtitle}>{subtituloPrincipal}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Tipo de Cadastro</Text>

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
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Dados Profissionais</Text>

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
                  returnKeyType={tipoCadastro === 'empresa' ? 'next' : 'next'}
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
                <Text style={styles.label}>Descrição Profissional</Text>
                <TextInput
                  ref={bioRef}
                  style={[styles.input, styles.textArea]}
                  placeholder="Descreva seus serviços, experiência ou diferencial..."
                  placeholderTextColor="#999"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="next"
                  onSubmitEditing={() => cidadeRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Localização</Text>

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
                    itemStyle={styles.pickerItem}
                  >
                    {paises.map((item) => (
                      <Picker.Item
                        key={item}
                        label={item}
                        value={item}
                        color={Platform.OS === 'android' ? '#222' : undefined}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {pais === 'Brasil' ? 'Estado (UF) *' : 'Região / Estado *'}
                </Text>
                <View style={styles.pickerOuter}>
                  <Picker
                    selectedValue={estado}
                    onValueChange={(v) => setEstado(v)}
                    style={styles.picker}
                    dropdownIconColor={colors.textDark}
                    itemStyle={styles.pickerItem}
                  >
                    {estadosParaMostrar.map((item) => (
                      <Picker.Item
                        key={`${item.label}-${item.value}`}
                        label={item.label}
                        value={item.value}
                        color={Platform.OS === 'android' ? '#222' : undefined}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cidade *</Text>
                <TextInput
                  ref={cidadeRef}
                  style={styles.input}
                  placeholder="Digite sua cidade"
                  placeholderTextColor="#999"
                  value={cidade}
                  onChangeText={setCidade}
                  returnKeyType="next"
                  onSubmitEditing={() => cepRef.current?.focus()}
                />
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
                  onSubmitEditing={() => enderecoRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Endereço / Bairro *</Text>
                <TextInput
                  ref={enderecoRef}
                  style={styles.input}
                  placeholder="Rua, número, bairro..."
                  placeholderTextColor="#999"
                  value={endereco}
                  onChangeText={setEndereco}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>4. Dados de Acesso</Text>

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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: '#F4F7F8',
  },

  container: {
    flex: 1,
    backgroundColor: '#F4F7F8',
  },

  scrollContent: {
    padding: 15,
    paddingBottom: 80,
  },

  topBanner: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },

  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 6,
  },

  inputGroup: {
    marginBottom: 15,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 5,
  },

  input: {
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    color: '#333',
  },

  textArea: {
    minHeight: 95,
  },

  pickerOuter: {
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
    justifyContent: 'center',
  },

  picker: {
    height: Platform.OS === 'ios' ? 180 : 56,
    width: '100%',
    color: '#222',
    backgroundColor: '#FBFBFB',
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
    backgroundColor: '#FBFBFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
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
    paddingHorizontal: 6,
  },

  termsTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  termsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  link: {
    color: colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
