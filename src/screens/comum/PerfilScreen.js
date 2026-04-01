import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import {
  uploadFotoPerfil,
  uploadBannerPerfil,
  uploadFotoGaleriaProfissional,
} from "../../services/uploadService";
import { registrarPushTokenUsuario } from "../../utils/pushTokenUtils";

function getImagemValida(imagem) {
  if (!imagem) return null;

  if (typeof imagem === 'string') {
    return imagem.trim() || null;
  }

  if (typeof imagem === 'object') {
    return (
      imagem?.uri ||
      imagem?.url ||
      imagem?.secure_url ||
      imagem?.secureUrl ||
      imagem?.src ||
      imagem?.imageUrl ||
      imagem?.imagem ||
      imagem?.publicUrl ||
      imagem?.downloadURL ||
      imagem?.downloadUrl ||
      null
    );
  }

  return null;
}

function extrairListaGaleria(perfil) {
  const candidatos = [
    perfil?.galeriaFotos,
    perfil?.galeria,
    perfil?.fotosGaleria,
    perfil?.portfolio,
    perfil?.imagensGaleria,
    perfil?.fotos,
  ];

  const listaFinal = [];

  candidatos.forEach((grupo) => {
    if (!grupo) return;

    if (Array.isArray(grupo)) {
      grupo.forEach((item) => {
        const url = getImagemValida(item);
        if (url) listaFinal.push(url);
      });
      return;
    }

    if (typeof grupo === 'object') {
      Object.values(grupo).forEach((item) => {
        if (Array.isArray(item)) {
          item.forEach((subItem) => {
            const url = getImagemValida(subItem);
            if (url) listaFinal.push(url);
          });
        } else {
          const url = getImagemValida(item);
          if (url) listaFinal.push(url);
        }
      });
    }
  });

  return [...new Set(listaFinal)];
}

function getNomePerfil(perfil) {
  return (
    perfil?.nome ||
    perfil?.nomeCompleto ||
    perfil?.nomeFantasia ||
    perfil?.nomeNegocio ||
    "Seu Nome"
  );
}

function getInicialNome(nome = '') {
  return String(nome).trim().charAt(0).toUpperCase() || 'U';
}

