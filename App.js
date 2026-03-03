import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

// Importando telas existentes
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
import DetalhesAgendamentoPro from './DetalhesAgendamentoPro';

// NOVAS TELAS: Relatórios e Avaliação
import RelatoriosPro from './RelatoriosPro';
import AvaliarServico from './AvaliarServico';

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
        options={{ title: 'Agenda de Pedidos' }}
      />

      {/* NOVO: Atalho para Relatórios Financeiros no Menu */}
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
      <Drawer.Screen
        name="GerenciarColaboradores"
        component={GerenciarColaboradores}
        options={{ title: 'Equipe / Colaboradores' }}
      />
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
        <Stack.Screen name="TermosUso" component={TermosUso} options={{ headerShown: false }} />

        {/* Rota Principal (Chama o Drawer) */}
        <Stack.Screen name="Main" component={DrawerRoutes} options={{ headerShown: false }} />

        {/* Fluxo de Agendamento e Avaliação */}
        <Stack.Screen name="PerfilProfissional" component={PerfilProfissional} options={{ title: 'Perfil' }} />
        <Stack.Screen name="AgendamentoFinal" component={AgendamentoFinal} options={{ title: 'Finalizar Agendamento' }} />

        {/* NOVO: Tela de Avaliação registrada no Stack */}
        <Stack.Screen name="AvaliarServico" component={AvaliarServico} options={{ title: 'Avaliar Atendimento' }} />

        {/* Telas de Detalhes */}
        <Stack.Screen name="DetalhesAgendamento" component={DetalhesAgendamento} options={{ title: 'Detalhes' }} />
        <Stack.Screen name="DetalhesAgendamentoPro" component={DetalhesAgendamentoPro} options={{ title: 'Informações do Pedido' }} />

        {/* Telas de Edição e Configuração */}
        <Stack.Screen name="EditarMenor" component={EditarMenor} options={{ title: 'Editar Dependente' }} />
        <Stack.Screen name="CadastroMenor" component={CadastroMenor} options={{ title: 'Cadastrar Menor' }} />
        <Stack.Screen name="EditarPerfil" component={EditarPerfil} options={{ title: 'Editar Perfil' }} />
        <Stack.Screen name="ConfigurarAgenda" component={ConfigurarAgenda} options={{ title: 'Configurar Agenda' }} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}