import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    query,
    where,
    onSnapshot,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function getStatusConfig(status) {
    switch (status) {
        case 'confirmado':
            return { color: '#27AE60', label: 'Confirmado' };
        case 'cancelado':
            return { color: '#6c757d', label: 'Cancelado' };
        case 'recusado':
            return { color: '#C62828', label: 'Recusado' };
        case 'concluido':
            return { color: '#1565C0', label: 'Concluído' };
        default:
            return { color: '#E67E22', label: 'Pendente' };
    }
}

function formatarValorTotal(servicos = [], preco = 0) {
    const total =
        servicos?.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0) ||
        parseFloat(preco || 0);

    return `R$ ${Number(total || 0).toFixed(2)}`;
}

function getResumoServicos(item) {
    if (item?.servicos && item.servicos.length > 0) {
        if (item.servicos.length === 1) {
            return item.servicos[0].nome || 'Serviço';
        }

        return `${item.servicos[0].nome || 'Serviço'} +${item.servicos.length - 1}`;
    }

    return 'Serviço';
}

function getDataOrdenacao(item) {
    if (item?.dataCriacao?.seconds) {
        return item.dataCriacao.seconds;
    }

    return 0;
}

export default function AgendaProfissional({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [refreshing, setRefreshing] = useState(false);

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
            where("clinicaId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const lista = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                const ordenada = lista.sort((a, b) => getDataOrdenacao(b) - getDataOrdenacao(a));

                setAgendamentos(ordenada);
                setLoading(false);
                setRefreshing(false);
            },
            (error) => {
                console.log("Erro ao carregar agenda profissional:", error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

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

    const abrirDetalhes = (item) => {
        navigation.navigate("DetalhesAgendamentoPro", {
            agendamento: item,
        });
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

    const renderItem = ({ item }) => {
        const status = getStatusConfig(item.status);
        const valorTotal = formatarValorTotal(item.servicos, item.preco);
        const resumoServicos = getResumoServicos(item);

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.92}
                onPress={() => abrirDetalhes(item)}
            >
                <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(item?.clienteNome || "C").charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.topInfo}>
                        <View style={styles.nomeStatusRow}>
                            <Text style={styles.nomeCliente} numberOfLines={1}>
                                {item?.clienteNome || "Cliente"}
                            </Text>

                            <View style={[styles.statusBadge, { backgroundColor: `${status.color}18` }]}>
                                <Text style={[styles.statusBadgeText, { color: status.color }]}>
                                    {status.label}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.resumoServico} numberOfLines={1}>
                            {resumoServicos}
                        </Text>

                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
                            <Text style={styles.infoText}>
                                {item?.data || 'Data não informada'} às {item?.horario || '--:--'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardBottom}>
                    <View style={styles.pill}>
                        <Ionicons name="cash-outline" size={14} color={colors.primary} />
                        <Text style={styles.pillText}>{valorTotal}</Text>
                    </View>

                    <View style={styles.pill}>
                        <Ionicons name="call-outline" size={14} color={colors.secondary} />
                        <Text style={styles.pillText} numberOfLines={1}>
                            {item?.clienteWhatsapp || 'Sem telefone'}
                        </Text>
                    </View>
                </View>

                <View style={styles.tapHint}>
                    <Ionicons name="create-outline" size={15} color={colors.secondary} />
                    <Text style={styles.tapHintText}>
                        Toque para gerenciar este agendamento
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando agenda...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Minha Agenda</Text>
                <Text style={styles.subtitle}>
                    {agendamentosFiltrados.length} agendamento(s) neste filtro
                </Text>
            </View>

            <View style={styles.filtrosWrapper}>
                <FlatList
                    data={filtros}
                    keyExtractor={(item) => item.key}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => renderFiltro(item)}
                    contentContainerStyle={styles.filtrosContainer}
                />
            </View>

            <FlatList
                data={agendamentosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="calendar-clear-outline" size={42} color="#A0A0A0" />
                        <Text style={styles.emptyTitle}>Nenhum agendamento encontrado</Text>
                        <Text style={styles.emptyText}>
                            Não há pedidos neste filtro no momento.
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 10,
        color: colors.secondary,
        fontSize: 14,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
        backgroundColor: '#FFF',
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
        paddingTop: 12,
        paddingBottom: 6,
    },

    filtrosContainer: {
        paddingHorizontal: 16,
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
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },

    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },

    avatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: colors.inputFill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    avatarText: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.primary,
    },

    topInfo: {
        flex: 1,
    },

    nomeStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },

    nomeCliente: {
        flex: 1,
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        paddingRight: 8,
    },

    statusBadge: {
        borderRadius: 14,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
    },

    resumoServico: {
        fontSize: 13,
        color: colors.secondary,
        marginBottom: 8,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    infoText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#666',
    },

    cardBottom: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 14,
    },

    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginRight: 8,
        marginBottom: 8,
    },

    pillText: {
        marginLeft: 5,
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
        maxWidth: 150,
    },

    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },

    tapHintText: {
        marginLeft: 6,
        fontSize: 12,
        color: colors.secondary,
    },

    emptyBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },
});
