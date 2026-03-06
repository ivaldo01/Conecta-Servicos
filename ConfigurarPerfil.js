import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
// COMENTADO PARA EVITAR ERRO NO EXPO GO:
// import * as ImagePicker from 'expo-image-picker'; 
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function ConfigurarPerfil() {
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    const [nome, setNome] = useState('');
    const [bio, setBio] = useState('');
    const [telefone, setTelefone] = useState('');
    const [fotoPerfil, setFotoPerfil] = useState(null);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const docRef = doc(db, "usuarios", user.uid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const dados = snap.data();
                setNome(dados.nome || '');
                setBio(dados.bio || '');
                setTelefone(dados.telefone || '');
                setFotoPerfil(dados.fotoPerfil || null);
            }
        } catch (error) {
            Alert.alert("Erro", "Falha ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    // FUNÇÃO MODIFICADA PARA NÃO CRASHAR
    const selecionarImagem = async () => {
        Alert.alert(
            "Recurso Nativo",
            "A troca de foto requer um 'Development Build'. Os campos de texto abaixo funcionam normalmente!"
        );
    };

    const salvarPerfil = async () => {
        const user = auth.currentUser;
        setSalvando(true);
        try {
            await updateDoc(doc(db, "usuarios", user.uid), {
                nome: nome,
                bio: bio,
                telefone: telefone,
                // fotoPerfil: fotoPerfil // Mantemos o que já está lá no banco
            });
            Alert.alert("Sucesso", "Dados atualizados com sucesso!");
        } catch (error) {
            Alert.alert("Erro", "Falha ao salvar.");
        } finally {
            setSalvando(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Meu Perfil</Text>
                <Text style={styles.subtitle}>Como os clientes verão você no app</Text>
            </View>

            <View style={styles.photoSection}>
                <TouchableOpacity onPress={selecionarImagem} style={styles.avatarContainer}>
                    {fotoPerfil ? (
                        <Image source={{ uri: fotoPerfil }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Ionicons name="camera" size={40} color="#CCC" />
                        </View>
                    )}
                    <View style={styles.editBadge}>
                        <Ionicons name="pencil" size={16} color="#FFF" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.photoTip}>Foto (Indisponível no Expo Go)</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Nome do Estabelecimento</Text>
                <TextInput
                    style={styles.input}
                    value={nome}
                    onChangeText={setNome}
                    placeholder="Ex: Barbearia do Ivaldo"
                />

                <Text style={styles.label}>Telefone</Text>
                <TextInput
                    style={styles.input}
                    value={telefone}
                    onChangeText={setTelefone}
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                />

                <Text style={styles.label}>Bio / Especialidades</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Descrição para os clientes..."
                    multiline
                    numberOfLines={4}
                />

                <CustomButton
                    title={salvando ? "Salvando..." : "Salvar Alterações"}
                    onPress={salvarPerfil}
                    color={colors.primary}
                    disabled={salvando}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary, marginTop: 4 },
    photoSection: { alignItems: 'center', marginVertical: 30 },
    avatarContainer: { width: 120, height: 120, borderRadius: 60, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFF' },
    avatarPlaceholder: { backgroundColor: '#E9ECEF', justifyContent: 'center', alignItems: 'center' },
    editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
    photoTip: { fontSize: 12, color: colors.secondary, marginTop: 10 },
    form: { paddingHorizontal: 25, paddingBottom: 40 },
    label: { fontSize: 14, fontWeight: 'bold', color: colors.textDark, marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E9ECEF', color: '#333' },
    textArea: { height: 100, textAlignVertical: 'top' },
});