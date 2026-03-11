import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { auth, db, functions } from "../../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { MultiSelect } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function GerenciarColaboradores({ navigation }) {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [servicosSelecionados, setServicosSelecionados] = useState([]);
    const [equipe, setEquipe] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const snapServ = await getDocs(collection(db, "usuarios", user.uid, "servicos"));
            const listaServicos = snapServ.docs.map(d => ({
                label: d.data().nome,
                value: d.id
            }));
            setServicosDisponiveis(listaServicos);

            const snapEquipe = await getDocs(collection(db, "usuarios", user.uid, "colaboradores"));
            setEquipe(snapEquipe.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao carregar dados da equipe.");
        } finally {
            setLoading(false);
        }
    };

    const salvarColaborador = async () => {
        if (!nome || !email || !senha || servicosSelecionados.length === 0) {
            Alert.alert("Atenção", "Por favor, preencha todos os campos.");
            return;
        }

        if (senha.length < 6) {
            Alert.alert("Atenção", "A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        setSalvando(true);

        try {
            const criarColaborador = httpsCallable(functions, "criarColaborador");

            const response = await criarColaborador({
                nome: nome.trim(),
                email: email.trim().toLowerCase(),
                senha,
                servicosSelecionados
            });

            if (response?.data?.ok) {
                Alert.alert("Sucesso!", "Colaborador criado com sucesso.");

                setNome('');
                setEmail('');
                setSenha('');
                setServicosSelecionados([]);

                await carregarDados();
            } else {
                Alert.alert("Erro", "Não foi possível criar o colaborador.");
            }
        } catch (e) {
            console.error("Erro detalhado:", e);

            const code = e?.code || "";
            const message = e?.message || "Erro ao criar colaborador.";

            if (code.includes("already-exists")) {
                Alert.alert("Erro", "Este e-mail já está em uso.");
            } else if (code.includes("permission-denied")) {
                Alert.alert("Erro", "Sua conta não tem permissão para criar colaboradores.");
            } else if (code.includes("unauthenticated")) {
                Alert.alert("Erro", "Você precisa estar logado.");
            } else if (code.includes("invalid-argument")) {
                Alert.alert("Erro", message);
            } else {
                Alert.alert("Erro", message);
            }
        } finally {
            setSalvando(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.headerTitle}>Minha Equipe</Text>

            <View style={styles.formCard}>
                <Text style={styles.formSubtitle}>Cadastrar Novo Profissional</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Nome Completo do Profissional"
                    placeholderTextColor="#999"
                    value={nome}
                    onChangeText={setNome}
                />

                <TextInput
                    style={styles.input}
                    placeholder="E-mail (login do colaborador)"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Senha de acesso (mín. 6 dígitos)"
                    placeholderTextColor="#999"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry
                />

                <Text style={styles.label}>Habilitar para os serviços:</Text>
                <MultiSelect
                    style={styles.dropdown}
                    placeholder="Selecione os serviços..."
                    placeholderStyle={{ color: '#999', fontSize: 14 }}
                    data={servicosDisponiveis}
                    labelField="label"
                    valueField="value"
                    value={servicosSelecionados}
                    onChange={item => setServicosSelecionados(item)}
                    selectedStyle={styles.selectedChip}
                />

                <TouchableOpacity
                    style={[styles.mainButton, salvando && { backgroundColor: '#CCC' }]}
                    onPress={salvarColaborador}
                    disabled={salvando}
                >
                    {salvando ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>CADASTRAR E GERAR LOGIN</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Colaboradores Cadastrados</Text>

            {equipe.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum profissional cadastrado.</Text>
            ) : (
                equipe.map((item) => (
                    <View key={item.id} style={styles.colabCard}>
                        <View style={styles.colabInfo}>
                            <Text style={styles.colabName}>{item.nome}</Text>
                            <Text style={styles.colabEmail}>{item.email}</Text>
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {item.servicosHabilitados?.length || 0} serviços
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.agendaButton}
                            onPress={() =>
                                navigation.navigate("ConfigurarAgenda", {
                                    colaboradorId: item.id,
                                    colaboradorNome: item.nome
                                })
                            }
                        >
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={styles.agendaButtonText}>Agenda</Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background || '#F5F5F5' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', margin: 20, marginTop: 50, color: colors.textDark },
    formCard: { backgroundColor: '#FFF', margin: 20, padding: 20, borderRadius: 15, elevation: 4 },
    formSubtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.primary },
    input: { borderBottomWidth: 1, borderColor: '#EEE', marginBottom: 20, padding: 10, fontSize: 16, color: '#333' },
    label: { fontSize: 14, color: '#666', marginBottom: 10 },
    dropdown: { borderWidth: 1, borderColor: '#EEE', borderRadius: 8, padding: 10, backgroundColor: '#FAFAFA' },
    selectedChip: { borderRadius: 12, backgroundColor: '#EEE' },
    mainButton: { backgroundColor: colors.primary || '#000', padding: 18, borderRadius: 12, marginTop: 25, alignItems: 'center' },
    buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 10, color: colors.textDark },
    colabCard: { backgroundColor: '#FFF', marginHorizontal: 20, marginBottom: 12, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    colabInfo: { flex: 1 },
    colabName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    colabEmail: { fontSize: 13, color: '#888', marginVertical: 2 },
    badge: { backgroundColor: '#F0F0F0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    badgeText: { fontSize: 11, color: '#666' },
    agendaButton: { alignItems: 'center', padding: 10, backgroundColor: '#F0F7FF', borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
    agendaButtonText: { fontSize: 11, color: colors.primary, fontWeight: 'bold', marginTop: 2 },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});