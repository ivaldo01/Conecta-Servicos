import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function PerfilScreen({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerfil = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const perfilRef = doc(db, "usuarios", user.uid);
        const perfilSnap = await getDoc(perfilRef);
        if (perfilSnap.exists()) {
          setPerfil(perfilSnap.data());
        }
      } catch (error) {
        alert("Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Header com Foto */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {perfil?.fotoPerfil ? (
            <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatar} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <Ionicons name="person" size={50} color="#AAA" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{perfil?.nome || "Seu Nome"}</Text>
        <Text style={styles.userEmail}>{perfil?.email}</Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("ConfigurarPerfil")}
        >
          <Text style={styles.editBtnText}>Editar Perfil Público</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Opções Administrativas */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Configurações da Conta</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("ConfigurarServicos")}>
          <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="cut" size={22} color="#2196F3" />
          </View>
          <Text style={styles.menuText}>Meus Serviços e Preços</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="location" size={22} color="#FF9800" />
          </View>
          <Text style={styles.menuText}>Endereço do Local</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => auth.signOut()}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="log-out" size={22} color="#F44336" />
          </View>
          <Text style={[styles.menuText, { color: '#F44336' }]}>Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>

      {/* Dados Privados (Card) */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Dados de Registro</Text>
        <Text style={styles.infoLabel}>CPF/CNPJ: <Text style={styles.infoValue}>{perfil?.cpf || perfil?.cnpj || 'Não informado'}</Text></Text>
        <Text style={styles.infoLabel}>Telefone: <Text style={styles.infoValue}>{perfil?.telefone || 'Não informado'}</Text></Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#FFF', padding: 30, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEE', marginBottom: 15, overflow: 'hidden', borderWidth: 3, borderColor: colors.primary },
  avatar: { width: '100%', height: '100%' },
  placeholderAvatar: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.textDark },
  userEmail: { fontSize: 14, color: colors.secondary, marginTop: 4 },
  editBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.primary + '15' },
  editBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },

  menuContainer: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textDark, marginBottom: 15, marginLeft: 5 },
  menuItem: { backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 15, fontWeight: '500', color: '#444' },

  infoCard: { margin: 20, padding: 20, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#EEE' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: colors.secondary, marginBottom: 10 },
  infoLabel: { fontSize: 13, color: '#999', marginBottom: 5 },
  infoValue: { color: '#333', fontWeight: '500' }
});