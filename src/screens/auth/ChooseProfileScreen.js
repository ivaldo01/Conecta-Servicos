import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import DesktopWrapper from '../../components/DesktopWrapper';

import logo from '../../../assets/logo.png';

export default function ChooseProfileScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && screenWidth > 800;

  const floatValue = useSharedValue(0);

  useEffect(() => {
    floatValue.value = withRepeat(
      withTiming(1, { duration: 3000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle0 = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(floatValue.value * 20) }]
  }));

  const animatedStyle20 = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(floatValue.value * 20 + 20) }]
  }));

  const renderContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        entering={FadeInDown.duration(800)}
        style={styles.logoArea}
      >
        <Image source={logo} style={styles.logo} />
        <Text style={styles.brandName}>Coneta Solutions</Text>
        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>
          Como você deseja utilizar nossa plataforma hoje?
        </Text>
      </Animated.View>

      <View style={styles.buttonsArea}>
        <Animated.View entering={FadeInUp.delay(200).duration(800)}>
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SignUpCliente')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F0FE' }]}>
              <Ionicons name="person" size={32} color={colors.primary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Sou Cliente</Text>
              <Text style={styles.cardSubtitle}>
                Quero encontrar profissionais e agendar serviços com facilidade.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(800)}>
          <TouchableOpacity
            style={styles.profileCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SignUpProEmpresa')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="briefcase" size={32} color="#1E293B" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Sou Profissional</Text>
              <Text style={styles.cardSubtitle}>
                Quero oferecer meus serviços, gerenciar agenda e crescer meu negócio.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#CBD5E1" />
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {isWebLarge && (
        <>
          <Animated.View style={[styles.floatingCircle, animatedStyle0, { top: '10%', left: '15%', width: 80, height: 80, opacity: 0.05 }]} />
          <Animated.View style={[styles.floatingCircle, animatedStyle20, { bottom: '15%', right: '20%', width: 120, height: 120, opacity: 0.03 }]} />
        </>
      )}

      <DesktopWrapper style={styles.flex}>
        {renderContent()}
      </DesktopWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonsArea: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
});