import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { auth, db } from './src/services/firebaseConfig';
import colors from './src/constants/colors';
import { registrarPushTokenUsuario } from './src/utils/pushTokenUtils';

/* TELAS AUTH */

import LoginScreen from './src/screens/auth/LoginScreen';
import ChooseProfileScreen from './src/screens/auth/ChooseProfileScreen';
import SignUpCliente from './src/screens/auth/SignUpCliente';
import SignUpProEmpresa from './src/screens/auth/SignUpProEmpresa';
import TermosUso from './src/screens/auth/TermosUso';

/* TELAS COMUNS */

import HomeScreen from './src/screens/comum/HomeScreen';
import PerfilScreen from './src/screens/comum/PerfilScreen';
import EditarPerfil from './src/screens/comum/EditarPerfil';
import LoadingScreen from './src/screens/comum/LoadingScreen';
import NotificacoesScreen from './src/screens/comum/NotificacoesScreen';

/* TELAS CLIENTE */

import BuscaProfissionais from './src/screens/cliente/BuscaProfissionais';
import PerfilProfissional from './src/screens/cliente/PerfilProfissional';
import AgendamentoFinal from './src/screens/cliente/AgendamentoFinal';
import MeusAgendamentosCliente from './src/screens/cliente/MeusAgendamentosCliente';
import DetalhesAgendamento from './src/screens/cliente/DetalhesAgendamento';
import AvaliarAtendimento from './src/screens/cliente/AvaliarAtendimento';
import ListaMenores from './src/screens/cliente/ListaMenores';
import CadastroMenor from './src/screens/cliente/CadastroMenor';
import EditarMenor from './src/screens/cliente/EditarMenor';
import FavoritosCliente from './src/screens/cliente/FavoritosCliente';

/* TELAS PROFISSIONAL */

import AgendaProfissional from './src/screens/profissional/AgendaProfissional';
import ConfigurarServicos from './src/screens/profissional/ConfigurarServicos';
import ConfigurarPerfil from './src/screens/profissional/ConfigurarPerfil';
import ConfigurarAgenda from './src/screens/profissional/ConfigurarAgenda';
import GerenciarColaboradores from './src/screens/profissional/GerenciarColaboradores';
import RelatoriosPro from './src/screens/profissional/RelatoriosPro';
import DetalhesAgendamentoPro from './src/screens/profissional/DetalhesAgendamentoPro';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

function navegarPorNotificacao(data) {
  if (!data || !navigationRef.isReady()) return;

  const screen = data?.screen || '';
  const root = data?.root || '';
  const params = data?.params || {};

  if (root === 'Main' && screen) {
    navigationRef.navigate('Main', {
      screen,
      params,
    });
    return;
  }

  if (screen) {
    navigationRef.navigate(screen, params);
  }
}

function getTabScreenOptions(route, insets) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: '#8E8E93',
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      height: 60 + insets.bottom,
      paddingBottom: insets.bottom,
      backgroundColor: '#fff',
    },
    tabBarIcon: ({ color, size }) => {
      let iconName = 'home-outline';

      if (route.name === 'TelaInicio') iconName = 'home-outline';
      if (route.name === 'BuscaProfissionais') iconName = 'search-outline';
      if (route.name === 'MeusAgendamentosCliente') iconName = 'calendar-outline';
      if (route.name === 'FavoritosCliente') iconName = 'heart-outline';
      if (route.name === 'Perfil') iconName = 'person-outline';

      if (route.name === 'AgendaProfissional') iconName = 'calendar-outline';
      if (route.name === 'ConfigurarServicos') iconName = 'construct-outline';
      if (route.name === 'RelatoriosPro') iconName = 'bar-chart-outline';

      return <Ionicons name={iconName} size={size} color={color} />;
    },
  };
}

/* TABS CLIENTE */

function ClienteTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator screenOptions={({ route }) => getTabScreenOptions(route, insets)}>
      <Tab.Screen name="TelaInicio" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="BuscaProfissionais" component={BuscaProfissionais} options={{ title: 'Buscar' }} />
      <Tab.Screen name="MeusAgendamentosCliente" component={MeusAgendamentosCliente} options={{ title: 'Agenda' }} />
      <Tab.Screen name="FavoritosCliente" component={FavoritosCliente} options={{ title: 'Favoritos' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

/* TABS PROFISSIONAL */

function ProfissionalTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator screenOptions={({ route }) => getTabScreenOptions(route, insets)}>
      <Tab.Screen name="TelaInicio" component={HomeScreen} options={{ title: 'Início' }} />
      <Tab.Screen name="AgendaProfissional" component={AgendaProfissional} options={{ title: 'Agenda' }} />
      <Tab.Screen name="ConfigurarServicos" component={ConfigurarServicos} options={{ title: 'Serviços' }} />
      <Tab.Screen name="RelatoriosPro" component={RelatoriosPro} options={{ title: 'Financeiro' }} />
      <Tab.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

/* DEFINE TIPO DE USUARIO */

function MainTabs() {
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [isProfissional, setIsProfissional] = useState(false);

  useEffect(() => {
    async function carregarPerfil() {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data();

          const profissional =
            dados?.tipo === 'profissional' ||
            dados?.perfil === 'profissional';

          setIsProfissional(profissional);
        }
      } catch (error) {
        console.log('Erro ao carregar perfil do usuário:', error);
      } finally {
        setLoadingPerfil(false);
      }
    }

    carregarPerfil();
  }, []);

  if (loadingPerfil) return <LoadingScreen />;

  return isProfissional ? <ProfissionalTabs /> : <ClienteTabs />;
}

/* NAVEGADOR PRINCIPAL */

function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);
      setLoading(false);

      if (usuario?.uid) {
        try {
          await registrarPushTokenUsuario(usuario.uid);
        } catch (error) {
          console.log('Erro ao registrar push token no App:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => { });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      navegarPorNotificacao(data);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response?.notification?.request?.content?.data || {};
        navegarPorNotificacao(data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }

      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ChooseProfile" component={ChooseProfileScreen} />
            <Stack.Screen name="SignUpCliente" component={SignUpCliente} />
            <Stack.Screen name="SignUpProEmpresa" component={SignUpProEmpresa} />
            <Stack.Screen name="TermosUso" component={TermosUso} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />

            <Stack.Screen name="PerfilProfissional" component={PerfilProfissional} />
            <Stack.Screen name="AgendamentoFinal" component={AgendamentoFinal} />

            <Stack.Screen name="DetalhesAgendamento" component={DetalhesAgendamento} />
            <Stack.Screen name="AvaliarAtendimento" component={AvaliarAtendimento} />

            <Stack.Screen name="DetalhesAgendamentoPro" component={DetalhesAgendamentoPro} />

            <Stack.Screen name="EditarPerfil" component={EditarPerfil} />

            <Stack.Screen name="ConfigurarPerfil" component={ConfigurarPerfil} />
            <Stack.Screen name="ConfigurarAgenda" component={ConfigurarAgenda} />
            <Stack.Screen name="GerenciarColaboradores" component={GerenciarColaboradores} />

            <Stack.Screen name="ListaMenores" component={ListaMenores} />
            <Stack.Screen name="CadastroMenor" component={CadastroMenor} />
            <Stack.Screen name="EditarMenor" component={EditarMenor} />

            <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* APP */

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}