import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import CustomButton from '../../components/CustomButton';

export default function ConfigurarServicos() {
    const [nomeServico, setNomeServico] = useState('');
    const [preco, setPreco] = useState('');
    const [servicos, setServicos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [perfilUsuario, setPerfilUsuario] = useState(null);

    const precoRef = useRef(null);
    const ehColaborador = perfilUsuario?.perfil === 'colaborador';

    const formatarMoedaInput = (valor) => {
        // Remove tudo que não é número
        let cleanValue = valor.replace(/\D/g, "");

        // Converte para número e divide por 100 para ter as casas decimais
        let numberValue = (Number(cleanValue) / 100).toFixed(2);

        // Formata para o padrão brasileiro de input (ponto como separador interno para o Firestore)
        return numberValue;
    };

    useEffect(() => {
        carregarServicos();
    }, []);

    const carregarServicos = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const perfilSnap = await getDoc(doc(db, "usuarios", user.uid));
            const dadosPerfil = perfilSnap.exists() ? perfilSnap.data() : {};
            setPerfilUsuario(dadosPerfil);

            const ehSubconta = dadosPerfil?.perfil === 'colaborador';
            const ownerId = ehSubconta ? (dadosPerfil?.clinicaId || user.uid) : user.uid;
            const servicosHabilitados = Array.isArray(dadosPerfil?.servicosHabilitados)
                ? dadosPerfil.servicosHabilitados
                : [];

            const querySnapshot = await getDocs(collection(db, "usuarios", ownerId, "servicos"));
            let lista = querySnapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            if (ehSubconta && servicosHabilitados.length > 0) {
                lista = lista.filter((item) => servicosHabilitados.includes(item.id));
            }

            setServicos(lista);
        } catch (error) {
            Alert.alert("Erro", "Não foi possível carregar os serviços.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddServico = async () => {
        Keyboard.dismiss();

        const user = auth.currentUser;

        if (ehColaborador) {
            Alert.alert("Acesso restrito", "Os serviços da sua subconta são definidos pela conta principal.");
            return;
        }

        if (!nomeServico.trim() || !preco.trim()) {
            Alert.alert("Atenção", "Preencha o nome do serviço e o preço.");
            return;
        }

        setSalvando(true);

        try {
            const valorFormatado = preco.replace(',', '.');

            const novoServico = {
                nome: nomeServico.trim(),
                preco: valorFormatado,
                dataCriacao: serverTimestamp(),
            };

            const docRef = await addDoc(
                collection(db, "usuarios", user.uid, "servicos"),
                novoServico
            );

            setServicos((prev) => [{ id: docRef.id, ...novoServico }, ...prev]);
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
        Keyboard.dismiss();

        if (ehColaborador) {
            Alert.alert("Acesso restrito", "Somente a conta principal pode remover ou alterar os serviços.");
            return;
        }

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
            setServicos((prev) => prev.filter((s) => s.id !== id));
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

                <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={styles.cardPrice}>
                        R$ {parseFloat(item.preco || 0).toFixed(2)}
                    </Text>
                </View>

                {!ehColaborador && (
                    <TouchableOpacity
                        onPress={() => confirmarExclusao(item.id)}
                        style={styles.deleteBtn}
                    >
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{ehColaborador ? 'Serviços liberados' : 'Configurar Serviços'}</Text>
                        <Text style={styles.subtitle}>
                            {ehColaborador
                                ? 'Consulte os serviços definidos pela conta principal para a sua subconta'
                                : 'Gerencie seu catálogo de serviços e preços'}
                        </Text>
                    </View>

                    {ehColaborador ? (
                        <View style={styles.noticeCard}>
                            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.noticeTitle}>Edição bloqueada para colaborador</Text>
                                <Text style={styles.noticeText}>
                                    Serviços e preços são controlados pela conta principal. Aqui você pode apenas consultar o que foi liberado para o seu atendimento.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <Text style={styles.label}>Novo Serviço</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Nome (ex: Corte Masculino)"
                                placeholderTextColor="#999"
                                value={nomeServico}
                                onChangeText={setNomeServico}
                                returnKeyType="next"
                                onSubmitEditing={() => precoRef.current?.focus()}
                            />

                            <TextInput
                                ref={precoRef}
                                style={styles.input}
                                placeholder="Preço (ex: 45.00)"
                                placeholderTextColor="#999"
                                value={preco}
                                onChangeText={(val) => {
                                    // Máscara simples: permite apenas números e um ponto
                                    const formatted = val.replace(/[^0-9.]/g, '');
                                    setPreco(formatted);
                                }}
                                keyboardType="decimal-pad"
                                returnKeyType="done"
                                onSubmitEditing={handleAddServico}
                            />

                            <CustomButton
                                title={salvando ? "Salvando..." : "Adicionar ao Catálogo"}
                                onPress={handleAddServico}
                                color={colors.primary}
                                disabled={salvando}
                            />
                        </View>
                    )}

                    <View style={styles.listSection}>
                        <Text style={styles.listTitle}>
                            {ehColaborador ? `Serviços disponíveis para você (${servicos.length})` : `Seus Serviços (${servicos.length})`}
                        </Text>

                        {loading ? (
                            <ActivityIndicator
                                size="large"
                                color={colors.primary}
                                style={styles.loader}
                            />
                        ) : (
                            <FlatList
                                data={servicos}
                                keyExtractor={(item) => item.id}
                                renderItem={renderItem}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <Text style={styles.empty}>
                                        {ehColaborador
                                            ? 'Nenhum serviço foi liberado pela conta principal ainda.'
                                            : 'Nenhum serviço disponível.'}
                                    </Text>
                                }
                                keyboardShouldPersistTaps="handled"
                                keyboardDismissMode="on-drag"
                            />
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F3F8',
    },

    header: {
        padding: 20,
        paddingTop: 52,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 8,
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },

    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.82)',
        marginTop: 4,
    },

    form: {
        backgroundColor: '#FFF',
        padding: 18,
        marginHorizontal: 16,
        marginTop: -6,
        marginBottom: 16,
        borderRadius: 22,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },

    noticeCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#FFF',
        padding: 16,
        marginHorizontal: 16,
        marginTop: -6,
        marginBottom: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#D9E7FF',
    },

    noticeTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1F3B73',
        marginBottom: 4,
    },

    noticeText: {
        fontSize: 13,
        color: '#5E6B7A',
        lineHeight: 18,
    },

    label: {
        fontSize: 13,
        fontWeight: '800',
        color: '#5C6470',
        marginBottom: 8,
    },

    input: {
        backgroundColor: '#F8FAFD',
        padding: 14,
        borderRadius: 14,
        fontSize: 15,
        marginBottom: 15,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    listSection: {
        flex: 1,
        paddingHorizontal: 16,
    },

    listTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 15,
    },

    loader: {
        marginTop: 20,
    },

    listContent: {
        paddingBottom: 40,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        marginBottom: 12,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },

    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },

    cardInfo: {
        flex: 1,
        marginLeft: 15,
    },

    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },

    cardPrice: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: 'bold',
        marginTop: 2,
    },

    deleteBtn: {
        padding: 5,
    },

    empty: {
        textAlign: 'center',
        color: '#7A8596',
        marginTop: 30,
        fontSize: 14,
        backgroundColor: '#FFF',
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },
});
