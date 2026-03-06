import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import colors from "./colors";
import CustomButton from './components/CustomButton';
import Constants from 'expo-constants'; // Importante para o ID do projeto

// Imports do Expo Notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

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
        console.log('Falha ao obter token para notificações push!');
        return null;
      }

      // Busca o token vinculado ao seu projeto Expo
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e) {
        console.log("Erro ao buscar token:", e);
      }
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
      Alert.alert("Atenção", "Por favor, preencha email e senha!");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      // --- LÓGICA DE NOTIFICAÇÃO ---
      // Pegamos o token sempre no login para garantir que está atualizado
      const token = await registerForPushNotificationsAsync();

      if (token) {
        await updateDoc(doc(db, "usuarios", user.uid), {
          pushToken: token,
          lastLogin: new Date().toISOString()
        });
      }
      // -----------------------------

      setLoading(false);
      navigation.replace('Main');

    } catch (error) {
      setLoading(false);
      console.log(error.code);

      let mensagemErro = "Erro ao fazer login.";

      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
        mensagemErro = "E-mail ou senha incorretos.";
      } else if (error.code === "auth/invalid-email") {
        mensagemErro = "E-mail inválido.";
      }

      Alert.alert("Erro de Login", mensagemErro);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo</Text>
      <Text style={styles.subtitle}>Faça login para continuar</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        editable={!loading}
      />

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
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
          </>
        )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 5
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30
  },
  input: {
    width: '90%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 16
  },
  buttonContainer: {
    width: '90%',
    marginTop: 10
  }
});

export default LoginScreen;