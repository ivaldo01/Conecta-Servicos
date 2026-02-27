import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importando todas as telas
import LoginScreen from './LoginScreen';
import ChooseProfileScreen from './ChooseProfileScreen';
import SignUpCliente from './SignUpCliente';
import SignUpProEmpresa from './SignUpProEmpresa'; 
import HomeScreen from './HomeScreen';
import CadastroMenor from './CadastroMenor';
import EditarMenor from './EditarMenor';
import ListaMenores from './ListaMenores';
import PerfilScreen from './PerfilScreen';
import EditarPerfil from './EditarPerfil';
import ConfigurarAgenda from './ConfigurarAgenda'; // <-- ADICIONE ESTA LINHA AQUI!
import BuscaProfissionais from './BuscaProfissionais';

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