import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
            const lista = [];
            querySnapshot.forEach((doc) => {
                lista.push({ id: doc.id, ...doc.data() });
            });
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
            const novoServico = {
                nome: nomeServico,
                preco: preco.replace(',', '.'), // Garante formato numérico
                dataCriacao: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "usuarios", user.uid, "servicos"), novoServico);

            setServicos([...servicos, { id: docRef.id, ...novoServico }]);
            setNomeServico('');
            setPreco('');
            Alert.alert("Sucesso", "Serviço adicionado ao seu catálogo!");
        } catch (error) {
            Alert.alert("Erro", "Falha ao salvar serviço.");
        } finally {
            setSalvando(false);
        }
    };

    const confirmarExclusao = (id) => {
        Alert.alert(
            "Excluir Serviço",
            "Tem certeza que deseja remover este serviço?",
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", style: "destructive", onPress: () => deleteServico(id) }
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
            <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardPrice}>R$ {parseFloat(item.preco).toFixed(2)}</Text>
            </View>
            <TouchableOpacity onPress={() => confirmarExclusao(item.id)}>
                <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Meus Serviços e Preços</Text>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Ex: Corte de Cabelo"
                    value={nomeServico}
                    onChangeText={setNomeServico}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Preço (Ex: 35.00)"
                    value={preco}
                    onChangeText={setPreco}
                    keyboardType="numeric"
                />
                <CustomButton
                    title={salvando ? "Salvando..." : "Adicionar Serviço"}
                    onPress={handleAddServico}
                    color={colors.primary}
                    disabled={salvando}
                />
            </View>

            <Text style={styles.subtitle}>Catálogo Ativo:</Text>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} />
            ) : (
                <FlatList
                    data={servicos}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text style={styles.empty}>Nenhum serviço cadastrado.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.textDark, marginBottom: 20, textAlign: 'center' },
    form: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 3, marginBottom: 25 },
    input: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginBottom: 15, padding: 8, fontSize: 16 },
    subtitle: { fontSize: 18, fontWeight: 'bold', color: colors.textDark, marginBottom: 10 },
    card: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
        borderLeftWidth: 5,
        borderLeftColor: colors.primary
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    cardPrice: { fontSize: 14, color: colors.primary, fontWeight: 'bold' },
    empty: { textAlign: 'center', color: '#888', marginTop: 20 }
});