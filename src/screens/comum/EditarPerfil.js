import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import Sidebar from '../../components/Sidebar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { validarCPF, validarCNPJ, validarTelefone, verificarDadosDuplicados } from "../../utils/validators";

function EditarPerfil({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const { width: windowWidth } = useWindowDimensions();
  const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

  const whatsappRef = useRef(null);
  const cpfRef = useRef(null);
  const cnpjRef = useRef(null);
  const enderecoRef = useRef(null);
  const bioRef = useRef(null);

  useEffect(() => {
    const fetchPerfil = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const perfilRef = doc(db, "usuarios", user.uid);
        const perfilSnap = await getDoc(perfilRef);

        if (perfilSnap.exists()) {
          const data = perfilSnap.data();
          if (!data.endereco && data.localizacao) {
             const loc = data.localizacao;
             data.endereco = [loc.endereco || loc.logradouro, loc.cidade, loc.estado].filter(Boolean).join(', ');
          }
          setPerfil(data);
        }
      } catch (error) {
        Alert.alert("Erro", "Erro ao carregar perfil: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, []);

  const handleUpdate = async () => {
    const user = auth.currentUser;
    if (!user || !perfil) return;

    Keyboard.dismiss();

    const telefoneParaValidar = perfil.telefone || perfil.whatsapp || '';
    if (telefoneParaValidar && !validarTelefone(telefoneParaValidar)) {
      Alert.alert("Telefone Inválido", "Informe um telefone válido com DDD e 9 dígitos.");
      return;
    }

    const cleanCpfCnpj = (perfil.cpfCnpj || perfil.cpf || perfil.cnpj || '').replace(/\D/g, '');
    if (cleanCpfCnpj) {
      if (cleanCpfCnpj.length <= 11) {
        if (!validarCPF(cleanCpfCnpj)) {
          Alert.alert("CPF Inválido", "O CPF informado é inválido. Verifique os números digitados.");
          return;
        }
      } else {
        if (!validarCNPJ(cleanCpfCnpj)) {
          Alert.alert("CNPJ Inválido", "O CNPJ informado é inválido. Verifique os números digitados.");
          return;
        }
      }
    }

    setSalvando(true);

    try {
      const duplicidade = await verificarDadosDuplicados(cleanCpfCnpj, telefoneParaValidar, user.uid);
      if (duplicidade.existe) {
        setSalvando(false);
        Alert.alert(
          "Dados já em uso",
          `O ${duplicidade.tipo === 'documento' ? 'CPF/CNPJ' : 'Telefone/WhatsApp'} informado já está vinculado a outra conta.`
        );
        return;
      }

      const dadosUpdate = {
        ...perfil,
        cpfCnpj: cleanCpfCnpj,
        updatedAt: new Date().toISOString(),
      };

      // Salva também nos campos individuais para garantir compatibilidade
      if (cleanCpfCnpj.length === 11) {
        dadosUpdate.cpf = cleanCpfCnpj;
      } else if (cleanCpfCnpj.length === 14) {
        dadosUpdate.cnpj = cleanCpfCnpj;
      }

      // Se for colaborador, garante que ele não mude o clinicaId nem o perfil acidentalmente
      if (perfil.perfil === 'colaborador') {
        dadosUpdate.perfil = 'colaborador';
        // Mantém o clinicaId original se existir
        if (perfil.clinicaId) {
          dadosUpdate.clinicaId = perfil.clinicaId;
        }
      }

      const perfilRef = doc(db, "usuarios", user.uid);
      await updateDoc(perfilRef, dadosUpdate);

      Alert.alert("Sucesso", "Perfil atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Erro ao atualizar perfil: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Não foi possível carregar os dados do perfil.</Text>
      </View>
    );
  }

  const MainContent = (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar Perfil</Text>
      </View>

      <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
        <Text style={styles.label}>{perfil.tipo === 'cliente' ? 'Nome Completo' : 'Nome / Razão Social'}</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={perfil.nome || perfil.nomeCompleto || perfil.nomeNegocio || ''}
          onChangeText={(text) => setPerfil({ ...perfil, nome: text, nomeCompleto: text })}
          returnKeyType="next"
          onSubmitEditing={() => whatsappRef.current?.focus()}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Email"
          value={perfil.email || ''}
          editable={false}
        />

        <Text style={styles.label}>WhatsApp (Importante para OS)</Text>
        <TextInput
          ref={whatsappRef}
          style={styles.input}
          placeholder="Telefone/WhatsApp"
          value={perfil.telefone || perfil.whatsapp || ''}
          onChangeText={(text) => setPerfil({ ...perfil, whatsapp: text, telefone: text })}
          keyboardType="phone-pad"
          returnKeyType="next"
          onSubmitEditing={() => cpfRef.current?.focus()}
        />

        {perfil.tipo === 'cliente' || perfil.perfil === 'cliente' ? (
          <>
            <Text style={styles.label}>CPF (Obrigatório para Pagamentos)</Text>
            <TextInput
              ref={cpfRef}
              style={styles.input}
              placeholder="000.000.000-00"
              value={perfil.cpf || perfil.cpfCnpj || ''}
              onChangeText={(text) => setPerfil({ ...perfil, cpf: text, cpfCnpj: text })}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => enderecoRef.current?.focus()}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>CPF ou CNPJ (Obrigatório para Pagamentos)</Text>
            <TextInput
              ref={cpfRef}
              style={styles.input}
              placeholder="CPF ou CNPJ"
              value={perfil.cpfCnpj || perfil.cpf || perfil.cnpj || ''}
              onChangeText={(text) => setPerfil({ ...perfil, cpfCnpj: text })}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => enderecoRef.current?.focus()}
            />
          </>
        )}

        <Text style={styles.label}>Endereço Completo</Text>
        <TextInput
          ref={enderecoRef}
          style={styles.input}
          placeholder="Rua, Número, Bairro, Cidade"
          value={perfil.endereco || ''}
          onChangeText={(text) => setPerfil({ ...perfil, endereco: text })}
          returnKeyType="next"
          onSubmitEditing={() => bioRef.current?.focus()}
        />

        { (perfil.tipo === 'profissional' || perfil.perfil === 'profissional' || perfil.tipo === 'clinica') && (
          <>
            <Text style={styles.label}>Sobre / Descrição</Text>
            <TextInput
              ref={bioRef}
              style={[styles.input, styles.bioInput]}
              placeholder="Fale um pouco sobre seus serviços..."
              value={perfil.bio || ''}
              onChangeText={(text) => setPerfil({ ...perfil, bio: text })}
              multiline
              textAlignVertical="top"
              returnKeyType="done"
              onSubmitEditing={handleUpdate}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={handleUpdate}
          disabled={salvando}
          activeOpacity={0.88}
        >
          {salvando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={20}
                color="#FFF"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.screenContainer}>
      {isLargeScreen ? (
        <View style={styles.webLayout}>
          <Sidebar navigation={navigation} activeRoute="Perfil" />
          <View style={styles.webContentArea}>
            {MainContent}
          </View>
        </View>
      ) : (
        <SafeAreaView style={styles.flex}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            >
              {MainContent}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
    overflow: 'hidden',
  },
  webContentArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: '100%',
    display: 'flex',
    overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100%' : 'auto',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  contentLarge: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center', marginBottom: 24,
  },
  headerLarge: {
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800', color: '#1E293B',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24, padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardLarge: {
    padding: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputDisabled: {
    backgroundColor: '#E2E8F0', color: '#94A3B8',
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    padding: 16, borderRadius: 12,
    marginTop: 12,
    elevation: 4,
    shadowColor: colors.success,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});

export default EditarPerfil;
