import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    query,
    where,
    onSnapshot,
    or,
    doc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function getStatusConfig(status) {
    switch (status) {
        case 'confirmado':
            return {
                color: '#27AE60',
                bg: '#EAF7ED',
                label: 'Confirmado',
                icon: 'checkmark-circle-outline',
            };
        case 'cancelado':
            return {
                color: '#6c757d',
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

function getPrimeiraLetra(nome = '') {
    return String(nome || '').trim().charAt(0).toUpperCase() || 'C';
}

export default function AgendaProfissional({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [colaboradores, setColaboradores] = useState([]);
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroColaborador, setFiltroColaborador] = useState('todos');
    const [abaAtiva, setAbaAtiva] = useState('minha'); // 'minha' ou 'equipe'
    const [refreshing, setRefreshing] = useState(false);

    const ehChefe = useMemo(() => perfilUsuario?.perfil !== 'colaborador', [perfilUsuario]);

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
        if (!user) return;

        const unsubPerfil = onSnapshot(doc(db, 'usuarios', user.uid), (snap) => {
            if (snap.exists()) {
                const dados = snap.data();
                setPerfilUsuario(dados);
                // Se for colaborador, forçar a aba 'minha'
                if (dados.perfil === 'colaborador') {
                    setAbaAtiva('minha');
                }
            }
        });

        return () => unsubPerfil();
    }, []);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user || !ehChefe) return;

        const q = query(collection(db, 'usuarios', user.uid, 'colaboradores'));
        const unsubColabs = onSnapshot(q, (snap) => {
            const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setColaboradores(lista);
        });

        return () => unsubColabs();
    }, [ehChefe]);

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "agendamentos"),
            or(
                where("clinicaId", "==", user.uid),
                where("profissionalId", "==", user.uid),
                where("colaboradorId", "==", user.uid)
            )
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
        let filtrados = agendamentos;

        // 1. Filtro de Aba (Minha vs Equipe)
        if (ehChefe) {
            if (abaAtiva === 'minha') {
                // Aba do GESTOR: Seus próprios agendamentos + PENDENTES da clínica
                filtrados = filtrados.filter(a => 
                    a.colaboradorId === auth.currentUser?.uid || 
                    (!a.colaboradorId && a.clinicaId === auth.currentUser?.uid) ||
                    (a.status === 'pendente' && a.clinicaId === auth.currentUser?.uid)
                );
            } else {
                // Aba Equipe: Mostra agendamentos de COLABORADORES
                filtrados = filtrados.filter(a => a.colaboradorId && a.colaboradorId !== auth.currentUser?.uid);

                // Filtro por colaborador específico na aba equipe
                if (filtroColaborador !== 'todos') {
                    filtrados = filtrados.filter(a => a.colaboradorId === filtroColaborador);
                }
            }
        } else {
            // Colaborador comum vê apenas a sua agenda
            filtrados = filtrados.filter(a => a.colaboradorId === auth.currentUser?.uid);
        }

        // 2. Filtro de Status
        if (filtroStatus !== 'todos') {
            filtrados = filtrados.filter((item) => (item.status || 'pendente') === filtroStatus);
        }

        return filtrados;
    }, [agendamentos, filtroStatus, abaAtiva, filtroColaborador, ehChefe]);

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

    const resumoTopo = useMemo(() => {
        const pendentes = agendamentos.filter((a) => (a.status || 'pendente') === 'pendente').length;
        const confirmados = agendamentos.filter((a) => a.status === 'confirmado').length;
        const concluidos = agendamentos.filter((a) => a.status === 'concluido').length;

        return {
            total: agendamentos.length,
            pendentes,
            confirmados,
            concluidos,
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
                activeOpacity={0.94}
                onPress={() => abrirDetalhes(item)}
            >
                <View style={styles.cardTop}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {getPrimeiraLetra(item?.clienteNome || "Cliente")}
                        </Text>
                    </View>

                    <View style={styles.topInfo}>
                        <View style={styles.nomeStatusRow}>
                            <Text style={styles.nomeCliente} numberOfLines={1}>
                                {item?.clienteNome || "Cliente"}
                            </Text>

                            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                <Ionicons
                                    name={status.icon}
                                    size={13}
                                    color={status.color}
                                />
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

                <View style={styles.cardFooter}>
                    <View style={styles.tapHint}>
                        <Ionicons name="create-outline" size={15} color={colors.secondary} />
                        <Text style={styles.tapHintText}>
                            Toque para gerenciar este agendamento
                        </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
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
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{abaAtiva === 'minha' ? 'Minha Agenda' : 'Agenda Equipe'}</Text>
                    {ehChefe && (
                        <View style={styles.abaSwitcher}>
                            <TouchableOpacity
                                style={[styles.abaBtn, abaAtiva === 'minha' && styles.abaBtnAtivo]}
                                onPress={() => setAbaAtiva('minha')}
                            >
                                <Text style={[styles.abaBtnText, abaAtiva === 'minha' && styles.abaBtnTextAtivo]}>EU</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.abaBtn, abaAtiva === 'equipe' && styles.abaBtnAtivo]}
                                onPress={() => setAbaAtiva('equipe')}
                            >
                                <Text style={[styles.abaBtnText, abaAtiva === 'equipe' && styles.abaBtnTextAtivo]}>EQUIPE</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <Text style={styles.subtitle}>
                    {agendamentosFiltrados.length} agendamento(s) neste filtro
                </Text>
            </View>

            {ehChefe && abaAtiva === 'equipe' && colaboradores.length > 0 && (
                <View style={styles.colaboradoresFiltroWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colabsContainer}>
                        <TouchableOpacity
                            style={[styles.colabChip, filtroColaborador === 'todos' && styles.colabChipAtivo]}
                            onPress={() => setFiltroColaborador('todos')}
                        >
                            <Text style={[styles.colabChipText, filtroColaborador === 'todos' && styles.colabChipTextAtivo]}>Todos</Text>
                        </TouchableOpacity>
                        {colaboradores.map(c => (
                            <TouchableOpacity
                                key={c.id}
                                style={[styles.colabChip, filtroColaborador === c.id && styles.colabChipAtivo]}
                                onPress={() => setFiltroColaborador(c.id)}
                            >
                                <Text style={[styles.colabChipText, filtroColaborador === c.id && styles.colabChipTextAtivo]}>{c.nome}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.resumeCard}>
                <View style={styles.resumeItem}>
                    <Text style={styles.resumeValue}>{resumoTopo.total}</Text>
                    <Text style={styles.resumeLabel}>Total</Text>
                </View>

                <View style={styles.resumeDivider} />

                <View style={styles.resumeItem}>
                    <Text style={[styles.resumeValue, { color: '#E67E22' }]}>
                        {resumoTopo.pendentes}
                    </Text>
                    <Text style={styles.resumeLabel}>Pendentes</Text>
                </View>

                <View style={styles.resumeDivider} />

                <View style={styles.resumeItem}>
                    <Text style={[styles.resumeValue, { color: '#27AE60' }]}>
                        {resumoTopo.confirmados}
                    </Text>
                    <Text style={styles.resumeLabel}>Confirmados</Text>
                </View>

                <View style={styles.resumeDivider} />

                <View style={styles.resumeItem}>
                    <Text style={[styles.resumeValue, { color: '#1565C0' }]}>
                        {resumoTopo.concluidos}
                    </Text>
                    <Text style={styles.resumeLabel}>Concluídos</Text>
                </View>
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
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F3F8',
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
    },

    loadingText: {
        marginTop: 10,
        color: colors.secondary,
        fontSize: 14,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 18,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    abaSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.16)',
        borderRadius: 20,
        padding: 4,
    },

    abaBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },

    abaBtnAtivo: {
        backgroundColor: '#FFF',
    },

    abaBtnText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.82)',
    },

    abaBtnTextAtivo: {
        color: colors.primary,
    },

    colaboradoresFiltroWrapper: {
        backgroundColor: 'transparent',
        paddingTop: 10,
        paddingBottom: 4,
    },

    colabsContainer: {
        paddingHorizontal: 16,
    },

    colabChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFF',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E7F0',
    },

    colabChipAtivo: {
        backgroundColor: '#EEF3FF',
        borderColor: colors.primary,
    },

    colabChipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },

    colabChipTextAtivo: {
        color: colors.primary,
        fontWeight: 'bold',
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

    resumeCard: {
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 10,
        backgroundColor: '#FFF',
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E8EDF5',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },

    resumeItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    resumeValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textDark,
    },

    resumeLabel: {
        marginTop: 4,
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '600',
    },

    resumeDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#EEF1F4',
    },

    filtrosWrapper: {
        paddingTop: 8,
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
        paddingTop: 4,
        flexGrow: 1,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
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
        width: 54,
        height: 54,
        borderRadius: 18,
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
        paddingHorizontal: 9,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },

    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 4,
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

    cardFooter: {
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F3F5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 8,
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