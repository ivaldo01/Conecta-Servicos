import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, query, where } from "firebase/firestore";
import { MultiSelect } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function GerenciarColaboradores({ navigation }) {
    const [nome, setNome] = useState('');
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            // 1. CARREGAR SERVIÇOS (Subcoleção do usuário logado)
            const snapServ = await getDocs(collection(db, "usuarios", user.uid, "servicos"));
            const listaServicos = snapServ.docs.map(d => ({
                label: d.data().nome,
                value: d.id
            }));

            setServicosDisponiveis(listaServicos);

            // 2. CARREGAR EQUIPE
            const snapEquipe = await getDocs(collection(db, "usuarios", user.uid, "colaboradores"));
            setEquipe(snapEquipe.docs.map(d => ({ id: d.id, ...d.data() })));

            if (listaServicos.length === 0) {
                console.log("Aviso: Nenhum serviço encontrado para este UID:", user.uid);
            }

        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao carregar dados do banco.");
        } finally {
            setLoading(false);
        }
    };

    const salvarColaborador = async () => {
        if (!nome || servicosSelecionados.length === 0) {
            Alert.alert("Atenção", "Preencha o nome e selecione pelo menos um serviço.");
            return;
        }

        try {
            const user = auth.currentUser;
            await addDoc(collection(db, "usuarios", user.uid, "colaboradores"), {
                nome,
                servicosHabilitados: servicosSelecionados,
                ativo: true,
                dataCriacao: new Date()
            });

            Alert.alert("Sucesso", "Colaborador adicionado!");
            setNome('');
            setServicosSelecionados([]);
            carregarDados(); // Recarrega a lista
        } catch (e) {
            Alert.alert("Erro ao salvar", e.message);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Minha Equipe / Colaboradores</Text>

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    placeholder="Nome do Profissional"
                    value={nome}
                    onChangeText={setNome}
                />

                <Text style={styles.label}>Serviços que este profissional realiza:</Text>

                <MultiSelect
                    style={styles.dropdown}
                    placeholderStyle={{ fontSize: 14, color: '#999' }}
                    selectedTextStyle={{ fontSize: 14, color: '#333' }}
                    inputSearchStyle={{ height: 40 }}
                    iconStyle={{ width: 20, height: 20 }}
                    data={servicosDisponiveis}
                    labelField="label"
                    valueField="value"
                    placeholder="Selecione os serviços..."
                    value={servicosSelecionados}
                    onChange={item => setServicosSelecionados(item)}
                    selectedStyle={{ borderRadius: 12 }}
                    // Se a lista estiver vazia, mostra esta mensagem:
                    flatListProps={{
                        ListEmptyComponent: () => (
                            <Text style={{ padding: 10, textAlign: 'center', color: 'red' }}>
                                Nenhum serviço cadastrado! Cadastre serviços antes.
                            </Text>
                        )
                    }}
                />

                <TouchableOpacity style={styles.button} onPress={salvarColaborador}>
                    <Text style={styles.buttonText}>Adicionar à Equipe</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={equipe}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{item.nome}</Text>
                            <Text style={styles.cardInfo}>
                                {item.servicosHabilitados?.length || 0} serviços atribuídos
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.btnAgenda}
                            onPress={() => navigation.navigate("ConfigurarAgenda", {
                                colaboradorId: item.id,
                                colaboradorNome: item.nome
                            })}
                        >
                            <Ionicons name="calendar" size={20} color={colors.primary} />
                            <Text style={styles.btnAgendaText}>Agenda</Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>
                        Nenhum colaborador cadastrado ainda.
                    </Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background || '#F8F9FA', marginTop: 30 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    form: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 3, marginBottom: 20 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8, fontSize: 16 },
    label: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '500' },
    dropdown: {
        height: 50,
        backgroundColor: 'white',
        borderRadius: 8,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    button: { backgroundColor: colors.primary || '#000', padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary || '#000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2
    },
    cardName: { fontSize: 16, fontWeight: 'bold' },
    cardInfo: { fontSize: 12, color: '#666' },
    btnAgenda: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#F0F7FF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary || '#000'
    },
    btnAgendaText: { fontSize: 10, color: colors.primary || '#000', fontWeight: 'bold', marginTop: 2 }
});