import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';

import { auth, db } from './src/services/firebaseConfig';
import colors from './src/constants/colors';
import { registrarPushTokenUsuario } from './src/utils/pushTokenUtils';

import LoginScreen from './src/screens/auth/LoginScreen';
import ChooseProfileScreen from './src/screens/auth/ChooseProfileScreen';
import SignUpCliente from './src/screens/auth/SignUpCliente';
import SignUpProEmpresa from './src/screens/auth/SignUpProEmpresa';
import TermosUso from './src/screens/auth/TermosUso';

import HomeScreen from './src/screens/comum/HomeScreen';
import PerfilScreen from './src/screens/comum/PerfilScreen';
import EditarPerfil from './src/screens/comum/EditarPerfil';
import LoadingScreen from './src/screens/comum/LoadingScreen';
import NotificacoesScreen from './src/screens/comum/NotificacoesScreen';

import BuscaProfissionais from './src/screens/cliente/BuscaProfissionais';
import PerfilPublicoProfissional from './src/screens/cliente/PerfilPublicoProfissional';
import AgendamentoFinal from './src/screens/cliente/AgendamentoFinal';
import MeusAgendamentosCliente from './src/screens/cliente/MeusAgendamentosCliente';
import DetalhesAgendamento from './src/screens/cliente/DetalhesAgendamento';
import AvaliarAtendimento from './src/screens/cliente/AvaliarAtendimento';
import ListaMenores from './src/screens/cliente/ListaMenores';
import CadastroMenor from './src/screens/cliente/CadastroMenor';
import EditarMenor from './src/screens/cliente/EditarMenor';
import FavoritosCliente from './src/screens/cliente/FavoritosCliente';
import PagamentoAgendamento from './src/screens/cliente/PagamentoAgendamento';

import HomeProfissional from './src/screens/profissional/HomeProfissional';
import AgendaProfissional from './src/screens/profissional/AgendaProfissional';
import ConfigurarServicos from './src/screens/profissional/ConfigurarServicos';
import ConfigurarPerfil from './src/screens/profissional/ConfigurarPerfil';
import ConfigurarAgenda from './src/screens/profissional/ConfigurarAgenda';
import GerenciarColaboradores from './src/screens/profissional/GerenciarColaboradores';
import FinanceiroPro from './src/screens/profissional/FinanceiroPro';
import RelatoriosPro from './src/screens/profissional/RelatoriosPro';
import DetalhesAgendamentoPro from './src/screens/profissional/DetalhesAgendamentoPro';

import SuporteScreen from './src/screens/comum/SuporteScreen';
import PainelAdminSuporte from './src/screens/comum/PainelAdminSuporte';
import ChatSuporteAdmin from './src/screens/comum/ChatSuporteAdmin';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configuração de Canais para Android (Sons específicos)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('suporte-admin', {
    name: 'Mensagens de Suporte (Admin)',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default', // Aqui você pode personalizar o som se tiver um arquivo local
  });

  Notifications.setNotificationChannelAsync('suporte-usuario', {
    name: 'Mensagens de Suporte',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

function normalizarTexto(value) {
  return String(value || '').trim().toLowerCase();
}

function isPerfilProfissional(dados = {}) {
  const valores = [
    dados?.tipo,
    dados?.perfil,
    dados?.role,
    dados?.tipoUsuario,
    dados?.userType,
    dados?.userRole,
    dados?.tipoConta,
    dados?.categoriaConta,
    dados?.tipoCadastroProfissional,
    dados?.perfilSelecionado,
    dados?.tipoPerfil,
    dados?.contaTipo,
  ]
    .map(normalizarTexto)
    .filter(Boolean);

  const flagsBooleanas = [
    dados?.ehProfissional === true,
    dados?.isProfessional === true,
    dados?.profissional === true,
    dados?.empresa === true,
    dados?.ehEmpresa === true,
  ];

  const temCnpj = !!String(dados?.cnpj || '').trim();
  const temNomeNegocio = !!String(dados?.nomeNegocio || dados?.nomeFantasia || '').trim();

  const palavrasProfissionais = [
    'profissional',
    'empresa',
    'autonomo',
    'autônomo',
    'prestador',
    'prestador_servico',
    'prestador de servico',
    'prestador de serviço',
    'clinica',
    'clínica',
    'colaborador',
  ];

  const batePorTexto = valores.some((valor) =>
    palavrasProfissionais.some((palavra) => valor.includes(palavra))
  );

  if (batePorTexto) return true;
  if (flagsBooleanas.some(Boolean)) return true;
  if (temCnpj) return true;
  if (temNomeNegocio && !normalizarTexto(dados?.tipo).includes('cliente')) return true;

  return false;
}

function navegarTabCliente(tabName, params = {}) {
  if (!navigationRef.isReady()) return;

  navigationRef.navigate('Main', {
    screen: 'ClienteTabs',
    params: {
      screen: tabName,
      params,
    },
  });
}

function navegarTabProfissional(tabName, params = {}) {
  if (!navigationRef.isReady()) return;

  navigationRef.navigate('Main', {
    screen: 'ProfissionalTabs',
    params: {
      screen: tabName,
      params,
    },
  });
}

function navegarPorNotificacao(data) {
  if (!data || !navigationRef.isReady()) return;

  const screen = data?.screen || '';
  const root = data?.root || '';
  const params = data?.params || {};

  if (!screen) return;

  const telasCliente = [
    'TelaInicioCliente',
    'BuscaProfissionaisTab',
    'MeusAgendamentosCliente',
    'FavoritosCliente',
    'PerfilClienteTab',
  ];

  const telasProfissional = [
    'DashboardProfissionalTab',
    'AgendaProfissionalTab',
    'ServicosProfissionalTab',
    'FinanceiroProfissionalTab',
    'PerfilProfissionalTab',
  ];

  if (root === 'ClienteTabs' || telasCliente.includes(screen)) {
    navegarTabCliente(screen, params);
    return;
  }

  if (root === 'ProfissionalTabs' || telasProfissional.includes(screen)) {
    navegarTabProfissional(screen, params);
    return;
  }

  navigationRef.navigate(screen, params);
}

function getClienteTabScreenOptions(route, insets) {
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

      if (route.name === 'TelaInicioCliente') iconName = 'home-outline';
      if (route.name === 'BuscaProfissionaisTab') iconName = 'search-outline';
      if (route.name === 'MeusAgendamentosCliente') iconName = 'calendar-outline';
      if (route.name === 'FavoritosCliente') iconName = 'heart-outline';
      if (route.name === 'PerfilClienteTab') iconName = 'person-outline';

      return <Ionicons name={iconName} size={size} color={color} />;
    },
  };
}

