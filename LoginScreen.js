import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { auth, db } from "./firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import colors from "./colors";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) {
      Alert.alert("Atenção", "Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    try {
      const userCert = await signInWithEmailAndPassword(auth, email, senha);

      // Busca o tipo de usuário no Firestore para saber para onde mandar
      const userDoc = await getDoc(doc(db, "usuarios", userCert.user.uid));

      if (userDoc.exists()) {
        // Navega para a Main (Drawer) que você definiu no App.js
        navigation.replace("Main");
      } else {
        Alert.alert("Erro", "Perfil de usuário não encontrado.");
      }
    } catch (e) {
      let mensagem = "Erro ao entrar. Verifique seus dados.";
      if (e.code === 'auth/user-not-found') mensagem = "E-mail não cadastrado.";
      if (e.code === 'auth/wrong-password') mensagem = "Senha incorreta.";
      Alert.alert("Ops!", mensagem);
    } finally {
      setLoading(false);
    }
  };

  const esqueciSenha = () => {
    if (!email) {
      Alert.alert("Recuperar Senha", "Digite seu e-mail no campo acima para receber o link de redefinição.");
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => Alert.alert("Sucesso", "E-mail de recuperação enviado! Verifique sua caixa de entrada."))
      .catch(e => Alert.alert("Erro", "E-mail inválido ou não cadastrado."));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Agenda<Text style={{ color: colors.primary }}>Pro</Text></Text>
          <Text style={styles.welcomeText}>Seja bem-vindo novamente!</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Acesse sua Conta</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: seuemail@contato.com"
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
              placeholder="Sua senha secreta"
              placeholderTextColor="#999"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <TouchableOpacity onPress={esqueciSenha} style={styles.forgotPass}>
            <Text style={styles.forgotPassText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnLogin, loading && { backgroundColor: '#CCC' }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>ENTRAR NO SISTEMA</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.noAccountText}>Ainda não tem conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ChooseProfile")}>
            <Text style={styles.signUpText}>CRIAR UMA CONTA AGORA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F8' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  logoText: { fontSize: 36, fontWeight: 'bold', color: '#1A1A1A' },
  welcomeText: { fontSize: 16, color: '#666', marginTop: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 25, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 25, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#EEE', color: '#333' },
  forgotPass: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotPassText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  btnLogin: { backgroundColor: '#000', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 2 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footer: { marginTop: 30, alignItems: 'center' },
  noAccountText: { color: '#666', fontSize: 14 },
  signUpText: { color: colors.primary, fontWeight: 'bold', fontSize: 15, marginTop: 5 }
});