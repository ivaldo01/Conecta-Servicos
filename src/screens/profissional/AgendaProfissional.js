import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Vibration,
    ScrollView,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    query,
    where,
    doc,
    updateDoc,
    onSnapshot,
    getDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

import { enviarPushAoCliente } from '../../utils/notificationUtils';
import { getStatusColor, getMensagemStatus } from '../../utils/statusUtils';
import {
    getHojeStr,
    calcularTotalAgendamento,
    getResumoServicos,
    filtrarAgendamentosPorStatus,
    contarAgendamentosPorStatus,
    montarDashboardHoje,
    ordenarAgendamentosPorCriacao,
} from '../../utils/agendamentoUtils';
import { imprimirOrdemServico } from '../../utils/pdfUtils';

export default function AgendaProfissional({ navigation }) {
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
        let unsubscribe = null;

        const iniciar = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const perfilRef = doc(db, "usuarios", user.uid);
                const perfilSnap = await getDoc(perfilRef);
                const perfilData = perfilSnap.exists() ? perfilSnap.data() : {};

                const ehColaborador = perfilData?.perfil === "colaborador";

                const q = ehColaborador
                    ? query(collection(db, "agendamentos"), where("colaboradorId", "==", user.uid))
                    : query(collection(db, "agendamentos"), where("clinicaId", "==", user.uid));

                unsubscribe = onSnapshot(q, async (snapshot) => {
                    const dados = snapshot.docs.map((d) => ({
                        id: d.id,
                        ...d.data(),
                    }));

                    const ordenados = ordenarAgendamentosPorCriacao(dados);

                    if (ordenados.some((item) => item.vistoPeloPro === false)) {
                        Vibration.vibrate(500);
                    }

                    setAgendamentos(ordenados);
                    setLoading(false);
                });
            } catch (error) {
                console.log("Erro ao carregar agenda profissional:", error);
                setLoading(false);
            }
        };

        iniciar();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const hojeStr = useMemo(() => getHojeStr(), []);

    const agendamentosFiltrados = useMemo(() => {
        return filtrarAgendamentosPorStatus(agendamentos, filtroStatus);
    }, [agendamentos, filtroStatus]);

    const contagemPorStatus = useMemo(() => {
        return contarAgendamentosPorStatus(agendamentos);
    }, [agendamentos]);

    const dashboardHoje = useMemo(() => {
        return montarDashboardHoje(agendamentos, hojeStr);
    }, [agendamentos, hojeStr]);

    const alterarStatus = async (item, novoStatus) => {
        try {
            await updateDoc(doc(db, "agendamentos", item.id), {
                status: novoStatus,
                vistoPeloPro: true,
            });

            const clienteSnap = await getDoc(doc(db, "usuarios", item.clienteId));

            if (clienteSnap.exists() && clienteSnap.data().pushToken) {
                await enviarPushAoCliente(clienteSnap.data().pushToken, novoStatus);
            }

            Alert.alert("Sucesso", getMensagemStatus(novoStatus));
        } catch (e) {
            console.log("Erro ao atualizar status:", e);
            Alert.alert("Erro", "Falha ao atualizar status.");
        }
    };

    const confirmarCancelamento = (item) => {
        Alert.alert(
            "Cancelar agendamento",
            "Tem certeza que deseja cancelar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, cancelar",
                    style: "destructive",
                    onPress: () => alterarStatus(item, 'cancelado'),
                },
            ]
        );
    };

    const confirmarRecusa = (item) => {
        Alert.alert(
            "Recusar agendamento",
            "Tem certeza que deseja recusar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, recusar",
                    style: "destructive",
                    onPress: () => alterarStatus(item, 'recusado'),
                },
            ]
        );
    };

    const confirmarConclusao = (item) => {
        Alert.alert(
            "Concluir atendimento",
            "Tem certeza que deseja marcar este atendimento como concluído?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, concluir",
                    onPress: () => alterarStatus(item, 'concluido'),
                },
            ]
        );
    };

    const imprimirOS = async (item) => {
        try {
            await imprimirOrdemServico(item);
        } catch (error) {
            console.log("Erro ao gerar PDF:", error);
            Alert.alert("Erro", "Falha ao gerar PDF.");
        }
    };

    const abrirDetalhes = async (item) => {
        try {
            if (item.vistoPeloPro === false) {
                await updateDoc(doc(db, "agendamentos", item.id), {
                    vistoPeloPro: true,
                });
            }

            navigation.navigate("DetalhesAgendamentoPro", {
                agendamentoId: item.id,
            });
        } catch (error) {
            console.log("Erro ao abrir detalhes:", error);
            Alert.alert("Erro", "Não foi possível abrir os detalhes.");
        }
    };

    const renderAcoes = (item) => {
        const status = item.status || 'pendente';

        if (status === 'pendente') {
            return (
                <View style={styles.footerActions}>
                    <TouchableOpacity
                        style={styles.actionBtnOutline}
                        onPress={() => confirmarRecusa(item)}
                    >
                        <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>Recusar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtnSolid}
                        onPress={() => alterarStatus(item, 'confirmado')}
                    >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.actionBtnTextSolid}>Aceitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtnCancel}
                        onPress={() => confirmarCancelamento(item)}
                    >
                        <Ionicons name="trash-outline" size={18} color="#FFF" />
                        <Text style={styles.actionBtnTextSolid}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (status === 'confirmado') {
            return (
                <>
                    <View style={styles.footerActions}>
                        <TouchableOpacity
                            style={styles.actionBtnConcluir}
                            onPress={() => confirmarConclusao(item)}
                        >
                            <Ionicons name="checkmark-done-outline" size={18} color="#FFF" />
                            <Text style={styles.actionBtnTextSolid}>Concluir</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtnCancel}
                            onPress={() => confirmarCancelamento(item)}
                        >
                            <Ionicons name="trash-outline" size={18} color="#FFF" />
                            <Text style={styles.actionBtnTextSolid}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.btnFullWidth} onPress={() => imprimirOS(item)}>
                        <Ionicons name="print-outline" size={20} color={colors.primary} />
                        <Text style={styles.btnFullWidthText}>Gerar Ordem de Serviço (PDF)</Text>
                    </TouchableOpacity>
                </>
            );
        }

        return (
            <TouchableOpacity style={styles.btnFullWidth} onPress={() => abrirDetalhes(item)}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                <Text style={styles.btnFullWidthText}>Ver detalhes</Text>
            </TouchableOpacity>
        );
    };

    const renderCard = ({ item }) => {
        const totalCard = calcularTotalAgendamento(item);
        const statusColor = getStatusColor(item.status);
        const ehNovo = item.vistoPeloPro === false;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.card, ehNovo && styles.cardNovo]}
                onPress={() => abrirDetalhes(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clienteNome}>{item.clienteNome || "Cliente"}</Text>
                        <Text style={styles.servicoResumo}>
                            {getResumoServicos(item)}
                        </Text>
                    </View>

                    <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                            {(item.status || 'pendente').toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
                        <Text style={styles.detailText}>{item.data}</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={16} color={colors.secondary} />
                        <Text style={styles.detailText}>{item.horario}</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={16} color={colors.success} />
                        <Text style={[styles.detailText, { fontWeight: 'bold' }]}>
                            R$ {totalCard.toFixed(2)}
                        </Text>
                    </View>
                </View>

                <View style={styles.tapHint}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
                    <Text style={styles.tapHintText}>Toque para ver os dados do cliente</Text>
                </View>

                {renderAcoes(item)}
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
            >
                <Text style={[styles.filtroChipText, ativo && styles.filtroChipTextAtivo]}>
                    {filtro.label} ({contagemPorStatus[filtro.key] || 0})
                </Text>
            </TouchableOpacity>
        );
    };

    const renderDashboardCard = (titulo, valor, icone, corFundo) => (
        <View style={[styles.dashboardCard, { backgroundColor: corFundo }]}>
            <Ionicons name={icone} size={22} color="#FFF" />
            <Text style={styles.dashboardValor}>{valor}</Text>
            <Text style={styles.dashboardTitulo}>{titulo}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={agendamentosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>Minha Agenda</Text>
                            <Text style={styles.subtitle}>
                                {agendamentosFiltrados.length} agendamento(s) em {filtros.find(f => f.key === filtroStatus)?.label.toLowerCase()}
                            </Text>
                        </View>

                        <View style={styles.dashboardWrapper}>
                            <Text style={styles.dashboardSectionTitle}>Resumo de Hoje</Text>

                            <View style={styles.dashboardGrid}>
                                {renderDashboardCard("Hoje", dashboardHoje.totalHoje, "calendar-outline", "#5E60CE")}
                                {renderDashboardCard("Pendentes", dashboardHoje.pendentesHoje, "time-outline", "#F4A261")}
                                {renderDashboardCard("Confirmados", dashboardHoje.confirmadosHoje, "checkmark-circle-outline", "#2A9D8F")}
                                {renderDashboardCard("Concluídos", dashboardHoje.concluidosHoje, "checkmark-done-outline", "#1565C0")}
                            </View>

                            <View style={styles.dashboardExtraBox}>
                                <Ionicons name="close-circle-outline" size={18} color="#6c757d" />
                                <Text style={styles.dashboardExtraText}>
                                    Cancelados hoje: {dashboardHoje.canceladosHoje}
                                </Text>
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
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>
                            Nenhum agendamento encontrado neste filtro.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background || '#F8F9FA',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    header: {
        padding: 25,
        paddingTop: 60,
        backgroundColor: '#FFF',
    },

    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    dashboardWrapper: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#F8F9FA',
    },

    dashboardSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 12,
    },

    dashboardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },

    dashboardCard: {
        width: '48%',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 14,
        marginBottom: 12,
    },

    dashboardValor: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 10,
    },

    dashboardTitulo: {
        fontSize: 13,
        color: '#FFF',
        marginTop: 4,
        fontWeight: '600',
    },

    dashboardExtraBox: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 6,
    },

    dashboardExtraText: {
        marginLeft: 8,
        color: '#6c757d',
        fontWeight: '600',
    },

    filtrosWrapper: {
        backgroundColor: '#FFF',
        paddingBottom: 10,
        paddingTop: 6,
    },

    filtrosContainer: {
        paddingHorizontal: 20,
        paddingTop: 5,
        paddingBottom: 5,
    },

    filtroChip: {
        backgroundColor: '#F1F3F5',
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
        fontWeight: '600',
        fontSize: 13,
    },

    filtroChipTextAtivo: {
        color: '#FFF',
    },

    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },

    cardNovo: {
        borderLeftWidth: 6,
        borderLeftColor: colors.primary,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },

    clientInfo: {
        flex: 1,
        paddingRight: 10,
    },

    clienteNome: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    servicoResumo: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: 2,
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },

    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },

    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F0F0F0',
    },

    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    detailText: {
        fontSize: 13,
        marginLeft: 5,
        color: colors.textDark,
    },

    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 10,
    },

    tapHintText: {
        marginLeft: 6,
        fontSize: 12,
        color: colors.secondary,
    },

    footerActions: {
        flexDirection: 'row',
        marginTop: 8,
        justifyContent: 'space-between',
    },

    actionBtnOutline: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.danger,
        marginRight: 8,
    },

    actionBtnSolid: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.success,
        marginRight: 8,
    },

    actionBtnConcluir: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#1565C0',
        marginRight: 8,
    },

    actionBtnCancel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.danger,
    },

    actionBtnText: {
        fontWeight: 'bold',
        marginLeft: 5,
    },

    actionBtnTextSolid: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 5,
    },

    btnFullWidth: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: `${colors.primary}10`,
        borderRadius: 12,
        marginTop: 12,
    },

    btnFullWidthText: {
        color: colors.primary,
        fontWeight: 'bold',
        marginLeft: 8,
    },

    empty: {
        alignItems: 'center',
        marginTop: 50,
        paddingHorizontal: 20,
    },

    emptyText: {
        color: colors.secondary,
        textAlign: 'center',
    },
});