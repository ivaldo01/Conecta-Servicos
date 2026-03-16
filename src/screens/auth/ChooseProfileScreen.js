import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import colors from '../../constants/colors';

import logo from '../../../assets/logo.png';

export default function ChooseProfileScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoArea}>
          <Image source={logo} style={styles.logo} />
          <Text style={styles.title}>Bem-vindo ao Conecta Serviços</Text>
          <Text style={styles.subtitle}>
            Escolha como deseja usar o aplicativo
          </Text>
        </View>

        <View style={styles.buttonsArea}>
          <TouchableOpacity
            style={styles.buttonCliente}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('SignUpCliente')}
          >
            <Text style={styles.buttonTitleDark}>Sou Cliente</Text>
            <Text style={styles.buttonSubtitleDark}>
              Quero contratar profissionais e agendar serviços
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonProfissional}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('SignUpProEmpresa')}
          >
            <Text style={styles.buttonTitleLight}>Sou Profissional</Text>
            <Text style={styles.buttonSubtitleLight}>
              Quero oferecer meus serviços e atender clientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7F8',
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },

  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },

  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 18,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  buttonsArea: {
    marginTop: 8,
  },

  buttonCliente: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 18,
    marginBottom: 18,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  buttonProfissional: {
    backgroundColor: colors.primary,
    padding: 22,
    borderRadius: 18,
    marginBottom: 16,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  buttonTitleDark: {
    fontSize: 19,
    fontWeight: '800',
    color: '#222',
  },

  buttonSubtitleDark: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    lineHeight: 20,
  },

  buttonTitleLight: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFF',
  },

  buttonSubtitleLight: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    lineHeight: 20,
  },

  backButton: {
    alignItems: 'center',
    marginTop: 6,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});