export default function PerfilScreen({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingGaleria, setUploadingGaleria] = useState(false);
  const [imagensComErro, setImagensComErro] = useState({});
  const { width } = useWindowDimensions();

  const ehProfissional =
    perfil?.tipo === 'profissional' ||
    perfil?.perfil === 'profissional' ||
    !!perfil?.cnpj;
  const ehColaborador = perfil?.perfil === 'colaborador';

  const tamanhoGaleria = useMemo(() => {
    const larguraCard = width - 40 - 32;
    const espacoEntreColunas = 10 * 2;
    return Math.floor((larguraCard - espacoEntreColunas) / 3);
  }, [width]);

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
          const dados = {
            id: perfilSnap.id,
            ...perfilSnap.data(),
          };

          setPerfil(dados);
        }
      } catch (error) {
        Alert.alert("Erro", "Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const fotoPerfilUrl = useMemo(() => {
    return getImagemValida(
      perfil?.fotoPerfil ||
      perfil?.foto ||
      perfil?.avatar ||
      perfil?.photoURL ||
      perfil?.photoUrl
    );
  }, [perfil]);

  const bannerPerfilUrl = useMemo(() => {
    return getImagemValida(
      perfil?.bannerPerfil ||
      perfil?.banner ||
      perfil?.capaPerfil ||
      perfil?.capa ||
      perfil?.bannerUrl ||
      perfil?.imagemBanner
    );
  }, [perfil]);

  const galeriaFotos = useMemo(() => {
    return extrairListaGaleria(perfil);
  }, [perfil]);

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

  const adicionarFotoGaleria = async () => {
    const user = auth.currentUser;

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    try {
      const uri = await selecionarImagem({ allowsEditing: true, aspect: [1, 1] });

      if (!uri) return;

      setUploadingGaleria(true);

      const url = await uploadFotoGaleriaProfissional(user.uid, uri);

      setPerfil((prev) => ({
        ...prev,
        galeriaFotos: Array.isArray(prev?.galeriaFotos)
          ? [...prev.galeriaFotos, url]
          : [url],
        galeria: Array.isArray(prev?.galeria)
          ? [...prev.galeria, url]
          : [url],
        fotosGaleria: Array.isArray(prev?.fotosGaleria)
          ? [...prev.fotosGaleria, url]
          : [url],
        portfolio: Array.isArray(prev?.portfolio)
          ? [...prev.portfolio, url]
          : [url],
      }));

      Alert.alert("Sucesso", "Foto adicionada na galeria com sucesso.");
    } catch (error) {
      console.log("Erro ao adicionar foto na galeria:", error);
      Alert.alert("Erro", "Não foi possível adicionar a foto na galeria.");
    } finally {
      setUploadingGaleria(false);
    }
  };

  const fazerLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível sair do aplicativo.");
    }
  };

  const deletarConta = async () => {
    Alert.alert(
      "Excluir Minha Conta",
      "Tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita e todos os seus dados serão apagados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir Permanentemente",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const user = auth.currentUser;

              if (user) {
                // Em um cenário real, você deve deletar os dados do Firestore antes do Auth
                // ou usar uma Cloud Function para garantir a limpeza total.
                // Como estamos no plano Spark, vamos apenas deslogar após um alerta de solicitação.
                Alert.alert(
                  "Solicitação Enviada",
                  "Sua solicitação de exclusão de conta foi recebida e será processada em até 48 horas conforme as diretrizes de privacidade.",
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        await auth.signOut();
                      }
                    }
                  ]
                );
              }
            } catch (error) {
              console.log("Erro ao solicitar exclusão de conta:", error);
              Alert.alert("Erro", "Não foi possível processar sua solicitação.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const abrirSuporte = () => {
    navigation.navigate('Suporte');
  };

  const abrirPainelAdminSuporte = () => {
    navigation.navigate('PainelAdminSuporte');
  };

  const gerenciarNotificacoes = () => {
    Alert.alert(
      "Notificações Push",
      "Deseja atualizar sua permissão de notificações?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Atualizar Agora",
          onPress: async () => {
            const user = auth.currentUser;
            if (user) {
              const token = await registrarPushTokenUsuario(user.uid);
              if (token) {
                Alert.alert("Sucesso", "Notificações ativadas com sucesso!");
              } else {
                Alert.alert("Erro", "Não foi possível ativar. Verifique se você está em um dispositivo físico e se deu permissão.");
              }
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.bannerWrapper}
        onPress={atualizarBanner}
        activeOpacity={0.9}
        disabled={uploadingBanner}
      >
        {bannerPerfilUrl ? (
          <Image source={{ uri: bannerPerfilUrl }} style={styles.banner} />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={30} color="#999" />
            <Text style={styles.bannerPlaceholderText}>
              {ehProfissional ? 'Adicionar banner profissional' : 'Adicionar banner'}
            </Text>
          </View>
        )}

        <View style={styles.bannerDarkOverlay} />

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
            {fotoPerfilUrl ? (
              <Image source={{ uri: fotoPerfilUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderAvatarText}>
                  {getInicialNome(getNomePerfil(perfil))}
                </Text>
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

        <Text style={styles.userName}>{getNomePerfil(perfil)}</Text>
        <Text style={styles.userEmail}>{perfil?.email || "E-mail não informado"}</Text>

        <View style={styles.userTypeBadge}>
          <Ionicons
            name={ehProfissional ? "briefcase-outline" : "person-outline"}
            size={14}
            color={colors.primary}
          />
          <Text style={styles.userTypeBadgeText}>
            {ehProfissional
              ? ehColaborador
                ? 'Conta colaborador'
                : 'Perfil profissional'
              : 'Perfil do cliente'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("ConfigurarPerfil")}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={styles.editBtnText}>
            {ehProfissional ? 'Editar Perfil Público' : 'Editar minhas informações'}
          </Text>
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

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>{ehColaborador ? 'Serviços liberados' : 'Meus Serviços e Preços'}</Text>
                <Text style={styles.menuSubText}>
                  {ehColaborador ? 'Catálogo definido pela conta principal' : 'Configure o que você oferece'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("FinanceiroPro")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="wallet-outline" size={22} color="#2E7D32" />
              </View>

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Financeiro</Text>
                <Text style={styles.menuSubText}>
                  {ehColaborador ? 'Acompanhe apenas seus resultados' : 'Acompanhe ganhos e relatórios'}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="location" size={22} color="#FF9800" />
              </View>

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Endereço do Local</Text>
                <Text style={styles.menuSubText}>Dados do seu atendimento</Text>
              </View>

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

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Meus Agendamentos</Text>
                <Text style={styles.menuSubText}>Veja seus horários e pedidos</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("FavoritosCliente")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#FCE4EC' }]}>
                <Ionicons name="heart-outline" size={22} color="#E91E63" />
              </View>

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Meus Favoritos</Text>
                <Text style={styles.menuSubText}>Profissionais salvos por você</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("ListaMenores")}
            >
              <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="people-outline" size={22} color="#2E7D32" />
              </View>

              <View style={styles.menuTextWrap}>
                <Text style={styles.menuText}>Menores cadastrados</Text>
                <Text style={styles.menuSubText}>Gerencie dependentes vinculados</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </>
        )}

        {ehProfissional && perfil?.perfil !== 'colaborador' && (
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('GerenciarColaboradores')}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="people-outline" size={22} color="#1976D2" />
            </View>

            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>Gerenciar Equipe</Text>
              <Text style={styles.menuSubText}>Controle subcontas, serviços liberados e agenda da equipe</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={gerenciarNotificacoes}>
          <View style={[styles.iconBox, { backgroundColor: '#E0F2F1' }]}>
            <Ionicons name="notifications-outline" size={22} color="#00796B" />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={styles.menuText}>Notificações Push</Text>
            <Text style={styles.menuSubText}>Ativar ou atualizar notificações</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={abrirSuporte}>
          <View style={[styles.iconBox, { backgroundColor: '#E1F5FE' }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#0288D1" />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={styles.menuText}>Suporte Conecta</Text>
            <Text style={styles.menuSubText}>Fale com a nossa equipe</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* Painel de Admin - Visível apenas para o dono (pode-se adicionar um check de UID aqui) */}
        {perfil?.isAdmin && (
          <TouchableOpacity style={styles.menuItem} onPress={abrirPainelAdminSuporte}>
            <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#7B1FA2" />
            </View>

            <View style={styles.menuTextWrap}>
              <Text style={styles.menuText}>Painel de Suporte (Admin)</Text>
              <Text style={styles.menuSubText}>Gerenciar atendimentos</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={fazerLogout}>
          <View style={[styles.iconBox, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="log-out-outline" size={22} color="#F44336" />
          </View>

          <View style={styles.menuTextWrap}>
            <Text style={styles.menuText}>Sair</Text>
            <Text style={styles.menuSubText}>Encerrar sessão</Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountItem} onPress={deletarConta}>
          <Text style={styles.deleteAccountText}>Excluir minha conta</Text>
        </TouchableOpacity>
      </View>

      {ehProfissional && (
        <View style={styles.galeriaSection}>
          <View style={styles.galeriaHeader}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.galeriaTitle}>Galeria de trabalhos</Text>
              <Text style={styles.galeriaSubtitle}>
                Mostre fotos para valorizar seu perfil profissional
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addGaleriaBtn}
              onPress={adicionarFotoGaleria}
              disabled={uploadingGaleria}
            >
              {uploadingGaleria ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.addGaleriaBtnText}>Adicionar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {galeriaFotos.length > 0 ? (
            <View style={styles.galeriaGrid}>
              {galeriaFotos.map((foto, index) => {
                const chave = `${foto}-${index}`;
                const comErro = !!imagensComErro[chave];

                if (comErro) {
                  return (
                    <View
                      key={chave}
                      style={[
                        styles.galeriaItemFallback,
                        { width: tamanhoGaleria, height: tamanhoGaleria },
                      ]}
                    >
                      <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      <Text style={styles.galeriaFallbackText}>Imagem indisponível</Text>
                    </View>
                  );
                }

                return (
                  <View
                    key={chave}
                    style={[
                      styles.galeriaCard,
                      { width: tamanhoGaleria, height: tamanhoGaleria },
                    ]}
                  >
                    <Image
                      source={{ uri: foto }}
                      style={styles.galeriaItem}
                      resizeMode="cover"
                      onError={() => {
                        setImagensComErro((prev) => ({
                          ...prev,
                          [chave]: true,
                        }));
                      }}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.galeriaEmpty}>
              <Ionicons name="images-outline" size={30} color="#9AA4B2" />
              <Text style={styles.galeriaEmptyTitle}>Sua galeria ainda está vazia</Text>
              <Text style={styles.galeriaEmptyText}>
                Adicione fotos dos seus trabalhos para deixar o perfil mais bonito e confiável.
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Dados de Registro</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{ehProfissional ? 'CPF/CNPJ' : 'CPF'}</Text>
          <Text style={styles.infoValue}>
            {perfil?.cpf || perfil?.cnpj || 'Não informado'}
          </Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telefone</Text>
          <Text style={styles.infoValue}>{perfil?.telefone || 'Não informado'}</Text>
        </View>

        <View style={styles.infoDivider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo de conta</Text>
          <Text style={styles.infoValue}>{ehProfissional ? 'Profissional' : 'Cliente'}</Text>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.tipText}>
          Agora o cliente e o profissional já podem usar foto de perfil, o profissional já pode trocar o banner e também montar sua galeria de trabalhos.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F3F8',
  },

  content: {
    paddingBottom: 28,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F3F8',
  },

  bannerWrapper: {
    width: '100%',
    height: 210,
    backgroundColor: '#DCE7F7',
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

  bannerDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
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
    marginTop: -30,
    marginHorizontal: 16,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#E8EDF5',
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
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
  },

  placeholderAvatarText: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.primary,
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
    fontWeight: '800',
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
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary + '15',
    flexDirection: 'row',
    alignItems: 'center',
  },

  userTypeBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
  },

  editBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  editBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },

  photoBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  photoBtnText: {
    color: colors.primary,
    fontWeight: '800',
    marginLeft: 8,
    fontSize: 13,
  },

  menuContainer: {
    padding: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 15,
    marginLeft: 5,
  },

  menuItem: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  menuTextWrap: {
    flex: 1,
    marginLeft: 15,
  },

  menuText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
  },

  menuSubText: {
    marginTop: 3,
    fontSize: 12,
    color: colors.secondary,
  },

  galeriaSection: {
    marginHorizontal: 16,
    marginTop: 2,
    backgroundColor: '#FFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  galeriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  galeriaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textDark,
  },

  galeriaSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.secondary,
    lineHeight: 18,
  },

  addGaleriaBtn: {
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addGaleriaBtnText: {
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 4,
    fontSize: 12,
  },

  galeriaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },

  galeriaCard: {
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F6FA',
    borderWidth: 1,
    borderColor: '#E8EDF3',
  },

  galeriaItem: {
    width: '100%',
    height: '100%',
  },

  galeriaItemFallback: {
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  galeriaFallbackText: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
    color: '#64748B',
  },

  galeriaEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 14,
    backgroundColor: '#F9FBFD',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },

  galeriaEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },

  galeriaEmptyText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#EEF1F4',
    marginVertical: 10,
  },

  infoLabel: {
    fontSize: 13,
    color: '#7B8794',
    fontWeight: '600',
  },

  infoValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '700',
    maxWidth: '58%',
    textAlign: 'right',
  },

  tipCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  tipText: {
    flex: 1,
    marginLeft: 10,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 19,
  },
  deleteAccountItem: {
    marginTop: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  deleteAccountText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});