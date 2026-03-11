import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importando todas as telas
import LoginScreen from './src/screens/auth/LoginScreen';
import ChooseProfileScreen from './src/screens/auth/ChooseProfileScreen';
import SignUpCliente from './src/screens/auth/SignUpCliente';
import SignUpProEmpresa from './src/screens/auth/SignUpProEmpresa';
import HomeScreen from './src/screens/comum/HomeScreen';
import CadastroMenor from './src/screens/cliente/CadastroMenor';
import EditarMenor from './src/screens/cliente/EditarMenor';
import ListaMenores from './src/screens/cliente/ListaMenores';
import PerfilScreen from './src/screens/comum/PerfilScreen';
import EditarPerfil from './src/screens/comum/EditarPerfil';
import ConfigurarAgenda from './src/screens/profissional/ConfigurarAgenda';
import BuscaProfissionais from './src/screens/cliente/BuscaProfissionais';

const Stack = createStackNavigator();

function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#2196F3' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
        <Stack.Screen name="ChooseProfile" component={ChooseProfileScreen} options={{ title: "Escolher Perfil" }} />
        <Stack.Screen name="SignUpCliente" component={SignUpCliente} options={{ title: "Cadastro de Cliente" }} />
        <Stack.Screen name="SignUpProEmpresa" component={SignUpProEmpresa} options={{ title: "Cadastro Profissional / Empresa" }} />
        <Stack.Screen name="ConfigurarAgenda" component={ConfigurarAgenda} options={{ title: 'Minha Agenda' }} />
        <Stack.Screen name="BuscaProfissionais" component={BuscaProfissionais} options={{ title: 'Profissionais Próximos' }} />

        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Início" }} />
        <Stack.Screen name="ListaMenores" component={ListaMenores} options={{ title: "Meus Menores" }} />
        <Stack.Screen name="CadastroMenor" component={CadastroMenor} options={{ title: "Cadastrar Novo Menor" }} />
        <Stack.Screen name="EditarMenor" component={EditarMenor} options={{ title: "Editar Dados" }} />
        <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: "Meu Perfil" }} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfil} options={{ title: "Editar Meu Perfil" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;