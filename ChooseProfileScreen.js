import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from "./colors";
import CustomButton from './components/CustomButton';

function ChooseProfileScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao App de Agendamentos</Text>
      <Text style={styles.subtitle}>Escolha seu perfil para continuar:</Text>

      <View style={styles.buttonContainer}>
        <CustomButton title="Sou Cliente" icon="person" color={colors.primary} onPress={() => navigation.navigate('SignUpCliente')} />
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton title="Sou Profissional / Empresa" icon="business" color={colors.success} onPress={() => navigation.navigate('SignUpProEmpresa')} />
      </View>

      <View style={styles.buttonContainer}>
        <CustomButton title="Ir para Login" icon="log-in" color={colors.info} onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: colors.textDark },
  subtitle: { fontSize: 16, marginBottom: 30, textAlign: 'center', color: '#555' },
  buttonContainer: { width: '80%', marginTop: 15 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, marginVertical: 8 },
  buttonText: { color: colors.textLight, fontSize: 18, fontWeight: 'bold' }
});

export default ChooseProfileScreen;