import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import colors from "./colors";
import { Ionicons } from '@expo/vector-icons';

function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "usuarios", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.log("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja realmente sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair", onPress: async () => {
          await signOut(auth);
          navigation.replace("Login");
        }
      }
    ]);
  };

  // Componente de Card para o Menu (Inspirado nas imagens)
  const MenuCard = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isProfissional = userData?.tipo === 'profissional' || userData?.perfil === 'profissional';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cabeçalho de Saudação */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Olá,</Text>
          <Text style={styles.userName}>{userData?.nomeCompleto?.split(' ')[0] || 'Usuário'} 👋</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("Perfil")}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>O que você precisa hoje?</Text>

      <View style={styles.grid}>
        {/* CARDS PARA CLIENTES */}
        {!isProfissional && (
          <>
            <MenuCard
              title="Buscar Serviços"
              icon="search"
              color={colors.primary}
              onPress={() => navigation.navigate("BuscaProfissionais")}
            />
            <MenuCard
              title="Minha Agenda"
              icon="calendar"
              color={colors.success}
              onPress={() => navigation.navigate("MeusAgendamentosCliente")}
            />
            <MenuCard
              title="Dependentes"
              icon="people"
              color="#673AB7"
              onPress={() => navigation.navigate("ListaMenores")}
            />
          </>
        )}

        {/* CARDS PARA PROFISSIONAIS */}
        {isProfissional && (
          <>
            <MenuCard
              title="Pedidos de Hoje"
              icon="list"
              color={colors.primary}
              onPress={() => navigation.navigate("AgendaProfissional")}
            />
            <MenuCard
              title="Configurar Serviços"
              icon="construct"
              color={colors.warning}
              onPress={() => navigation.navigate("ConfigurarServicos")}
            />
            <MenuCard
              title="Financeiro"
              icon="bar-chart"
              color="#E91E63"
              onPress={() => navigation.navigate("RelatoriosPro")}
            />
            <MenuCard
              title="Minha Equipe"
              icon="people-outline"
              color="#607D8B"
              onPress={() => navigation.navigate("GerenciarColaboradores")}
            />
          </>
        )}

        {/* CARDS COMUNS */}
        <MenuCard
          title="Meu Perfil"
          icon="settings-outline"
          color={colors.secondary}
          onPress={() => navigation.navigate("Perfil")}
        />
        <MenuCard
          title="Sair"
          icon="log-out-outline"
          color={colors.danger}
          onPress={handleLogout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  welcomeText: { fontSize: 16, color: colors.secondary },
  userName: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 20
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  card: {
    backgroundColor: colors.card,
    width: '48%',
    aspectRatio: 1, // Faz o card ser quadrado
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconContainer: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 10
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center'
  }
});

export default HomeScreen;