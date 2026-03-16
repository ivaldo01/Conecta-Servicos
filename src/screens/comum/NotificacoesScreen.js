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
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

function formatarData(item) {
    if (!item?.createdAt?.seconds) return 'Agora';
    const data = new Date(item.createdAt.seconds * 1000);
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
        default:
            return 'notifications-outline';
    }
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
                console.log('Erro ao carregar notificações:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const totalNaoLidas = useMemo(() => {
        return notificacoes.filter((item) => !item.lida).length;
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
        if (item.lida) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            await updateDoc(
                doc(db, 'usuarios', user.uid, 'notificacoes', item.id),
                { lida: true }
            );
        } catch (error) {
            console.log('Erro ao marcar notificação como lida:', error);
        }
    };

    const abrirDestinoNotificacao = (item) => {
        try {
            if (item?.root === 'Main' && item?.screen) {
                navigation.navigate('Main', {
                    screen: item.screen,
                    params: item.params || {},
                });
                return;
            }

            if (item?.screen) {
                navigation.navigate(item.screen, item.params || {});
                return;
            }

            if (item?.tipo === 'novo_agendamento') {
                navigation.navigate('Main', {
                    screen: 'AgendaProfissional',
                });
                return;
            }

            if (item?.tipo === 'nova_avaliacao') {
                navigation.navigate('Main', {
                    screen: 'RelatoriosPro',
                });
                return;
            }

            if (item?.tipo === 'atualizacao_agendamento') {
                navigation.navigate('Main', {
                    screen: 'MeusAgendamentosCliente',
                });
                return;
            }

            if (item?.tipo === 'sistema') {
                return;
            }
        } catch (error) {
            console.log('Erro ao abrir destino da notificação:', error);
            Alert.alert('Aviso', 'Não foi possível abrir o destino desta notificação.');
        }
    };

    const abrirNotificacao = async (item) => {
        await marcarComoLida(item);
        abrirDestinoNotificacao(item);
    };

    const marcarTodasComoLidas = async () => {
        const user = auth.currentUser;
        if (!user) return;

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
            console.log('Erro ao marcar todas como lidas:', error);
            Alert.alert('Erro', 'Não foi possível concluir essa ação.');
        } finally {
            setMarcandoTodas(false);
        }
    };

    const renderFiltro = (key, label) => {
        const ativo = filtro === key;

        return (
            <TouchableOpacity
                key={key}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                activeOpacity={0.88}
                onPress={() => setFiltro(key)}
            >
                <Text style={[styles.filtroChipText, ativo && styles.filtroChipTextAtivo]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={[styles.card, !item.lida && styles.cardNaoLida]}
                activeOpacity={0.9}
                onPress={() => abrirNotificacao(item)}
            >
                <View style={styles.iconBox}>
                    <Ionicons name={getIcon(item.tipo)} size={22} color={colors.primary} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.titulo}>{item.titulo || 'Notificação'}</Text>
                    <Text style={styles.mensagem}>{item.mensagem || 'Sem detalhes.'}</Text>
                    <Text style={styles.data}>{formatarData(item)}</Text>
                </View>

                <View style={styles.rightArea}>
                    {!item.lida && <View style={styles.dot} />}
                    <Ionicons
                        name="chevron-forward-outline"
                        size={18}
                        color="#9AA0A6"
                        style={{ marginTop: 8 }}
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
                >
                    <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                </TouchableOpacity>

                <View style={styles.headerText}>
                    <Text style={styles.title}>Notificações</Text>
                    <Text style={styles.subtitle}>{totalNaoLidas} não lida(s)</Text>
                </View>
            </View>

            <View style={styles.topActions}>
                <View style={styles.filtrosRow}>
                    {renderFiltro('todas', 'Todas')}
                    {renderFiltro('nao_lidas', 'Não lidas')}
                    {renderFiltro('lidas', 'Lidas')}
                </View>

                <TouchableOpacity
                    style={[styles.markAllButton, marcandoTodas && { opacity: 0.7 }]}
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
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="notifications-off-outline" size={34} color="#A0A0A0" />
                        <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                        <Text style={styles.emptyText}>
                            Não há notificações neste filtro no momento.
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

    topActions: {
        paddingHorizontal: 16,
        paddingBottom: 12,
    },

    filtrosRow: {
        flexDirection: 'row',
        marginBottom: 12,
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

    markAllButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
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
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },

    cardNaoLida: {
        borderWidth: 1,
        borderColor: `${colors.primary}30`,
    },

    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    content: {
        flex: 1,
        paddingRight: 8,
    },

    titulo: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textDark,
    },

    mensagem: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        lineHeight: 18,
    },

    data: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
    },

    rightArea: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
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