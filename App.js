import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Importando suas telas
import ChooseProfileScreen from './ChooseProfileScreen';
import SignUpCliente from './SignUpCliente';
import SignUpProEmpresa from './SignUpProEmpresa';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import CadastroMenor from './CadastroMenor';
import ListaMenores from './ListaMenores';
import EditarMenor from './EditarMenor';
import PerfilScreen from './PerfilScreen';
import EditarPerfil from './EditarPerfil';
import ConfigurarAgenda from './ConfigurarAgenda';
import BuscaProfissionais from './BuscaProfissionais';
import PerfilProfissional from './PerfilProfissional';
import AgendamentoFinal from './AgendamentoFinal';
import TermosUso from './TermosUso';
import ConfigurarServicos from './ConfigurarServicos';
import GerenciarColaboradores from './GerenciarColaboradores';
import AgendaProfissional from './AgendaProfissional';
import MeusAgendamentosCliente from './MeusAgendamentosCliente';
import DetalhesAgendamento from './DetalhesAgendamento';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// 1. Definição das Rotas do Menu Lateral (Drawer)
function DrawerRoutes() {
  return (
    <Drawer.Navigator initialRouteName="TelaInicio">
      <Drawer.Screen
        name="TelaInicio"
        component={HomeScreen}
        options={{ title: 'Início' }}
      />

      {/* SEÇÃO DO CLIENTE */}
      <Drawer.Screen
        name="BuscaProfissionais"
        component={BuscaProfissionais}
        options={{ title: 'Mapa de Profissionais' }}
      />
      <Drawer.Screen
        name="MeusAgendamentosCliente"
        component={MeusAgendamentosCliente}
        options={{ title: 'Meus Agendamentos' }}
      />
      <Drawer.Screen
        name="ListaMenores"
        component={ListaMenores}
        options={{ title: 'Meus Dependentes' }}
      />

      {/* SEÇÃO DO PROFISSIONAL / EMPRESA */}
      <Drawer.Screen
        name="AgendaProfissional"
        component={AgendaProfissional}
        options={{ title: 'Agenda de Pedidos (Empresa)' }}
      />
      <Drawer.Screen
        name="ConfigurarServicos"
        component={ConfigurarServicos}
        options={{ title: 'Serviços e Preços' }}
      />
      <Drawer.Screen
        name="GerenciarColaboradores"
        component={GerenciarColaboradores}
        options={{ title: 'Equipe / Colaboradores' }}
      />

      {/* NOVO: Atalho para configurar a agenda geral da clínica direto no menu */}
      <Drawer.Screen
        name="ConfigurarAgendaGeral"
        component={ConfigurarAgenda}
        options={{ title: 'Minha Agenda Geral' }}
      />

      {/* CONFIGURAÇÕES GERAIS */}
      <Drawer.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: 'Meu Perfil' }}
      />
      <Drawer.Screen
        name="TermosMenu"
        component={TermosUso}
        options={{ title: 'Termos e Privacidade' }}
      />
    </Drawer.Navigator>
  );
}

// 2. Estrutura Principal do App (Navegação em Pilha)
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        {/* Telas de Acesso e Cadastro */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChooseProfile" component={ChooseProfileScreen} options={{ title: 'Escolha seu perfil' }} />
        <Stack.Screen name="SignUpCliente" component={SignUpCliente} options={{ title: 'Cadastro Cliente' }} />
        <Stack.Screen name="SignUpProEmpresa" component={SignUpProEmpresa} options={{ title: 'Cadastro Profissional' }} />

        {/* Tela de Termos (LGPD) */}
        <Stack.Screen name="TermosUso" component={TermosUso} options={{ headerShown: false }} />

        {/* Rota Principal (Após Login) - Chama o Menu Lateral */}
        <Stack.Screen name="Main" component={DrawerRoutes} options={{ headerShown: false }} />

        {/* Fluxo de Agendamento (Visão do Cliente) */}
        <Stack.Screen name="PerfilProfissional" component={PerfilProfissional} options={{ title: 'Perfil' }} />
        <Stack.Screen name="AgendamentoFinal" component={AgendamentoFinal} options={{ title: 'Finalizar' }} />

        {/* Telas de Detalhes (Visão do Profissional/Empresa) */}
        <Stack.Screen
          name="DetalhesAgendamento"
          component={DetalhesAgendamento}
          options={{ title: 'Detalhes do Agendamento' }}
        />

        {/* Telas de Edição e Configuração - Deixamos no Stack para facilitar a navegação com parâmetros */}
        <Stack.Screen name="EditarMenor" component={EditarMenor} options={{ title: 'Editar Dependente' }} />
        <Stack.Screen name="CadastroMenor" component={CadastroMenor} options={{ title: 'Cadastrar Menor' }} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfil} options={{ title: 'Editar Perfil' }} />

        {/* A tela abaixo recebe parâmetros como colaboradorId ao vir de GerenciarColaboradores */}
        <Stack.Screen name="ConfigurarAgenda" component={ConfigurarAgenda} options={{ title: 'Configurar Agenda' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}