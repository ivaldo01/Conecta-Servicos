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
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function EditarPerfil({ navigation }) {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

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
          setPerfil(perfilSnap.data());
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
    setSalvando(true);

    try {
      const perfilRef = doc(db, "usuarios", user.uid);
      
      const dadosUpdate = {
        ...perfil,
        updatedAt: new Date().toISOString(),
      };

      // Se for colaborador, garante que ele não mude o clinicaId nem o perfil acidentalmente
      if (perfil.perfil === 'colaborador') {
        dadosUpdate.perfil = 'colaborador';
        // Mantém o clinicaId original se existir
        if (perfil.clinicaId) {
          dadosUpdate.clinicaId = perfil.clinicaId;
        }
      }

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

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Editar Perfil</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Nome Completo / Razão Social</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={perfil.nome || ''}
              onChangeText={(text) => setPerfil({ ...perfil, nome: text })}
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 40,
  },

  card: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },

  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },

  inputDisabled: {
    backgroundColor: '#f0f0f0',
  },

  bioInput: {
    height: 100,
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
  },

  buttonIcon: {
    marginRight: 10,
  },

  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditarPerfil;
