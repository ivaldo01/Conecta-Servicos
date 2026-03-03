import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig"; // Importe o db
import { doc, updateDoc } from "firebase/firestore"; // Importe os métodos do Firestore
import colors from "./colors";
import CustomButton from './components/CustomButton';

// Imports do Expo Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // FUNÇÃO PARA PEGAR O TOKEN DO DISPOSITIVO
  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }
      // Aqui você pega o token do Expo
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  };

  const handleLogin = async () => {
    if (!email || !senha) {
      alert("Por favor, preencha email e senha!");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // --- LOGICA DE NOTIFICAÇÃO ---
      // 1. Pega o token do aparelho
      const token = await registerForPushNotificationsAsync();

      // 2. Salva o token no cadastro do usuário no Firestore
      if (token) {
        await updateDoc(doc(db, "usuarios", user.uid), {
          pushToken: token
        });
      }
      // -----------------------------

      navigation.replace('Main');

    } catch (error) {
      if (error.code === "auth/user-not-found") {
        alert("Usuário não encontrado.");
      } else if (error.code === "auth/wrong-password") {
        alert("Senha incorreta.");
      } else {
        alert("Erro ao fazer login: " + error.message);
      }
    }
  };

  // ... (restante do código de renderização igual ao seu)
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

// ... seus estilos
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: colors.textDark },
  input: { width: '90%', padding: 12, borderWidth: 1, borderColor: '#ccc', marginBottom: 15, borderRadius: 8, backgroundColor: '#fff' },
  buttonContainer: { width: '90%', marginTop: 10 }
});

export default LoginScreen;