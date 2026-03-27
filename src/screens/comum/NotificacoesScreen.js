import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../services/firebaseConfig';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    getDocs,
    getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import EmptyState from '../../components/EmptyState';
import { handleAppError, getRetryMessage, getEmptyStateText } from '../../utils/errorUtils';

function formatarData(item) {
    if (!item?.createdAt?.seconds) return 'Agora';

    const data = new Date(item.createdAt.seconds * 1000);
    const hoje = new Date();

    const mesmoDia =
        data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear();

    if (mesmoDia) {
        return data.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return data.toLocaleDateString('pt-BR');
}

function getIcon(tipo) {
    switch (tipo) {
        case 'novo_agendamento':
            return 'calendar-outline';
        case 'nova_avaliacao':
            return 'star-outline';
        case 'sistema':
            return 'notifications-outline';
        case 'atualizacao_agendamento':
            return 'document-text-outline';
        case 'pagamento':
            return 'card-outline';
        case 'cobranca':
            return 'receipt-outline';
        default:
            return 'notifications-outline';
    }
}

function getIconBackground(tipo) {
    switch (tipo) {
        case 'novo_agendamento':
            return '#EAF2FE';
        case 'nova_avaliacao':
            return '#FFF6E5';
        case 'sistema':
            return '#EEF1F4';
        case 'atualizacao_agendamento':
            return '#EEF8F2';
        case 'pagamento':
            return '#F3EDFF';
        case 'cobranca':
            return '#FFF0EA';
        default:
            return `${colors.primary}15`;
    }
}

function getIconColor(tipo) {
    switch (tipo) {
        case 'novo_agendamento':
            return '#1565C0';
        case 'nova_avaliacao':
            return '#E6A700';
        case 'sistema':
            return '#5D6D7E';
        case 'atualizacao_agendamento':
            return '#1E8E54';
        case 'pagamento':
            return '#7C3AED';
        case 'cobranca':
            return '#E67E22';
        default:
            return colors.primary;
    }
}

function getTituloResumo(item) {
    return item?.titulo || 'Notificação';
}

function getMensagemResumo(item) {
    return item?.mensagem || 'Sem detalhes.';
}

function getAgendamentoIdFromNotification(item) {
    return (
        item?.agendamentoId ||
        item?.params?.agendamentoId ||
        item?.params?.id ||
        item?.params?.agendamento?.id ||
        null
    );
}

export default function NotificacoesScreen({ navigation }) {
    const [notificacoes, setNotificacoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todas');
    const [marcandoTodas, setMarcandoTodas] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'usuarios', user.uid, 'notificacoes'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const lista = snapshot.docs.map((item) => ({
                    id: item.id,
                    ...item.data(),
                }));
                setNotificacoes(lista);
                setLoading(false);
            },
            (error) => {
                handleAppError({
                    context: 'Carregar notificações',
                    error,
                    title: 'Erro ao carregar',
                    fallbackMessage: getRetryMessage('carregar suas notificações'),
                });
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const totalNaoLidas = useMemo(() => {
        return notificacoes.filter((item) => !item.lida).length;
    }, [notificacoes]);

    const totalLidas = useMemo(() => {
        return notificacoes.filter((item) => !!item.lida).length;
    }, [notificacoes]);

    const notificacoesFiltradas = useMemo(() => {
        if (filtro === 'nao_lidas') {
            return notificacoes.filter((item) => !item.lida);
        }

        if (filtro === 'lidas') {
            return notificacoes.filter((item) => item.lida);
        }

        return notificacoes;
    }, [notificacoes, filtro]);

    const marcarComoLida = async (item) => {
        if (item?.lida) return;

        try {
            const user = auth.currentUser;
            if (!user?.uid) return;

            await updateDoc(
                doc(db, 'usuarios', user.uid, 'notificacoes', item.id),
                { lida: true }
            );
        } catch (error) {
            handleAppError({
                context: 'Marcar notificação como lida',
                error,
                title: 'Aviso',
                fallbackMessage: 'Não foi possível atualizar a notificação.',
                showAlert: false,
            });
        }
    };

    const buscarAgendamentoPorId = async (agendamentoId) => {
        try {
            if (!agendamentoId) return null;

            const snap = await getDoc(doc(db, 'agendamentos', agendamentoId));

            if (!snap.exists()) return null;

            return {
                id: snap.id,
                ...snap.data(),
            };
        } catch (error) {
            handleAppError({
                context: 'Buscar agendamento por ID na notificação',
                error,
                title: 'Erro',
                fallbackMessage: 'Não foi possível localizar este agendamento agora.',
                showAlert: false,
            });
            return null;
        }
    };

    const abrirTelaMain = (screen, params = {}) => {
        navigation.navigate('Main', {
            screen,
            params,
        });
    };

    const abrirDetalhesAgendamentoCliente = async (item) => {
        const agendamentoId = getAgendamentoIdFromNotification(item);

        if (!agendamentoId) {
            abrirTelaMain('MeusAgendamentosCliente');
            return;
        }

        const agendamento = await buscarAgendamentoPorId(agendamentoId);

        if (agendamento) {
            navigation.navigate('DetalhesAgendamento', {
                agendamento,
            });
            return;
        }

        abrirTelaMain('MeusAgendamentosCliente');
    };

    const abrirPagamentoAgendamentoCliente = async (item) => {
        const agendamentoId = getAgendamentoIdFromNotification(item);

        if (!agendamentoId) {
            abrirTelaMain('MeusAgendamentosCliente');
            return;
        }

        const agendamento = await buscarAgendamentoPorId(agendamentoId);

        if (agendamento) {
            navigation.navigate('PagamentoAgendamento', {
                agendamento,
                agendamentoId: agendamento.id,
            });
            return;
        }

        abrirTelaMain('MeusAgendamentosCliente');
    };

    const abrirTelaAvaliacaoCliente = async (item) => {
        const agendamentoId = getAgendamentoIdFromNotification(item);

        if (!agendamentoId) {
            abrirTelaMain('MeusAgendamentosCliente');
            return;
        }

        const agendamento = await buscarAgendamentoPorId(agendamentoId);

        if (agendamento) {
            navigation.navigate('AvaliarAtendimento', {
                agendamento,
            });
            return;
        }

        abrirTelaMain('MeusAgendamentosCliente');
    };

    const abrirAgendaProfissional = async (item) => {
        const agendamentoId = getAgendamentoIdFromNotification(item);

        abrirTelaMain('AgendaProfissional', agendamentoId ? { agendamentoId } : {});
    };

    const abrirRelatoriosProfissional = async () => {
        abrirTelaMain('FinanceiroPro');
    };

    const abrirDestinoNotificacao = async (item) => {
        try {
            const agendamentoId = getAgendamentoIdFromNotification(item);
            const screen = item?.screen || '';
            const root = item?.root || '';
            const tipo = item?.tipo || '';
            const mensagem = String(item?.mensagem || '').toLowerCase();
            const titulo = String(item?.titulo || '').toLowerCase();

            if (screen === 'PagamentoAgendamento') {
                await abrirPagamentoAgendamentoCliente(item);
                return;
            }

            if (screen === 'DetalhesAgendamento') {
                await abrirDetalhesAgendamentoCliente(item);
                return;
            }

            if (screen === 'AvaliarAtendimento') {
                await abrirTelaAvaliacaoCliente(item);
                return;
            }

            if (screen === 'AgendaProfissional') {
                await abrirAgendaProfissional(item);
                return;
            }

            if (screen === 'RelatoriosPro' || screen === 'FinanceiroPro') {
                await abrirRelatoriosProfissional();
                return;
            }

            if (root === 'Main' && screen === 'MeusAgendamentosCliente') {
                if (agendamentoId) {
                    await abrirDetalhesAgendamentoCliente(item);
                    return;
                }

                abrirTelaMain('MeusAgendamentosCliente', item?.params || {});
                return;
            }

            if (root === 'Main' && screen === 'AgendaProfissional') {
                await abrirAgendaProfissional(item);
                return;
            }

            if (root === 'Main' && (screen === 'RelatoriosPro' || screen === 'FinanceiroPro')) {
                await abrirRelatoriosProfissional();
                return;
            }

            if (root === 'Main' && screen === 'FavoritosCliente') {
                abrirTelaMain('FavoritosCliente', item?.params || {});
                return;
            }

            if (root === 'Main' && screen === 'Perfil') {
                abrirTelaMain('Perfil', item?.params || {});
                return;
            }

            if (screen && !root) {
                navigation.navigate(screen, item?.params || {});
                return;
            }

            if (tipo === 'novo_agendamento') {
                await abrirAgendaProfissional(item);
                return;
            }

            if (tipo === 'nova_avaliacao') {
                await abrirRelatoriosProfissional();
                return;
            }

            if (tipo === 'atualizacao_agendamento') {
                await abrirDetalhesAgendamentoCliente(item);
                return;
            }

            if (tipo === 'pagamento' || tipo === 'cobranca') {
                await abrirPagamentoAgendamentoCliente(item);
                return;
            }

            if (tipo === 'sistema') {
                const assuntoPagamento =
                    mensagem.includes('cobran') ||
                    mensagem.includes('pagamento') ||
                    titulo.includes('cobran') ||
                    titulo.includes('pagamento');

                const assuntoAvaliacao =
                    mensagem.includes('avali') ||
                    titulo.includes('avali');

                const assuntoAgendamento =
                    mensagem.includes('agendamento') ||
                    mensagem.includes('atendimento') ||
                    titulo.includes('agendamento') ||
                    titulo.includes('atendimento');

                if (assuntoPagamento && agendamentoId) {
                    await abrirPagamentoAgendamentoCliente(item);
                    return;
                }

                if (assuntoAvaliacao && agendamentoId) {
                    await abrirTelaAvaliacaoCliente(item);
                    return;
                }

                if (assuntoAgendamento && agendamentoId) {
                    await abrirDetalhesAgendamentoCliente(item);
                    return;
                }

                if (agendamentoId) {
                    await abrirDetalhesAgendamentoCliente(item);
                    return;
                }

                abrirTelaMain('MeusAgendamentosCliente');
            }
        } catch (error) {
            handleAppError({
                context: 'Abrir destino da notificação',
                error,
                title: 'Aviso',
                fallbackMessage: 'Não foi possível abrir o destino desta notificação.',
            });
        }
    };

    const abrirNotificacao = async (item) => {
        await marcarComoLida(item);
        await abrirDestinoNotificacao(item);
    };

    const marcarTodasComoLidas = async () => {
        const user = auth.currentUser;
        if (!user?.uid) return;

        const naoLidas = notificacoes.filter((item) => !item.lida);

        if (naoLidas.length === 0) {
            Alert.alert('Pronto', 'Você não tem notificações não lidas.');
            return;
        }

        try {
            setMarcandoTodas(true);

            const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'notificacoes'));

            const promises = snapshot.docs.map(async (item) => {
                const dados = item.data();

                if (!dados?.lida) {
                    return updateDoc(
                        doc(db, 'usuarios', user.uid, 'notificacoes', item.id),
                        { lida: true }
                    );
                }

                return null;
            });

            await Promise.all(promises);
            Alert.alert('Sucesso', 'Todas as notificações foram marcadas como lidas.');
        } catch (error) {
            handleAppError({
                context: 'Marcar todas as notificações como lidas',
                error,
                title: 'Erro',
                fallbackMessage: 'Não foi possível concluir essa ação.',
            });
        } finally {
            setMarcandoTodas(false);
        }
    };

    const renderFiltro = (key, label, quantidade) => {
        const ativo = filtro === key;

        return (
            <TouchableOpacity
                key={key}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                activeOpacity={0.88}
                onPress={() => setFiltro(key)}
            >
                <Text style={[styles.filtroChipText, ativo && styles.filtroChipTextAtivo]}>
                    {label} ({quantidade})
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }) => {
        const corIcone = getIconColor(item?.tipo);
        const fundoIcone = getIconBackground(item?.tipo);

        return (
            <TouchableOpacity
                style={[styles.card, !item?.lida && styles.cardNaoLida]}
                activeOpacity={0.92}
                onPress={() => abrirNotificacao(item)}
            >
                <View style={[styles.iconBox, { backgroundColor: fundoIcone }]}>
                    <Ionicons name={getIcon(item?.tipo)} size={22} color={corIcone} />
                </View>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <Text style={styles.titulo} numberOfLines={1}>
                            {getTituloResumo(item)}
                        </Text>

                        {!item?.lida && <View style={styles.dotInline} />}
                    </View>

                    <Text style={styles.mensagem} numberOfLines={3}>
                        {getMensagemResumo(item)}
                    </Text>

                    <View style={styles.bottomRow}>
                        <Text style={styles.data}>{formatarData(item)}</Text>

                        {!item?.lida ? (
                            <View style={styles.badgeNova}>
                                <Text style={styles.badgeNovaText}>Nova</Text>
                            </View>
                        ) : (
                            <View style={styles.badgeLida}>
                                <Text style={styles.badgeLidaText}>Lida</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.rightArea}>
                    <Ionicons
                        name="chevron-forward-outline"
                        size={18}
                        color="#9AA0A6"
                    />
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando notificações...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.88}
                >
                    <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                </TouchableOpacity>

                <View style={styles.headerText}>
                    <Text style={styles.title}>Notificações</Text>
                    <Text style={styles.subtitle}>
                        {totalNaoLidas} não lida(s) • {notificacoes.length} total
                    </Text>
                </View>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{notificacoes.length}</Text>
                    <Text style={styles.summaryLabel}>Total</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                        {totalNaoLidas}
                    </Text>
                    <Text style={styles.summaryLabel}>Não lidas</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: '#7F8C8D' }]}>
                        {totalLidas}
                    </Text>
                    <Text style={styles.summaryLabel}>Lidas</Text>
                </View>
            </View>

            <View style={styles.topActions}>
                <View style={styles.filtrosRow}>
                    {renderFiltro('todas', 'Todas', notificacoes.length)}
                    {renderFiltro('nao_lidas', 'Não lidas', totalNaoLidas)}
                    {renderFiltro('lidas', 'Lidas', totalLidas)}
                </View>

                <TouchableOpacity
                    style={[styles.markAllButton, marcandoTodas && styles.markAllButtonDisabled]}
                    onPress={marcarTodasComoLidas}
                    disabled={marcandoTodas}
                    activeOpacity={0.88}
                >
                    {marcandoTodas ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-done-outline" size={16} color="#FFF" />
                            <Text style={styles.markAllButtonText}>Marcar todas</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={notificacoesFiltradas}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <EmptyState
                            icon="notifications-off-outline"
                            title="Nenhuma notificação"
                            subtitle={getEmptyStateText('notificacoes')}
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
        backgroundColor: '#F7F8FA',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 14,
    },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },

    headerText: {
        flex: 1,
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

    summaryCard: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#FFF',
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#EEF1F4',
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
        fontWeight: '600',
    },

    summaryDivider: {
        width: 1,
        height: 34,
        backgroundColor: '#EEF1F4',
    },

    topActions: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },

    filtrosRow: {
        flexDirection: 'row',
        marginBottom: 12,
        flexWrap: 'wrap',
    },

    filtroChip: {
        backgroundColor: '#EEF1F4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 8,
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

    markAllButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
    },

    markAllButtonDisabled: {
        opacity: 0.7,
    },

    markAllButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 6,
        fontSize: 13,
    },

    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },

    card: {
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    cardNaoLida: {
        borderColor: `${colors.primary}35`,
        backgroundColor: '#FCFDFF',
    },

    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    content: {
        flex: 1,
        paddingRight: 8,
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    titulo: {
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        color: colors.textDark,
        paddingRight: 8,
    },

    mensagem: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        lineHeight: 18,
    },

    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
    },

    data: {
        fontSize: 12,
        color: '#999',
    },

    rightArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    dotInline: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: colors.primary,
    },

    badgeNova: {
        backgroundColor: `${colors.primary}15`,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    badgeNovaText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: '800',
    },

    badgeLida: {
        backgroundColor: '#EEF1F4',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    badgeLidaText: {
        color: '#7F8C8D',
        fontSize: 11,
        fontWeight: '800',
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
    },

    emptyText: {
        marginTop: 8,
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
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