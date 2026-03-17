import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { uploadFotoPerfil, uploadBannerPerfil } from "../../services/uploadService";

export default function PerfilScreen({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const ehProfissional =
    perfil?.tipo === 'profissional' ||
    perfil?.perfil === 'profissional' ||
    !!perfil?.cnpj;

  useEffect(() => {
    const fetchPerfil = async () => {
      const user = auth.currentUser;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const perfilRef = doc(db, "usuarios", user.uid);
        const perfilSnap = await getDoc(perfilRef);

        if (perfilSnap.exists()) {
          setPerfil({
            id: perfilSnap.id,
            ...perfilSnap.data(),
          });
        }
      } catch (error) {
        Alert.alert("Erro", "Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const pedirPermissaoGaleria = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      Alert.alert(
        "Permissão necessária",
        "Você precisa permitir acesso à galeria para escolher imagens."
      );
      return false;
    }

    return true;
  };

  const selecionarImagem = async ({ allowsEditing = true, aspect = [1, 1] } = {}) => {
    const permitido = await pedirPermissaoGaleria();
    if (!permitido) return null;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing,
      aspect,
      quality: 0.7,
    });

    if (resultado.canceled) return null;

    return resultado.assets?.[0]?.uri || null;
  };

  const atualizarFotoPerfil = async () => {
    const user = auth.currentUser;

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    try {
      const uri = await selecionarImagem({ allowsEditing: true, aspect: [1, 1] });

      if (!uri) return;

      setUploadingFoto(true);

      const url = await uploadFotoPerfil(user.uid, uri);

      setPerfil((prev) => ({
        ...prev,
        fotoPerfil: url,
      }));

      Alert.alert("Sucesso", "Foto de perfil atualizada com sucesso.");
    } catch (error) {
      console.log("Erro ao atualizar foto de perfil:", error);
      Alert.alert("Erro", "Não foi possível atualizar a foto de perfil.");
    } finally {
      setUploadingFoto(false);
    }
  };

  const atualizarBanner = async () => {
    const user = auth.currentUser;

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    try {
      const uri = await selecionarImagem({ allowsEditing: true, aspect: [16, 7] });

      if (!uri) return;

      setUploadingBanner(true);

      const url = await uploadBannerPerfil(user.uid, uri);

      setPerfil((prev) => ({
        ...prev,
        bannerPerfil: url,
      }));

      Alert.alert("Sucesso", "Banner atualizado com sucesso.");
    } catch (error) {
      console.log("Erro ao atualizar banner:", error);
      Alert.alert("Erro", "Não foi possível atualizar o banner.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const fazerLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível sair do aplicativo.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.bannerWrapper}
        onPress={atualizarBanner}
        activeOpacity={0.9}
        disabled={uploadingBanner}
      >
        {perfil?.bannerPerfil ? (
          <Image source={{ uri: perfil.bannerPerfil }} style={styles.banner} />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={28} color="#999" />
            <Text style={styles.bannerPlaceholderText}>
              {ehProfissional ? 'Adicionar banner profissional' : 'Adicionar banner'}
            </Text>
          </View>
        )}

        <View style={styles.bannerOverlay}>
          <View style={styles.bannerBadge}>
            {uploadingBanner ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={15} color="#FFF" />
                <Text style={styles.bannerBadgeText}>Trocar banner</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarOuter}
          onPress={atualizarFotoPerfil}
          activeOpacity={0.9}
          disabled={uploadingFoto}
        >
          <View style={styles.avatarContainer}>
            {perfil?.fotoPerfil ? (
              <Image source={{ uri: perfil.fotoPerfil }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Ionicons name="person" size={50} color="#AAA" />
              </View>
            )}

            <View style={styles.cameraBadge}>
              {uploadingFoto ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </View>
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>{perfil?.nome || "Seu Nome"}</Text>
        <Text style={styles.userEmail}>{perfil?.email || "E-mail não informado"}</Text>

        <Text style={styles.userTypeBadge}>
          {ehProfissional ? "Perfil profissional" : "Perfil do cliente"}
        </Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("ConfigurarPerfil")}
        >
          <Text style={styles.editBtnText}>Editar Perfil Público</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.photoBtn}
          onPress={atualizarFotoPerfil}
          disabled={uploadingFoto}
        >
          <Ionicons name="image-outline" size={18} color={colors.primary} />
          <Text style={styles.photoBtnText}>
            {uploadingFoto ? "Enviando foto..." : "Trocar foto de perfil"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Configurações da Conta</Text>

        {ehProfissional ? (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ConfigurarServicos")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="cut" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Meus Serviços e Preços</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("FinanceiroPro")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="wallet-outline" size={22} color="#2E7D32" />
              </View>
              <Text style={styles.menuText}>Financeiro</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="location" size={22} color="#FF9800" />
              </View>
              <Text style={styles.menuText}>Endereço do Local</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("MeusAgendamentosCliente")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="calendar-outline" size={22} color="#2196F3" />
              </View>
              <Text style={styles.menuText}>Meus Agendamentos</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("FavoritosCliente")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="heart-outline" size={22} color="#E91E63" />
              </View>
              <Text style={styles.menuText}>Meus Favoritos</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ListaMenores")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="people-outline" size={22} color="#2E7D32" />
              </View>
              <Text style={styles.menuText}>Menores cadastrados</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={fazerLogout}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="log-out-outline" size={22} color="#F44336" />
          </View>
          <Text style={[styles.menuText, { color: '#F44336' }]}>Sair do Aplicativo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Dados de Registro</Text>

        <Text style={styles.infoLabel}>
          {ehProfissional ? 'CPF/CNPJ: ' : 'CPF: '}
          <Text style={styles.infoValue}>
            {perfil?.cpf || perfil?.cnpj || 'Não informado'}
          </Text>
        </Text>

        <Text style={styles.infoLabel}>
          Telefone: <Text style={styles.infoValue}>{perfil?.telefone || 'Não informado'}</Text>
        </Text>

        <Text style={styles.infoLabel}>
          Tipo de conta: <Text style={styles.infoValue}>{ehProfissional ? 'Profissional' : 'Cliente'}</Text>
        </Text>
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.tipText}>
          Agora o cliente e o profissional já podem usar foto de perfil, e o profissional já pode trocar o banner. O próximo passo será a galeria de trabalhos.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  content: {
    paddingBottom: 28,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },

  bannerWrapper: {
    width: '100%',
    height: 170,
    backgroundColor: '#EAEAEA',
    position: 'relative',
  },

  banner: {
    width: '100%',
    height: '100%',
  },

  bannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ECEFF3',
  },

  bannerPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
  },

  bannerOverlay: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },

  bannerBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bannerBadgeText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },

  header: {
    backgroundColor: '#FFF',
    marginTop: -24,
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 26,
    alignItems: 'center',
    borderRadius: 24,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },

  avatarOuter: {
    marginTop: -58,
    marginBottom: 14,
  },

  avatarContainer: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#EEE',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  avatar: {
    width: '100%',
    height: '100%',
  },

  placeholderAvatar: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },

  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textDark,
    textAlign: 'center',
  },

  userEmail: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 5,
    textAlign: 'center',
  },

  userTypeBadge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },

  editBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
  },

  editBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },

  photoBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E7ECF3',
  },

  photoBtnText: {
    color: colors.primary,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 13,
  },

  menuContainer: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 15,
    marginLeft: 5,
  },

  menuItem: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EEF1F4',
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 2,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEE',
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
  },

  infoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 7,
  },

  infoValue: {
    color: '#333',
    fontWeight: '500',
  },

  tipCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  tipText: {
    flex: 1,
    marginLeft: 10,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 19,
  },
});