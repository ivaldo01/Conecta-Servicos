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
    backgroundColor: '#F0F3F8',
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 36,
  },

  logoArea: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  logo: {
    width: 118,
    height: 118,
    resizeMode: 'contain',
    marginBottom: 14,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 10,
  },

  buttonsArea: {
    marginTop: 2,
  },

  buttonCliente: {
    backgroundColor: '#FFFFFF',
    padding: 22,
    borderRadius: 20,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  buttonProfissional: {
    backgroundColor: '#1E2535',
    padding: 22,
    borderRadius: 20,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#1E2535',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  buttonTitleDark: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textDark,
  },

  buttonSubtitleDark: {
    fontSize: 14,
    color: '#667085',
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
    color: 'rgba(255,255,255,0.86)',
    marginTop: 6,
    lineHeight: 20,
  },

  backButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },

  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});