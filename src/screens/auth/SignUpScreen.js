import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
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

  const idadeRef = useRef(null);
  const emailRef = useRef(null);
  const senhaRef = useRef(null);
  const telefoneRef = useRef(null);
  const whatsappRef = useRef(null);
  const cpfRef = useRef(null);
  const rgRef = useRef(null);
  const cnpjRef = useRef(null);
  const enderecoRef = useRef(null);
  const numeroRef = useRef(null);
  const complementoRef = useRef(null);
  const cidadeRef = useRef(null);
  const estadoRef = useRef(null);
  const cepRef = useRef(null);

  const handleSignUp = async () => {
    Keyboard.dismiss();

    if (!nomeCompleto || !idade || !email || !senha) {
      alert('Por favor, preencha os campos obrigatórios!');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );
      const user = userCredential.user;

      await setDoc(doc(db, 'usuarios', user.uid), {
        nomeCompleto,
        idade,
        email: email.trim().toLowerCase(),
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
        status: 'ativo',
      });

      alert('Cadastro realizado com sucesso!');
      navigation.navigate('Home');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert('Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.');
      } else {
        alert('Erro ao cadastrar: ' + error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Cadastro de Cliente</Text>

          <TextInputMask
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
            value={nomeCompleto}
            onChangeText={setNomeCompleto}
            style={styles.input}
            placeholder="Nome completo"
            returnKeyType="next"
            onSubmitEditing={() => idadeRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={idadeRef}
            type="only-numbers"
            value={idade}
            onChangeText={setIdade}
            style={styles.input}
            placeholder="Idade"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={emailRef}
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => senhaRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={senhaRef}
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAA' }}
            value={senha}
            onChangeText={setSenha}
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => telefoneRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={telefoneRef}
            type="cel-phone"
            options={{ maskType: 'BRL', withDDD: true, dddMask: '(99) ' }}
            value={telefone}
            onChangeText={setTelefone}
            style={styles.input}
            placeholder="Telefone"
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => whatsappRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={whatsappRef}
            type="cel-phone"
            options={{ maskType: 'BRL', withDDD: true, dddMask: '(99) ' }}
            value={whatsapp}
            onChangeText={setWhatsapp}
            style={styles.input}
            placeholder="WhatsApp"
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => cpfRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={cpfRef}
            type="cpf"
            value={cpf}
            onChangeText={setCpf}
            style={styles.input}
            placeholder="CPF"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => rgRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={rgRef}
            type="custom"
            options={{ mask: '99.999.999-9' }}
            value={rg}
            onChangeText={setRg}
            style={styles.input}
            placeholder="RG"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => cnpjRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={cnpjRef}
            type="cnpj"
            value={cnpj}
            onChangeText={setCnpj}
            style={styles.input}
            placeholder="CNPJ"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => enderecoRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={enderecoRef}
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
            value={endereco}
            onChangeText={setEndereco}
            style={styles.input}
            placeholder="Endereço"
            returnKeyType="next"
            onSubmitEditing={() => numeroRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={numeroRef}
            type="only-numbers"
            value={numero}
            onChangeText={setNumero}
            style={styles.input}
            placeholder="Número"
            keyboardType="number-pad"
            returnKeyType="next"
            onSubmitEditing={() => complementoRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={complementoRef}
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
            value={complemento}
            onChangeText={setComplemento}
            style={styles.input}
            placeholder="Complemento"
            returnKeyType="next"
            onSubmitEditing={() => cidadeRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={cidadeRef}
            type="custom"
            options={{ mask: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }}
            value={cidade}
            onChangeText={setCidade}
            style={styles.input}
            placeholder="Cidade"
            returnKeyType="next"
            onSubmitEditing={() => estadoRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={estadoRef}
            type="custom"
            options={{ mask: 'AA' }}
            value={estado}
            onChangeText={setEstado}
            style={styles.input}
            placeholder="Estado"
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => cepRef.current?.getElement()?.focus?.()}
          />

          <TextInputMask
            ref={cepRef}
            type="zip-code"
            value={cep}
            onChangeText={setCep}
            style={styles.input}
            placeholder="CEP"
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />

          <View style={styles.buttonContainer}>
            <Button title="Cadastrar" onPress={handleSignUp} color="#2196F3" />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 22,
    marginBottom: 20,
    fontWeight: 'bold',
  },

  input: {
    width: '90%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 15,
    borderRadius: 5,
  },

  buttonContainer: {
    width: '90%',
    marginTop: 20,
  },
});

export default SignUpScreen;