function getProfissionalTabScreenOptions(route, insets) {
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
      let iconName = 'briefcase-outline';

      if (route.name === 'DashboardProfissionalTab') iconName = 'grid-outline';
      if (route.name === 'AgendaProfissionalTab') iconName = 'calendar-outline';
      if (route.name === 'ServicosProfissionalTab') iconName = 'construct-outline';
      if (route.name === 'FinanceiroProfissionalTab') iconName = 'wallet-outline';
      if (route.name === 'PerfilProfissionalTab') iconName = 'person-outline';

      return <Ionicons name={iconName} size={size} color={color} />;
    },
  };
}

function ClienteTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="TelaInicioCliente"
      screenOptions={({ route }) => getClienteTabScreenOptions(route, insets)}
    >
      <Tab.Screen
        name="TelaInicioCliente"
        component={HomeScreen}
        options={{ title: 'Início' }}
      />
      <Tab.Screen
        name="BuscaProfissionaisTab"
        component={BuscaProfissionais}
        options={{ title: 'Buscar' }}
      />
      <Tab.Screen
        name="MeusAgendamentosCliente"
        component={MeusAgendamentosCliente}
        options={{ title: 'Agenda' }}
      />
      <Tab.Screen
        name="FavoritosCliente"
        component={FavoritosCliente}
        options={{ title: 'Favoritos' }}
      />
      <Tab.Screen
        name="PerfilClienteTab"
        component={PerfilScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

function ProfissionalTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="DashboardProfissionalTab"
      screenOptions={({ route }) => getProfissionalTabScreenOptions(route, insets)}
    >
      <Tab.Screen
        name="DashboardProfissionalTab"
        component={HomeProfissional}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="AgendaProfissionalTab"
        component={AgendaProfissional}
        options={{ title: 'Agenda' }}
      />
      <Tab.Screen
        name="ServicosProfissionalTab"
        component={ConfigurarServicos}
        options={{ title: 'Serviços' }}
      />
      <Tab.Screen
        name="FinanceiroProfissionalTab"
        component={FinanceiroPro}
        options={{ title: 'Financeiro' }}
      />
      <Tab.Screen
        name="PerfilProfissionalTab"
        component={PerfilScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [isProfissional, setIsProfissional] = useState(null);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user?.uid) {
      setIsProfissional(false);
      setLoadingPerfil(false);
      return;
    }

    setLoadingPerfil(true);

    const docRef = doc(db, 'usuarios', user.uid);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const dados = docSnap.data() || {};
          const profissional = isPerfilProfissional(dados);

          console.log('Perfil carregado no App:', {
            uid: user.uid,
            profissional,
            tipo: dados?.tipo,
            perfil: dados?.perfil,
            tipoUsuario: dados?.tipoUsuario,
            role: dados?.role,
            cnpj: dados?.cnpj ? 'preenchido' : 'vazio',
          });

          setIsProfissional(profissional);
        } else {
          console.log('Usuário sem documento em usuarios/, assumindo cliente.');
          setIsProfissional(false);
        }

        setLoadingPerfil(false);
      },
      (error) => {
        console.log('Erro ao acompanhar perfil do usuário:', error);
        setIsProfissional(false);
        setLoadingPerfil(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loadingPerfil || isProfissional === null) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isProfissional ? (
        <Stack.Screen name="ProfissionalTabs" component={ProfissionalTabs} />
      ) : (
        <Stack.Screen name="ClienteTabs" component={ClienteTabs} />
      )}
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const notificationListener = useRef(null);
  const responseListener = useRef(null);
  const mobileAdsStartedRef = useRef(false);

  useEffect(() => {
    const startGoogleMobileAdsSDK = async () => {
      try {
        const consentInfo = await AdsConsent.getConsentInfo();
        const canRequestAds = consentInfo?.canRequestAds;

        if (!canRequestAds || mobileAdsStartedRef.current) {
          return;
        }

        mobileAdsStartedRef.current = true;
        await mobileAds().initialize();
        console.log('Google Mobile Ads inicializado com sucesso.');
      } catch (error) {
        console.log('Erro ao iniciar Google Mobile Ads:', error);
      }
    };

    AdsConsent.gatherConsent()
      .then(startGoogleMobileAdsSDK)
      .catch((error) => {
        console.log('Erro ao coletar consentimento de anúncios:', error);
      });

    startGoogleMobileAdsSDK();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usuario) => {
      setUser(usuario);
      setLoading(false);

      if (usuario?.uid) {
        try {
          console.log('Push: Iniciando registro de token para o usuário:', usuario.uid);
          const token = await registrarPushTokenUsuario(usuario.uid);
          console.log('Push: Resultado do registro:', token ? 'Token obtido' : 'Sem token');
        } catch (error) {
          console.log('Erro ao registrar push token no App:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(() => { });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
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
      if (notificationListener.current?.remove) {
        notificationListener.current.remove();
      }

      if (responseListener.current?.remove) {
        responseListener.current.remove();
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
            <Stack.Screen name="Perfil" component={PerfilScreen} />
            <Stack.Screen name="BuscaProfissionais" component={BuscaProfissionais} />
            <Stack.Screen
              name="PerfilPublicoProfissional"
              component={PerfilPublicoProfissional}
            />
            <Stack.Screen name="AgendamentoFinal" component={AgendamentoFinal} />
            <Stack.Screen
              name="DetalhesAgendamento"
              component={DetalhesAgendamento}
            />
            <Stack.Screen
              name="PagamentoAgendamento"
              component={PagamentoAgendamento}
            />
            <Stack.Screen
              name="AvaliarAtendimento"
              component={AvaliarAtendimento}
            />
            <Stack.Screen
              name="MeusAgendamentosCliente"
              component={MeusAgendamentosCliente}
            />
            <Stack.Screen
              name="FavoritosCliente"
              component={FavoritosCliente}
            />
            <Stack.Screen
              name="DetalhesAgendamentoPro"
              component={DetalhesAgendamentoPro}
            />
            <Stack.Screen
              name="AgendaProfissional"
              component={AgendaProfissional}
            />
            <Stack.Screen
              name="ConfigurarServicos"
              component={ConfigurarServicos}
            />
            <Stack.Screen
              name="ConfigurarPerfil"
              component={ConfigurarPerfil}
            />
            <Stack.Screen
              name="ConfigurarAgenda"
              component={ConfigurarAgenda}
            />
            <Stack.Screen
              name="GerenciarColaboradores"
              component={GerenciarColaboradores}
            />
            <Stack.Screen name="FinanceiroPro" component={FinanceiroPro} />
            <Stack.Screen name="RelatoriosPro" component={RelatoriosPro} />
            <Stack.Screen name="EditarPerfil" component={EditarPerfil} />
            <Stack.Screen
              name="Notificacoes"
              component={NotificacoesScreen}
            />
            <Stack.Screen name="ListaMenores" component={ListaMenores} />
            <Stack.Screen name="CadastroMenor" component={CadastroMenor} />
            <Stack.Screen name="EditarMenor" component={EditarMenor} />
            <Stack.Screen name="Suporte" component={SuporteScreen} />
            <Stack.Screen name="PainelAdminSuporte" component={PainelAdminSuporte} />
            <Stack.Screen name="ChatSuporteAdmin" component={ChatSuporteAdmin} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}