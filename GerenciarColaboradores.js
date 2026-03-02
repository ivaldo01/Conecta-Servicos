import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { MultiSelect } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function GerenciarColaboradores({ navigation }) { // Adicione o navigation aqui
    const [nome, setNome] = useState('');
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { carregarDados(); }, []);

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const snapServ = await getDocs(collection(db, "usuarios", user.uid, "servicos"));
            setServicosDisponiveis(snapServ.docs.map(d => ({ label: d.data().nome, value: d.id })));

            const snapEquipe = await getDocs(collection(db, "usuarios", user.uid, "colaboradores"));
            setEquipe(snapEquipe.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { Alert.alert("Erro", "Falha ao carregar dados."); }
        finally { setLoading(false); }
    };

    const salvarColaborador = async () => {
        if (!nome || servicosSelecionados.length === 0) {
            Alert.alert("Atenção", "Preencha o nome e selecione os serviços.");
            return;
        }
        try {
            await addDoc(collection(db, "usuarios", auth.currentUser.uid, "colaboradores"), {
                nome,
                servicosHabilitados: servicosSelecionados,
                ativo: true
            });
            setNome(''); setServicosSelecionados([]); carregarDados();
        } catch (e) { Alert.alert("Erro", e.message); }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Minha Equipe / Colaboradores</Text>

            <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Nome do Profissional" value={nome} onChangeText={setNome} />
                <Text style={styles.label}>Serviços que este profissional realiza:</Text>
                <MultiSelect
                    style={styles.dropdown}
                    data={servicosDisponiveis}
                    labelField="label" valueField="value"
                    placeholder="Selecione..."
                    value={servicosSelecionados}
                    onChange={item => setServicosSelecionados(item)}
                    selectedStyle={{ borderRadius: 12 }}
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
                            <Text style={styles.cardInfo}>{item.servicosHabilitados.length} serviços atribuídos</Text>
                        </View>

                        {/* NOVO BOTÃO: CONFIGURAR AGENDA */}
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
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: colors.background, marginTop: 30 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    form: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 3, marginBottom: 20 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', marginBottom: 15, padding: 8 },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    dropdown: { height: 50, borderBottomWidth: 1, borderColor: '#ddd' },
    button: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, marginTop: 15, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
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
        borderColor: colors.primary
    },
    btnAgendaText: { fontSize: 10, color: colors.primary, fontWeight: 'bold', marginTop: 2 }
});