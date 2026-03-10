import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import colors from "./colors";

export default function SignUpProEmpresa({ navigation }) {
  const [tipoRegistro, setTipoRegistro] = useState('autonomo');

  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [nomeNegocio, setNomeNegocio] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [bio, setBio] = useState('');

  const [pais, setPais] = useState('Brasil');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cep, setCep] = useState('');

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitaTermos, setAceitaTermos] = useState(false);

  const [salvando, setSalvando] = useState(false);

  const estadosBrasil = [
    { label: "Selecione o Estado", value: "" },
    { label: "Acre", value: "AC" }, { label: "Alagoas", value: "AL" }, { label: "Amapá", value: "AP" },
    { label: "Amazonas", value: "AM" }, { label: "Bahia", value: "BA" }, { label: "Ceará", value: "CE" },
    { label: "Distrito Federal", value: "DF" }, { label: "Espírito Santo", value: "ES" }, { label: "Goiás", value: "GO" },
    { label: "Maranhão", value: "MA" }, { label: "Mato Grosso", value: "MT" }, { label: "Mato Grosso do Sul", value: "MS" },
    { label: "Minas Gerais", value: "MG" }, { label: "Pará", value: "PA" }, { label: "Paraíba", value: "PB" },
    { label: "Paraná", value: "PR" }, { label: "Pernambuco", value: "PE" }, { label: "Piauí", value: "PI" },
    { label: "Rio de Janeiro", value: "RJ" }, { label: "Rio Grande do Norte", value: "RN" }, { label: "Rio Grande do Sul", value: "RS" },
    { label: "Rondônia", value: "RO" }, { label: "Roraima", value: "RR" }, { label: "Santa Catarina", value: "SC" },
    { label: "São Paulo", value: "SP" }, { label: "Sergipe", value: "SE" }, { label: "Tocantins", value: "TO" }
  ];

  const tituloDocumento = useMemo(() => {
    return tipoRegistro === 'empresa' ? 'CNPJ' : 'CPF';
  }, [tipoRegistro]);

  const placeholderDocumento = useMemo(() => {
    return tipoRegistro === 'empresa' ? 'Digite o CNPJ' : 'Digite o CPF';
  }, [tipoRegistro]);

  const nomeExibicao = useMemo(() => {
    if (tipoRegistro === 'empresa') {
      return nomeNegocio.trim();
    }
    return nomeResponsavel.trim();
  }, [tipoRegistro, nomeNegocio, nomeResponsavel]);

  const limparSomenteNumeros = (texto) => texto.replace(/\D/g, '');

  const formatarTelefone = (texto) => {
    const numeros = limparSomenteNumeros(texto).slice(0, 11);

    if (numeros.length <= 10) {
      return numeros
        .replace(/^(\d{0,2})/, '($1')
        .replace(/^(\(\d{2})(\d)/, '$1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }

    return numeros
      .replace(/^(\d{0,2})/, '($1')
      .replace(/^(\(\d{2})(\d)/, '$1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatarCPF = (texto) => {
    const numeros = limparSomenteNumeros(texto).slice(0, 11);
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatarCNPJ = (texto) => {
    const numeros = limparSomenteNumeros(texto).slice(0, 14);
    return numeros
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatarCEP = (texto) => {
    const numeros = limparSomenteNumeros(texto).slice(0, 8);
    return numeros.replace(/^(\d{5})(\d)/, '$1-$2');
  };

  const handleDocumentoChange = (texto) => {
    if (tipoRegistro === 'empresa') {
      setDocumento(formatarCNPJ(texto));
      return;
    }
    setDocumento(formatarCPF(texto));
  };

  const validarFormulario = () => {
    if (!aceitaTermos) {
      Alert.alert("Termos de Uso", "Você precisa aceitar os termos para criar sua conta.");
      return false;
    }

    if (!nomeResponsavel.trim()) {
      Alert.alert("Atenção", "Informe o nome do responsável.");
      return false;
    }

    if (tipoRegistro === 'empresa' && !nomeNegocio.trim()) {
      Alert.alert("Atenção", "Informe o nome do negócio ou empresa.");
      return false;
    }

    if (!documento.trim()) {
      Alert.alert("Atenção", `Informe o ${tituloDocumento}.`);
      return false;
    }

    if (!telefone.trim()) {
      Alert.alert("Atenção", "Informe o telefone/WhatsApp.");
      return false;
    }

    if (!especialidade.trim()) {
      Alert.alert("Atenção", "Informe a especialidade principal.");
      return false;
    }

    if (!estado || !cidade.trim()) {
      Alert.alert("Atenção", "Informe estado e cidade.");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("Atenção", "Informe o e-mail.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      Alert.alert("Atenção", "Informe um e-mail válido.");
      return false;
    }

    if (!senha) {
      Alert.alert("Atenção", "Informe uma senha.");
      return false;
    }

    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha deve ter no mínimo 6 caracteres.");
      return false;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return false;
    }

    const documentoNumerico = limparSomenteNumeros(documento);
    if (tipoRegistro === 'empresa' && documentoNumerico.length !== 14) {
      Alert.alert("Atenção", "CNPJ inválido.");
      return false;
    }

    if (tipoRegistro === 'autonomo' && documentoNumerico.length !== 11) {
      Alert.alert("Atenção", "CPF inválido.");
      return false;
    }

    return true;
  };

  const handleCadastro = async () => {
    if (!validarFormulario()) return;

    setSalvando(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      const user = userCredential.user;

      const payload = {
        nome: nomeExibicao,
        nomeResponsavel: nomeResponsavel.trim(),
        nomeNegocio: tipoRegistro === 'empresa' ? nomeNegocio.trim() : '',
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        whatsapp: telefone.trim(),
        tipo: 'profissional',
        perfil: tipoRegistro === 'empresa' ? 'empresa' : 'profissional',
        tipoRegistro,
        cpf: tipoRegistro === 'autonomo' ? limparSomenteNumeros(documento) : '',
        cnpj: tipoRegistro === 'empresa' ? limparSomenteNumeros(documento) : '',
        documentoFormatado: documento.trim(),
        especialidade: especialidade.trim(),
        bio: bio.trim(),
        endereco: endereco.trim(),
        localizacao: {
          pais: pais.trim(),
          estado,
          cidade: cidade.trim(),
          cep: cep.trim(),
        },
        ativo: true,
        pushToken: '',
        fotoPerfil: '',
        latitude: null,
        longitude: null,
        createdAt: serverTimestamp(),
        dataCriacao: serverTimestamp(),
      };

      await setDoc(doc(db, "usuarios", user.uid), payload);

      Alert.alert(
        "Cadastro realizado!",
        "Sua conta profissional foi criada com sucesso.",
        [
          {
            text: "OK",
            onPress: () => navigation.replace("Main"),
          },
        ]
      );
    } catch (e) {
      let mensagem = "Não foi possível concluir o cadastro.";
      if (e.code === 'auth/email-already-in-use') {
        mensagem = "Este e-mail já está cadastrado.";
      } else if (e.code === 'auth/invalid-email') {
        mensagem = "O e-mail informado é inválido.";
      } else if (e.code === 'auth/weak-password') {
        mensagem = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      } else if (e.message) {
        mensagem = e.message;
      }

      Alert.alert("Erro", mensagem);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F4F7F8' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerTitle}>Cadastro Profissional</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Tipo de Conta</Text>

          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                tipoRegistro === 'autonomo' && styles.typeButtonActive,
              ]}
              onPress={() => setTipoRegistro('autonomo')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  tipoRegistro === 'autonomo' && styles.typeButtonTextActive,
                ]}
              >
                Autônomo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                tipoRegistro === 'empresa' && styles.typeButtonActive,
              ]}
              onPress={() => setTipoRegistro('empresa')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  tipoRegistro === 'empresa' && styles.typeButtonTextActive,
                ]}
              >
                Empresa
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Perfil e Identificação</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Responsável</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: João da Silva"
              placeholderTextColor="#999"
              value={nomeResponsavel}
              onChangeText={setNomeResponsavel}
            />
          </View>

          {tipoRegistro === 'empresa' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Negócio / Empresa</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Barbearia Central"
                placeholderTextColor="#999"
                value={nomeNegocio}
                onChangeText={setNomeNegocio}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{tituloDocumento}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholderDocumento}
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={documento}
              onChangeText={handleDocumentoChange}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={telefone}
              onChangeText={(texto) => setTelefone(formatarTelefone(texto))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Especialidade Principal</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Barbeiro, Manicure, Fisioterapeuta"
              placeholderTextColor="#999"
              value={especialidade}
              onChangeText={setEspecialidade}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição / Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Fale um pouco sobre seu atendimento, experiência e especialidades."
              placeholderTextColor="#999"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Localização</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>País</Text>
            <TextInput
              style={styles.input}
              value={pais}
              onChangeText={setPais}
              placeholder="Brasil"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={estado}
                onValueChange={(itemValue) => setEstado(itemValue)}
                style={styles.picker}
              >
                {estadosBrasil.map((item) => (
                  <Picker.Item
                    key={item.value || item.label}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cidade</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua cidade"
              placeholderTextColor="#999"
              value={cidade}
              onChangeText={setCidade}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Endereço</Text>
            <TextInput
              style={styles.input}
              placeholder="Rua, número, bairro"
              placeholderTextColor="#999"
              value={endereco}
              onChangeText={setEndereco}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CEP</Text>
            <TextInput
              style={styles.input}
              placeholder="00000-000"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={cep}
              onChangeText={(texto) => setCep(formatarCEP(texto))}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>4. Segurança de Acesso</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seunegocio@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#999"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite a senha novamente"
              placeholderTextColor="#999"
              secureTextEntry
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>5. Termos e Responsabilidade</Text>

          <View style={styles.termsRow}>
            <Switch
              value={aceitaTermos}
              onValueChange={setAceitaTermos}
              trackColor={{ false: '#DADADA', true: colors.primary }}
              thumbColor="#FFF"
            />
            <View style={styles.termsTextBox}>
              <Text style={styles.termsText}>
                Declaro que li e aceito os Termos de Uso e Privacidade.
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('TermosUso')}>
                <Text style={styles.linkText}>Ler termos</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnFinalizar, salvando && styles.btnDisabled]}
          onPress={handleCadastro}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>CRIAR CONTA PROFISSIONAL</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F8', padding: 15 },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center'
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 5
  },

  inputGroup: { marginBottom: 15 },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 5
  },

  input: {
    backgroundColor: '#FBFBFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    color: '#333'
  },

  textArea: {
    minHeight: 100,
  },

  pickerContainer: {
    backgroundColor: '#FBFBFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden'
  },

  picker: {
    height: 50,
    width: '100%'
  },

  switchRow: {
    flexDirection: 'row',
    gap: 10,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
  },

  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  typeButtonText: {
    color: '#555',
    fontWeight: '700',
    fontSize: 14,
  },

  typeButtonTextActive: {
    color: '#FFF',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  termsTextBox: {
    flex: 1,
    marginLeft: 12,
  },

  termsText: {
    color: '#555',
    fontSize: 13,
    lineHeight: 19,
  },

  linkText: {
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 6,
    fontSize: 13,
  },

  btnFinalizar: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20
  },

  btnDisabled: {
    opacity: 0.7,
  },

  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16
  }
});