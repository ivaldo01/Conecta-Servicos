import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";
import CustomButton from './components/CustomButton';

export default function ConfigurarServicos() {
    const [nomeServico, setNomeServico] = useState('');
    const [preco, setPreco] = useState('');
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        carregarServicos();
    }, []);

    const carregarServicos = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const querySnapshot = await getDocs(collection(db, "usuarios", user.uid, "servicos"));
            const lista = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setServicos(lista);
        } catch (error) {
            Alert.alert("Erro", "Não foi possível carregar os serviços.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddServico = async () => {
        const user = auth.currentUser;
        if (!nomeServico || !preco) {
            Alert.alert("Atenção", "Preencha o nome do serviço e o preço.");
            return;
        }

        setSalvando(true);
        try {
            const valorFormatado = preco.replace(',', '.');
            const novoServico = {
                nome: nomeServico,
                preco: valorFormatado,
                dataCriacao: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "usuarios", user.uid, "servicos"), novoServico);

            setServicos([{ id: docRef.id, ...novoServico }, ...servicos]);
            setNomeServico('');
            setPreco('');
            Alert.alert("Sucesso", "Serviço adicionado ao catálogo!");
        } catch (error) {
            Alert.alert("Erro", "Falha ao salvar serviço.");
        } finally {
            setSalvando(false);
        }
    };

    const confirmarExclusao = (id) => {
        Alert.alert(
            "Excluir Serviço",
            "Deseja remover este serviço do seu catálogo?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Remover", style: "destructive", onPress: () => deleteServico(id) }
            ]
        );
    };

    const deleteServico = async (id) => {
        const user = auth.currentUser;
        try {
            await deleteDoc(doc(db, "usuarios", user.uid, "servicos", id));
            setServicos(servicos.filter(s => s.id !== id));
        } catch (error) {
            Alert.alert("Erro", "Não foi possível excluir.");
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={styles.iconCircle}>
                    <Ionicons name="cut-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={styles.cardPrice}>R$ {parseFloat(item.preco).toFixed(2)}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmarExclusao(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Configurar Serviços</Text>
                <Text style={styles.subtitle}>Gerencie seu catálogo de serviços e preços</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Novo Serviço</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Nome (ex: Corte Masculino)"
                    placeholderTextColor="#999"
                    value={nomeServico}
                    onChangeText={setNomeServico}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Preço (ex: 45.00)"
                    placeholderTextColor="#999"
                    value={preco}
                    onChangeText={setPreco}
                    keyboardType="numeric"
                />
                <CustomButton
                    title={salvando ? "Salvando..." : "Adicionar ao Catálogo"}
                    onPress={handleAddServico}
                    color={colors.primary}
                    disabled={salvando}
                />
            </View>

            <View style={styles.listSection}>
                <Text style={styles.listTitle}>Seus Serviços ({servicos.length})</Text>
                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={servicos}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        ListEmptyComponent={<Text style={styles.empty}>Nenhum serviço disponível.</Text>}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary, marginTop: 4 },

    form: { backgroundColor: '#FFF', padding: 20, margin: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    label: { fontSize: 14, fontWeight: 'bold', color: colors.textDark, marginBottom: 10 },
    input: { backgroundColor: '#F1F3F5', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 15, color: '#333' },

    listSection: { flex: 1, paddingHorizontal: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 15 },

    card: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    cardPrice: { fontSize: 14, color: colors.primary, fontWeight: 'bold', marginTop: 2 },
    deleteBtn: { padding: 5 },
    empty: { textAlign: 'center', color: '#999', marginTop: 30, fontSize: 14 }
});