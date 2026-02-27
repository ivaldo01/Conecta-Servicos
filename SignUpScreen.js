import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig"; 
import { doc, setDoc } from "firebase/firestore";
import { TextInputMask } from 'react-native-masked-text';

function SignUpScreen({ navigation }) {
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [idade, setIdade] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [cep, setCep] = useState('');

  const handleSignUp = async () => {
    if (!nomeCompleto || !idade || !email || !senha) {
      alert("Por favor, preencha os campos obrigatórios!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      await setDoc(doc(db, "usuarios", user.uid), {
        nomeCompleto,
        idade,
        email,
        telefone,
        whatsapp,
        cpf,
        rg,
        cnpj,
        endereco,
        numero,
        complemento,
        cidade,
        estado,
        cep,
        createdAt: new Date().toISOString(),
        status: "ativo"
      });

      alert("Cadastro realizado com sucesso!");
      navigation.navigate('Home');
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        alert("Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.");
      } else {
        alert("Erro ao cadastrar: " + error.message);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cadastro de Cliente</Text>

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
        value={nomeCompleto}
        onChangeText={setNomeCompleto}
        style={styles.input}
        placeholder="Nome completo"
      />

      <TextInputMask
        type={'only-numbers'}
        value={idade}
        onChangeText={setIdade}
        style={styles.input}
        placeholder="Idade"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        placeholder="Email"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAA' }}
        value={senha}
        onChangeText={setSenha}
        style={styles.input}
        placeholder="Senha"
      />

      <TextInputMask
        type={'cel-phone'}
        options={{ maskType: 'BRL', withDDD: true, dddMask: '(99) ' }}
        value={telefone}
        onChangeText={setTelefone}
        style={styles.input}
        placeholder="Telefone"
      />

      <TextInputMask
        type={'cel-phone'}
        options={{ maskType: 'BRL', withDDD: true, dddMask: '(99) ' }}
        value={whatsapp}
        onChangeText={setWhatsapp}
        style={styles.input}
        placeholder="WhatsApp"
      />

      <TextInputMask
        type={'cpf'}
        value={cpf}
        onChangeText={setCpf}
        style={styles.input}
        placeholder="CPF"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: '99.999.999-9' }}
        value={rg}
        onChangeText={setRg}
        style={styles.input}
        placeholder="RG"
      />

      <TextInputMask
        type={'cnpj'}
        value={cnpj}
        onChangeText={setCnpj}
        style={styles.input}
        placeholder="CNPJ"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
        value={endereco}
        onChangeText={setEndereco}
        style={styles.input}
        placeholder="Endereço"
      />

      <TextInputMask
        type={'only-numbers'}
        value={numero}
        onChangeText={setNumero}
        style={styles.input}
        placeholder="Número"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
        value={complemento}
        onChangeText={setComplemento}
        style={styles.input}
        placeholder="Complemento"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
        value={cidade}
        onChangeText={setCidade}
        style={styles.input}
        placeholder="Cidade"
      />

      <TextInputMask
        type={'custom'}
        options={{ mask: 'AA' }}
        value={estado}
        onChangeText={setEstado}
        style={styles.input}
        placeholder="Estado"
      />

      <TextInputMask
        type={'zip-code'}
        value={cep}
        onChangeText={setCep}
        style={styles.input}
        placeholder="CEP"
      />

      <View style={styles.buttonContainer}>
        <Button title="Cadastrar" onPress={handleSignUp} color="#2196F3" />
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 22, marginBottom: 20, fontWeight: 'bold' },
  input: { width: '90%', padding: 10, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, borderRadius: 5 },
  buttonContainer: { width: '90%', marginTop: 20 }
});

export default SignUpScreen;