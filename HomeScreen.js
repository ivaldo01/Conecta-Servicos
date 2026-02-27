import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native'; 
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import colors from "./colors";
import CustomButton from './components/CustomButton';

function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("Você saiu da conta.");
      navigation.replace("Login"); 
    } catch (error) {
      alert("Erro ao sair: " + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel de Controle</Text>
      <Text style={styles.subtitle}>O que você deseja fazer hoje?</Text>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Buscar Profissionais" 
          icon="map" 
          color={colors.primary} 
          onPress={() => navigation.navigate("BuscaProfissionais")} 
        />
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Meus Dependentes" 
          icon="people" 
          color="#673AB7" 
          onPress={() => navigation.navigate("ListaMenores")} 
        />
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Meu Perfil" 
          icon="person-circle" 
          color={colors.success} 
          onPress={() => navigation.navigate("Perfil")} 
        />
      </View>

      {/* --- BOTÃO DE TESTE ABAIXO --- */}
      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Criar Perfil PRO (Teste)" 
          icon="hammer" 
          color="#FF9800" 
          onPress={() => navigation.navigate("SignUpProEmpresa")} 
        />
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton 
          title="Sair do App" 
          icon="log-out" 
          color={colors.danger} 
          onPress={handleLogout} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: colors.textDark },
  subtitle: { fontSize: 16, marginBottom: 30, color: '#555' },
  buttonContainer: { width: '85%', marginTop: 15 },
});

export default HomeScreen;