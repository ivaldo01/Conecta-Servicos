import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function getStatusStyle(status) {
    switch (status) {
        case 'confirmado':
            return {
                color: '#1E8E3E',
                bg: '#EAF7ED',
                label: 'Confirmado',
                icon: 'checkmark-circle-outline',
            };
        case 'cancelado':
            return {
                color: '#6C757D',
                bg: '#F1F3F5',
                label: 'Cancelado',
                icon: 'close-circle-outline',
            };
        case 'recusado':
            return {
                color: '#C62828',
                bg: '#FDECEC',
                label: 'Recusado',
                icon: 'ban-outline',
            };
        case 'concluido':
            return {
                color: '#1565C0',
                bg: '#EAF2FE',
                label: 'Concluído',
                icon: 'checkmark-done-outline',
            };
        default:
            return {
                color: '#E67E22',
                bg: '#FFF4E5',
                label: 'Pendente',
                icon: 'time-outline',
            };
    }
}

function podeCancelar(status) {
    return status === 'pendente' || status === 'confirmado';
}

export default function MeusAgendamentosCliente({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos');

    const filtros = [
        { key: 'todos', label: 'Todos' },
        { key: 'pendente', label: 'Pendentes' },
        { key: 'confirmado', label: 'Confirmados' },
        { key: 'concluido', label: 'Concluídos' },
        { key: 'cancelado', label: 'Cancelados' },
        { key: 'recusado', label: 'Recusados' },
    ];

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "agendamentos"),
            where("clienteId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const lista = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                const ordenada = lista.sort((a, b) => {
                    const dataA = a.dataCriacao?.seconds || 0;
                    const dataB = b.dataCriacao?.seconds || 0;
                    return dataB - dataA;
                });

                setAgendamentos(ordenada);
                setLoading(false);
            },
            (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Erro no Firestore Cliente:", error);
                }
                setLoading(false);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const agendamentosFiltrados = useMemo(() => {
        if (filtroStatus === 'todos') return agendamentos;
        return agendamentos.filter((item) => (item.status || 'pendente') === filtroStatus);
    }, [agendamentos, filtroStatus]);

    const contagemPorStatus = useMemo(() => {
        return {
            todos: agendamentos.length,
            pendente: agendamentos.filter((a) => (a.status || 'pendente') === 'pendente').length,
            confirmado: agendamentos.filter((a) => a.status === 'confirmado').length,
            concluido: agendamentos.filter((a) => a.status === 'concluido').length,
            cancelado: agendamentos.filter((a) => a.status === 'cancelado').length,
            recusado: agendamentos.filter((a) => a.status === 'recusado').length,
        };
    }, [agendamentos]);

    const cancelarAgendamento = (item) => {
        Alert.alert(
            "Cancelar agendamento",
            "Tem certeza que deseja cancelar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, cancelar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, "agendamentos", item.id), {
                                status: "cancelado",
                            });

                            Alert.alert("Sucesso", "Agendamento cancelado com sucesso.");
                        } catch (error) {
                            console.log("Erro ao cancelar agendamento:", error);
                            Alert.alert("Erro", "Não foi possível cancelar o agendamento.");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const total =
            item.servicos?.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0) || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate("DetalhesAgendamento", { agendamento: item })
                }
                activeOpacity={0.92}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.servicoNome} numberOfLines={1}>
                            {item.servicos && item.servicos.length > 0
                                ? item.servicos.length > 1
                                    ? `${item.servicos[0].nome} +${item.servicos.length - 1}`
                                    : item.servicos[0].nome
                                : "Serviço"}
                        </Text>

                        <Text style={styles.clinicaNome} numberOfLines={1}>
                            {item.colaboradorNome || "Profissional"}
                        </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Ionicons name={statusStyle.icon} size={14} color={statusStyle.color} />
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                        {item.data} às {item.horario}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="bag-outline" size={16} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {item.servicos?.map((s) => s.nome).join(", ") || "Serviço"}
                    </Text>
                </View>

                <View style={styles.footerCard}>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceText}>R$ {total.toFixed(2)}</Text>
                    </View>

                    <View style={styles.tapHint}>
                        <Ionicons name="chevron-forward-outline" size={16} color={colors.secondary} />
                        <Text style={styles.tapHintText}>Ver detalhes</Text>
                    </View>
                </View>

                {podeCancelar(item.status) && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => cancelarAgendamento(item)}
                    >
                        <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.cancelButtonText}>Cancelar Agendamento</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderFiltro = (filtro) => {
        const ativo = filtroStatus === filtro.key;

        return (
            <TouchableOpacity
                key={filtro.key}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                onPress={() => setFiltroStatus(filtro.key)}
                activeOpacity={0.88}
            >
                <Text style={[styles.filtroChipText, ativo && styles.filtroChipTextAtivo]}>
                    {filtro.label} ({contagemPorStatus[filtro.key] || 0})
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando agendamentos...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerArea}>
                <Text style={styles.title}>Meus Agendamentos</Text>
                <Text style={styles.subtitle}>
                    {agendamentosFiltrados.length} agendamento(s) em {filtros.find(f => f.key === filtroStatus)?.label.toLowerCase()}
                </Text>
            </View>

            <View style={styles.filtrosWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtrosContainer}
                >
                    {filtros.map(renderFiltro)}
                </ScrollView>
            </View>

            <FlatList
                data={agendamentosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="calendar-outline" size={34} color="#A0A0A0" />
                        <Text style={styles.emptyTitle}>
                            Nenhum agendamento encontrado
                        </Text>
                        <Text style={styles.emptyText}>
                            Não há agendamentos neste filtro no momento.
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    headerArea: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    filtrosWrapper: {
        marginBottom: 6,
    },

    filtrosContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 4,
    },

    filtroChip: {
        backgroundColor: '#EEF1F4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },

    filtroChipAtivo: {
        backgroundColor: colors.primary,
    },

    filtroChipText: {
        color: '#555',
        fontWeight: '700',
        fontSize: 13,
    },

    filtroChipTextAtivo: {
        color: '#FFF',
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },

    card: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 18,
        marginBottom: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },

    servicoNome: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.textDark,
    },

    clinicaNome: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: 4,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },

    statusText: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 5,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
    },

    infoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },

    footerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 12,
    },

    priceTag: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },

    priceText: {
        color: '#27AE60',
        fontWeight: '800',
        fontSize: 15,
    },

    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    tapHintText: {
        marginLeft: 4,
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
    },

    cancelButton: {
        marginTop: 14,
        backgroundColor: colors.danger || '#dc3545',
        borderRadius: 14,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    cancelButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80,
        paddingHorizontal: 24,
    },

    emptyTitle: {
        marginTop: 12,
        fontSize: 17,
        fontWeight: '800',
        color: colors.textDark,
        textAlign: 'center',
    },

    emptyText: {
        textAlign: 'center',
        marginTop: 8,
        color: '#999',
        fontSize: 14,
        lineHeight: 20,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
    },

    loadingText: {
        marginTop: 12,
        color: colors.secondary,
        fontSize: 14,
    },
});