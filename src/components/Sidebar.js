import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { auth } from '../services/firebaseConfig';
import colors from '../constants/colors';
import logo from '../../assets/logo.png';

const SIDEBAR_WIDTH = 260;

function SidebarItem({ icon, label, active, onPress }) {
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue('transparent');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: backgroundColor.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      onHoverIn={() => {
        backgroundColor.value = withTiming('rgba(26, 115, 232, 0.08)');
      }}
      onHoverOut={() => {
        backgroundColor.value = withTiming('transparent');
      }}
    >
      <Animated.View style={[styles.sidebarItem, active && styles.sidebarItemActive, animatedStyle]}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? colors.primary : '#64748B'}
        />
        <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Sidebar({ navigation, activeRoute }) {
  const { width } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && width > 768;

  if (!isLargeScreen) return null;

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Image source={logo} style={styles.sidebarLogo} />
        <Text style={styles.sidebarBrandName}>Coneta Solutions</Text>
      </View>

      <View style={styles.sidebarContent}>
        <SidebarItem
          icon="home"
          label="Início"
          active={activeRoute === 'HomeScreen'}
          onPress={() => navigation.navigate('Main')}
        />
        <SidebarItem
          icon="search"
          label="Explorar"
          active={activeRoute === 'BuscaProfissionais'}
          onPress={() => navigation.navigate('BuscaProfissionais')}
        />
        <SidebarItem
          icon="calendar"
          label="Meus Agendamentos"
          active={activeRoute === 'MeusAgendamentosCliente'}
          onPress={() => navigation.navigate('MeusAgendamentosCliente')}
        />
        <SidebarItem
          icon="heart"
          label="Favoritos"
          active={activeRoute === 'FavoritosCliente'}
          onPress={() => navigation.navigate('FavoritosCliente')}
        />
        <SidebarItem
          icon="notifications"
          label="Notificações"
          active={activeRoute === 'Notificacoes'}
          onPress={() => navigation.navigate('Notificacoes')}
        />
        <SidebarItem
          icon="person"
          label="Meu Perfil"
          active={activeRoute === 'Perfil'}
          onPress={() => navigation.navigate('Perfil')}
        />
      </View>

      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => auth.signOut()}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    height: '100vh',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  sidebarLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 12,
  },
  sidebarBrandName: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  sidebarContent: {
    flex: 1,
    gap: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(26, 115, 232, 0.08)',
  },
  sidebarLabel: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  sidebarLabelActive: {
    color: colors.primary,
  },
  sidebarFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  logoutText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});
