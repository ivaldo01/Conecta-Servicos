import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Importando Telas de Acesso
import ChooseProfileScreen from './ChooseProfileScreen';
import SignUpCliente from './SignUpCliente';
import SignUpProEmpresa from './SignUpProEmpresa';
import LoginScreen from './LoginScreen';
import TermosUso from './TermosUso';

// Importando Telas Principais
import HomeScreen from './HomeScreen';
import BuscaProfissionais from './BuscaProfissionais';
import PerfilProfissional from './PerfilProfissional';
import AgendamentoFinal from './AgendamentoFinal';

// Importando Telas do Profissional
import AgendaProfissional from './AgendaProfissional';
import ConfigurarServicos from './ConfigurarServicos';
import ConfigurarPerfil from './ConfigurarPerfil';
import ConfigurarAgenda from './ConfigurarAgenda';
import GerenciarColaboradores from './GerenciarColaboradores';
import RelatoriosPro from './RelatoriosPro';
import DetalhesAgendamentoPro from './DetalhesAgendamentoPro';

// Importando Telas do Cliente
import MeusAgendamentosCliente from './MeusAgendamentosCliente';
import DetalhesAgendamento from './DetalhesAgendamento';
import AvaliarServico from './AvaliarServico';
import ListaMenores from './ListaMenores';
import CadastroMenor from './CadastroMenor';
import EditarMenor from './EditarMenor';

// Importando Telas de Perfil Geral
import PerfilScreen from './PerfilScreen';
import EditarPerfil from './EditarPerfil';

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
        options={{ title: 'Explorar Profissionais' }}
      />
      <Drawer.Screen
        name="MeusAgendamentosCliente"
        component={MeusAgendamentosCliente}
        options={{ title: 'Meus Agendamentos' }}
      />
      <Drawer.Screen
        name="ListaMenores"
        component={ListaMenores}
        options={{ title: 'Dependentes / Família' }}
      />

      {/* SEÇÃO DO PROFISSIONAL / EMPRESA */}
      <Drawer.Screen
        name="AgendaProfissional"
        component={AgendaProfissional}
        options={{ title: 'Minha Agenda de Pedidos' }}
      />
      <Drawer.Screen
        name="RelatoriosPro"
        component={RelatoriosPro}
        options={{ title: 'Financeiro / Ganhos' }}
      />
      <Drawer.Screen
        name="ConfigurarServicos"
        component={ConfigurarServicos}
        options={{ title: 'Serviços e Preços' }}
      />

      {/* ADICIONADO AQUI: Agora vai aparecer no Menu Lateral */}
      <Drawer.Screen
        name="ConfigurarAgendaGeral"
        component={ConfigurarAgenda}
        options={{ title: 'Horários de Atendimento' }}
      />

      <Drawer.Screen
        name="GerenciarColaboradores"
        component={GerenciarColaboradores}
        options={{ title: 'Equipe / Colaboradores' }}
      />

      {/* CONFIGURAÇÕES E PERFIL */}
      <Drawer.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: 'Meu Painel / Perfil' }}
      />
      <Drawer.Screen
        name="TermosMenu"
        component={TermosUso}
        options={{ title: 'Termos e Privacidade' }}
      />
    </Drawer.Navigator>
  );
}

// 2. Estrutura Principal de Navegação (Stack)
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ChooseProfile" component={ChooseProfileScreen} options={{ title: 'Tipo de Conta' }} />
        <Stack.Screen name="SignUpCliente" component={SignUpCliente} options={{ title: 'Cadastro Cliente' }} />
        <Stack.Screen name="SignUpProEmpresa" component={SignUpProEmpresa} options={{ title: 'Cadastro Profissional' }} />
        <Stack.Screen name="TermosUso" component={TermosUso} options={{ headerShown: false }} />

        <Stack.Screen name="Main" component={DrawerRoutes} options={{ headerShown: false }} />

        <Stack.Screen name="PerfilProfissional" component={PerfilProfissional} options={{ title: 'Perfil do Profissional' }} />
        <Stack.Screen name="AgendamentoFinal" component={AgendamentoFinal} options={{ title: 'Confirmar Agendamento' }} />
        <Stack.Screen name="AvaliarServico" component={AvaliarServico} options={{ title: 'Avaliar Atendimento' }} />

        <Stack.Screen name="DetalhesAgendamento" component={DetalhesAgendamento} options={{ title: 'Detalhes' }} />
        <Stack.Screen name="DetalhesAgendamentoPro" component={DetalhesAgendamentoPro} options={{ title: 'Informações do Pedido' }} />

        <Stack.Screen name="ConfigurarPerfil" component={ConfigurarPerfil} options={{ title: 'Editar Perfil Público' }} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfil} options={{ title: 'Dados Cadastrais' }} />

        {/* Mantive aqui também para navegação interna entre telas */}
        <Stack.Screen name="ConfigurarAgenda" component={ConfigurarAgenda} options={{ title: 'Horários de Atendimento' }} />

        <Stack.Screen name="CadastroMenor" component={CadastroMenor} options={{ title: 'Cadastrar Dependente' }} />
        <Stack.Screen name="EditarMenor" component={EditarMenor} options={{ title: 'Editar Dependente' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}