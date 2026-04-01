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
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../services/firebaseConfig';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import EmptyState from '../../components/EmptyState';
import {
    handleAppError,
    getRetryMessage,
    getEmptyStateText,
} from '../../utils/errorUtils';
import {
    salvarNotificacaoSistema,
    enviarPushAoProfissional,
} from '../../utils/notificationUtils';

function parseNumero(valor, fallback = 0) {
    if (valor === null || valor === undefined || valor === '') return fallback;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

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

function getStatusPagamentoStyle(status) {
    switch (status) {
        case 'pago':
            return {
                color: '#1E8E3E',
                bg: '#EAF7ED',
                label: 'Pagamento confirmado',
                icon: 'checkmark-done-circle-outline',
            };
        case 'cancelado':
            return {
                color: '#6C757D',
                bg: '#F1F3F5',
                label: 'Cobrança cancelada',
                icon: 'close-circle-outline',
            };
        case 'vencido':
            return {
                color: '#E67E22',
                bg: '#FFF4E5',
                label: 'Cobrança vencida',
                icon: 'alert-circle-outline',
            };
        case 'gerada':
            return {
                color: colors.primary,
                bg: '#EEF3FF',
                label: 'Cobrança gerada',
                icon: 'wallet-outline',
            };
        case 'aguardando_cobranca':
        default:
            return {
                color: '#7F8C8D',
                bg: '#F5F6F8',
                label: 'Aguardando cobrança',
                icon: 'time-outline',
            };
    }
}

function getOrigemStyle(origem) {
    switch (origem) {
        case 'perfil_publico':
            return {
                color: '#7C3AED',
                bg: '#F3E8FF',
                label: 'Perfil público',
                icon: 'sparkles-outline',
            };
        default:
            return {
                color: '#0F766E',
                bg: '#DCFCE7',
                label: 'Agendamento normal',
                icon: 'navigate-outline',
            };
    }
}

function getFotoProfissional(item) {
    return (
        item?.profissionalOrigemFoto ||
        item?.fotoProfissional ||
        item?.colaboradorFoto ||
        item?.fotoPerfilProfissional ||
        ''
    );
}

function getNomeProfissional(item) {
    return (
        item?.colaboradorNome ||
        item?.profissionalOrigemNome ||
        item?.clinicaNome ||
        item?.profissionalNome ||
        'Profissional'
    );
}

function getTituloServicos(item) {
    if (!Array.isArray(item?.servicos) || item.servicos.length === 0) {
        return 'Serviço';
    }

    if (item.servicos.length === 1) {
        return item.servicos[0]?.nome || 'Serviço';
    }

    return `${item.servicos[0]?.nome || 'Serviço'} +${item.servicos.length - 1}`;
}

function getDescricaoServicos(item) {
    if (!Array.isArray(item?.servicos) || item.servicos.length === 0) {
        return 'Serviço';
    }

    return item.servicos.map((s) => s?.nome || 'Serviço').join(', ');
}

function getInicialNome(nome = '') {
    return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

function getDestinoProfissionalId(item) {
    return (
        item?.profissionalId ||
        item?.clinicaId ||
        item?.colaboradorId ||
        item?.proId ||
        null
    );
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
            collection(db, 'agendamentos'),
            where('clienteId', '==', user.uid)
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
                handleAppError({
                    context: 'Carregar agendamentos do cliente',
                    error,
                    title: 'Erro ao carregar',
                    fallbackMessage: getRetryMessage('carregar seus agendamentos'),
                    showAlert: error?.code !== 'permission-denied',
                });
                setLoading(false);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const agendamentosFiltrados = useMemo(() => {
        if (filtroStatus === 'todos') return agendamentos;
        return agendamentos.filter(
            (item) => (item.status || 'pendente') === filtroStatus
        );
    }, [agendamentos, filtroStatus]);

    const contagemPorStatus = useMemo(() => {
        return {
            todos: agendamentos.length,
            pendente: agendamentos.filter(
                (a) => (a.status || 'pendente') === 'pendente'
            ).length,
            confirmado: agendamentos.filter((a) => a.status === 'confirmado').length,
            concluido: agendamentos.filter((a) => a.status === 'concluido').length,
            cancelado: agendamentos.filter((a) => a.status === 'cancelado').length,
            recusado: agendamentos.filter((a) => a.status === 'recusado').length,
        };
    }, [agendamentos]);

    const notificarProfissionalCancelamento = async (item) => {
        try {
            const profissionalId = getDestinoProfissionalId(item);

            if (!profissionalId) {
                console.log(
                    'Cancelamento sem profissionalId/clinicaId/colaboradorId para notificação.'
                );
                return;
            }

            const clienteNome =
                auth.currentUser?.displayName ||
                item?.clienteNome ||
                'Cliente';

            const nomeProfissional = getNomeProfissional(item);

            await salvarNotificacaoSistema({
                userId: profissionalId,
                titulo: 'Agendamento cancelado',
                mensagem: `${clienteNome} cancelou o agendamento.`,
                tipo: 'cancelamento_agendamento',
                agendamentoId: item?.id || null,
                screen: 'AgendaProfissional',
                root: 'Main',
                params: {
                    agendamentoId: item?.id || null,
                    clienteId: item?.clienteId || null,
                    clienteNome,
                    profissionalNome: nomeProfissional,
                },
            });

            const profissionalRef = doc(db, 'usuarios', profissionalId);
            const profissionalSnap = await getDoc(profissionalRef);

            if (profissionalSnap.exists()) {
                const dadosProfissional = profissionalSnap.data();
                const expoPushToken =
                    dadosProfissional?.expoPushToken ||
                    dadosProfissional?.pushToken ||
                    null;

                if (expoPushToken) {
                    await enviarPushAoProfissional(expoPushToken, {
                        titulo: 'Agendamento cancelado',
                        mensagem: `${clienteNome} cancelou um agendamento.`,
                        screen: 'AgendaProfissional',
                        root: 'Main',
                        params: {
                            agendamentoId: item?.id || null,
                        },
                    });
                }
            }
        } catch (error) {
            console.log('Erro ao notificar profissional sobre cancelamento:', error);
        }
    };

    const cancelarAgendamento = (item) => {
        Alert.alert(
            'Cancelar agendamento',
            'Tem certeza que deseja cancelar este agendamento?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, 'agendamentos', item.id), {
                                status: 'cancelado',
                            });

                            await notificarProfissionalCancelamento(item);

                            Alert.alert(
                                'Sucesso',
                                'Agendamento cancelado com sucesso.'
                            );
                        } catch (error) {
                            handleAppError({
                                context: 'Cancelar agendamento do cliente',
                                error,
                                title: 'Erro ao cancelar',
                                fallbackMessage:
                                    'Não foi possível cancelar o agendamento.',
                            });
                        }
                    },
                },
            ]
        );
    };

    const abrirTelaPagamento = (item) => {
        navigation.navigate('PagamentoAgendamento', {
            agendamento: item,
            agendamentoId: item?.id,
        });
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const statusPagamentoStyle = getStatusPagamentoStyle(item.statusPagamento);
        const origemStyle = getOrigemStyle(item.origemAgendamento);

        const total =
            parseNumero(item.valorTotal, 0) ||
            item.servicos?.reduce((acc, s) => acc + parseNumero(s.preco, 0), 0) ||
            0;

        const fotoProfissional = getFotoProfissional(item);
        const nomeProfissional = getNomeProfissional(item);
        const servicoTitulo = getTituloServicos(item);
        const servicosDescricao = getDescricaoServicos(item);

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate('DetalhesAgendamento', { agendamento: item })
                }
                activeOpacity={0.92}
            >
                <View style={styles.topRow}>
                    <View style={styles.profileBlock}>
                        {fotoProfissional ? (
                            <Image source={{ uri: fotoProfissional }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarFallbackText}>
                                    {getInicialNome(nomeProfissional)}
                                </Text>
                            </View>
                        )}

                        <View style={styles.profileInfo}>
                            <Text style={styles.profissionalNome} numberOfLines={1}>
                                {nomeProfissional}
                            </Text>

                            <Text style={styles.servicoNome} numberOfLines={1}>
                                {servicoTitulo}
                            </Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.bg },
                        ]}
                    >
                        <Ionicons
                            name={statusStyle.icon}
                            size={14}
                            color={statusStyle.color}
                        />
                        <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.badgesRow}>
                    <View
                        style={[
                            styles.origemBadge,
                            { backgroundColor: origemStyle.bg },
                        ]}
                    >
                        <Ionicons
                            name={origemStyle.icon}
                            size={13}
                            color={origemStyle.color}
                        />
                        <Text
                            style={[
                                styles.origemBadgeText,
                                { color: origemStyle.color },
                            ]}
                        >
                            {origemStyle.label}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.pagamentoBadgeMini,
                            { backgroundColor: statusPagamentoStyle.bg },
                        ]}
                    >
                        <Ionicons
                            name={statusPagamentoStyle.icon}
                            size={13}
                            color={statusPagamentoStyle.color}
                        />
                        <Text
                            style={[
                                styles.pagamentoBadgeMiniText,
                                { color: statusPagamentoStyle.color },
                            ]}
                        >
                            {statusPagamentoStyle.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.data} às {item.horario}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="bag-outline" size={16} color="#666" />
                        <Text style={styles.infoText} numberOfLines={2}>
                            {servicosDescricao}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {item.formaPagamentoLabel || 'Pix'}
                        </Text>
                    </View>
                </View>

                <View style={styles.financeBox}>
                    <View>
                        <Text style={styles.financeLabel}>Valor total</Text>
                        <Text style={styles.financeValue}>{formatarMoeda(total)}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.pagamentoButton}
                        onPress={() => abrirTelaPagamento(item)}
                    >
                        <Ionicons name="wallet-outline" size={18} color="#FFF" />
                        <Text style={styles.pagamentoButtonText}>Ver cobrança</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerCard}>
                    <View style={styles.detailsHint}>
                        <Ionicons
                            name="chevron-forward-outline"
                            size={16}
                            color={colors.secondary}
                        />
                        <Text style={styles.detailsHintText}>Ver detalhes</Text>
                    </View>
                </View>

                {podeCancelar(item.status) && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => cancelarAgendamento(item)}
                    >
                        <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.cancelButtonText}>
                            Cancelar Agendamento
                        </Text>
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
                <Text
                    style={[
                        styles.filtroChipText,
                        ativo && styles.filtroChipTextAtivo,
                    ]}
                >
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
                    {agendamentosFiltrados.length} agendamento(s) em{' '}
                    {filtros
                        .find((f) => f.key === filtroStatus)
                        ?.label.toLowerCase()}
                </Text>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{contagemPorStatus.todos}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#D97706' }]}>{contagemPorStatus.pendente}</Text>
                    <Text style={styles.summaryLabel}>Pendentes</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>{contagemPorStatus.confirmado}</Text>
                    <Text style={styles.summaryLabel}>Confirmados</Text>
                </View>
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
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyWrapper}>
                        <EmptyState
                            icon="calendar-clear-outline"
                            title="Nenhum agendamento encontrado"
                            subtitle={getEmptyStateText('agendamentos')}
                        />
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F3F8',
    },

    headerArea: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 18,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },

    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.84)',
        marginTop: 4,
    },

    summaryCard: {
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
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },

    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },

    summaryValue: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.textDark,
    },

    summaryLabel: {
        marginTop: 4,
        fontSize: 12,
        color: colors.secondary,
        fontWeight: '700',
    },

    summaryDivider: {
        width: 1,
        height: 34,
        backgroundColor: '#E8EDF5',
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
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E4EAF2',
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
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },

    profileBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 10,
    },

    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: '#EDEFF3',
    },

    avatarFallback: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: `${colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarFallbackText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.primary,
    },

    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },

    profissionalNome: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
    },

    servicoNome: {
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

    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 14,
        marginBottom: 12,
    },

    origemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginRight: 8,
        marginBottom: 8,
    },

    origemBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 5,
    },

    pagamentoBadgeMini: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 8,
    },

    pagamentoBadgeMiniText: {
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 5,
    },

    infoBox: {
        backgroundColor: '#FAFBFD',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#EEF2F6',
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },

    infoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },

    financeBox: {
        marginTop: 14,
        backgroundColor: '#F8FAFD',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E7ECF3',
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    financeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 4,
    },

    financeValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#27AE60',
    },

    pagamentoButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    pagamentoButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 13,
    },

    footerCard: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 12,
    },

    detailsHint: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    detailsHintText: {
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

    emptyWrapper: {
        paddingTop: 32,
        paddingHorizontal: 20,
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