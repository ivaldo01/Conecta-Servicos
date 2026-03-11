import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from "../../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import colors from "../../constants/colors";

export default function SignUpCliente({ navigation }) {
  // 1. Dados Pessoais
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpf, setCpf] = useState('');

  // 2. Localização (Seletores)
  const [pais, setPais] = useState('Brasil');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [cep, setCep] = useState('');

  // 3. Segurança e Termos
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitaTermos, setAceitaTermos] = useState(false);

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

  const handleCadastro = async () => {
    if (!aceitaTermos) {
      Alert.alert("Termos de Uso", "Você precisa aceitar os termos para criar sua conta.");
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }
    if (!nome || !email || !telefone || !estado || !cidade) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios (Nome, E-mail, Telefone, Estado e Cidade).");
      return;
    }

    try {
      const userCert = await createUserWithEmailAndPassword(auth, email, senha);
      await setDoc(doc(db, "usuarios", userCert.user.uid), {
        nomeCompleto: nome,
        telefone: telefone,
        cpf: cpf,
        localizacao: { pais, estado, cidade, cep },
        email: email,
        tipo: 'cliente',
        dataCriacao: serverTimestamp()
      });
      Alert.alert("Bem-vindo!", "Conta de cliente criada com sucesso.");
      navigation.replace("Main");
    } catch (e) {
      Alert.alert("Erro ao cadastrar", e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.headerTitle}>Criar Minha Conta</Text>

      {/* SEÇÃO 1: Dados Pessoais */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. Seus Dados</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome Completo</Text>
          <TextInput style={styles.input} placeholder="Ex: Maria Oliveira Santos" value={nome} onChangeText={setNome} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>WhatsApp / Celular</Text>
          <TextInput style={styles.input} placeholder="(11) 99999-9999" keyboardType="phone-pad" value={telefone} onChangeText={setTelefone} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>CPF (Opcional)</Text>
          <TextInput style={styles.input} placeholder="000.000.000-00" keyboardType="numeric" value={cpf} onChangeText={setCpf} />
        </View>
      </View>

      {/* SEÇÃO 2: Localização (Pickers) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Sua Localização</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>País</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={pais} onValueChange={(v) => setPais(v)} style={styles.picker}>
              <Picker.Item label="Brasil" value="Brasil" />
              <Picker.Item label="Portugal" value="Portugal" />
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Estado (UF)</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={estado} onValueChange={(v) => setEstado(v)} style={styles.picker}>
              {estadosBrasil.map(est => <Picker.Item key={est.value} label={est.label} value={est.value} />)}
            </Picker>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cidade</Text>
          <TextInput style={styles.input} placeholder="Digite sua cidade" value={cidade} onChangeText={setCidade} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CEP</Text>
          <TextInput style={styles.input} placeholder="00000-000" keyboardType="numeric" value={cep} onChangeText={setCep} />
        </View>
      </View>

      {/* SEÇÃO 3: Acesso */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>3. Dados de Acesso</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput style={styles.input} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} placeholder="6+ dígitos" secureTextEntry value={senha} onChangeText={setSenha} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Confirmar</Text>
            <TextInput style={styles.input} placeholder="Repita a senha" secureTextEntry value={confirmarSenha} onChangeText={setConfirmarSenha} />
          </View>
        </View>
      </View>

      {/* SEÇÃO 4: Jurídico */}
      <View style={styles.termsContainer}>
        <Switch value={aceitaTermos} onValueChange={setAceitaTermos} trackColor={{ false: "#CCC", true: "#000" }} />
        <TouchableOpacity onPress={() => navigation.navigate("TermosUso")}>
          <Text style={styles.termsText}>Li e aceito os <Text style={styles.link}>Termos de Uso</Text></Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.btnFinalizar} onPress={handleCadastro}>
        <Text style={styles.btnText}>CRIAR CONTA E AGENDAR</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F8', padding: 15 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', marginTop: 40, marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 5 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#FBFBFB', borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#E8E8E8' },
  pickerContainer: { backgroundColor: '#FBFBFB', borderRadius: 10, borderWidth: 1, borderColor: '#E8E8E8', overflow: 'hidden' },
  picker: { height: 50, width: '100%' },
  row: { flexDirection: 'row' },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, paddingHorizontal: 10 },
  termsText: { marginLeft: 10, fontSize: 14, color: '#666', flex: 1 },
  link: { color: '#000', fontWeight: 'bold', textDecorationLine: 'underline' },
  btnFinalizar: { backgroundColor: '#000', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 30 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});