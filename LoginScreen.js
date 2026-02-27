import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import colors from "./colors";
import CustomButton from './components/CustomButton';

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Por favor, preencha email e senha!");
      return;
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      
      // IMPORTANTE: Mudamos de 'Home' para 'Main' para encontrar o Drawer correto
      navigation.replace('Main'); 
      
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("Usuário não encontrado. Verifique o email ou cadastre-se.");
      } else if (error.code === "auth/wrong-password") {
        alert("Senha incorreta. Tente novamente.");
      } else {
        alert("Erro ao fazer login: " + error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        keyboardType="email-address" 
        autoCapitalize="none" 
      />
      
      <TextInput 
        style={styles.input} 
        placeholder="Senha" 
        value={senha} 
        onChangeText={setSenha} 
        secureTextEntry 
      />

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Entrar" 
          icon="log-in" 
          color={colors.primary} 
          onPress={handleLogin} 
        />
        
        <CustomButton 
          title="Cadastrar-se" 
          icon="person-add" 
          color={colors.success} 
          onPress={() => navigation.navigate('ChooseProfile')} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: colors.background, 
    padding: 20 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: colors.textDark 
  },
  input: { 
    width: '90%', 
    padding: 12, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    marginBottom: 15, 
    borderRadius: 8,
    backgroundColor: '#fff'
  },
  buttonContainer: { 
    width: '90%', 
    marginTop: 10 
  }
});

export default LoginScreen;