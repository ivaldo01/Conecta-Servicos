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
import { registrarPushTokenUsuario } from "../../utils/pushTokenUtils";
import PrimaryButton from "../../components/PrimaryButton";

import logo from '../../../assets/logo.png';

export default function SignUpCliente({ navigation }) {
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

  const telefoneRef = useRef(null);
  const cpfRef = useRef(null);
  const cidadeRef = useRef(null);
  const cepRef = useRef(null);
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
      const userCert = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      await setDoc(doc(db, "usuarios", userCert.user.uid), {
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
        pushToken: '',
        fotoPerfil: '',
        dataCriacao: serverTimestamp(),
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
              <Text style={styles.headerTitle}>Criar Minha Conta</Text>
              <Text style={styles.headerSubtitle}>
                Cadastre-se para encontrar profissionais e fazer seus agendamentos com facilidade
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>1. Seus Dados</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome Completo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Maria Oliveira Santos"
                  placeholderTextColor="#999"
                  value={nome}
                  onChangeText={setNome}
                  returnKeyType="next"
                  onSubmitEditing={() => telefoneRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CPF</Text>
                <TextInput
                  ref={cpfRef}
                  style={styles.input}
                  placeholder="000.000.000-00"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={cpf}
                  onChangeText={setCpf}
                  returnKeyType="next"
                  onSubmitEditing={() => cidadeRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>2. Sua Localização</Text>

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
                <Text style={styles.label}>CEP</Text>
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
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>3. Dados de Acesso</Text>

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
                  <Text style={styles.label}>Confirmar *</Text>
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
              title="CRIAR CONTA E AGENDAR"
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