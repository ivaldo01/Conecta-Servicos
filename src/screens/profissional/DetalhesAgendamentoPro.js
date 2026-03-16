import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    doc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import {
    enviarPushAoCliente,
    salvarNotificacaoCliente,
} from "../../utils/notificationUtils";

function getStatusConfig(status) {
    switch (status) {
        case 'confirmado':
            return { cor: '#27AE60', label: 'CONFIRMADO' };
        case 'cancelado':
            return { cor: '#6c757d', label: 'CANCELADO' };
        case 'recusado':
            return { cor: '#C62828', label: 'RECUSADO' };
        case 'concluido':
            return { cor: '#1565C0', label: 'CONCLUÍDO' };
        default:
            return { cor: '#E67E22', label: 'PENDENTE' };
    }
}

function formatarMoeda(valor) {
    const numero = Number(valor || 0);
    return `R$ ${numero.toFixed(2)}`;
}

function getNomeProfissional(agendamento) {
    return (
        agendamento?.colaboradorNome ||
        agendamento?.clinicaNome ||
        'Profissional'
    );
}

export default function DetalhesAgendamentoPro({ route, navigation }) {
    const { agendamento } = route.params || {};

    const [loadingAcao, setLoadingAcao] = useState(false);

    const statusConfig = useMemo(
        () => getStatusConfig(agendamento?.status),
        [agendamento?.status]
    );

    const totalAgendamento = useMemo(() => {
        return (
            agendamento?.servicos?.reduce(
                (acc, s) => acc + parseFloat(s.preco || 0),
                0
            ) || parseFloat(agendamento?.preco || 0)
        );
    }, [agendamento]);

    const podeConfirmar = agendamento?.status === 'pendente';
    const podeRecusar = agendamento?.status === 'pendente';
    const podeConcluir = agendamento?.status === 'confirmado';

    const abrirWhatsAppCliente = async () => {
        const tel =
            agendamento?.clienteWhatsapp?.replace(/\D/g, "") ||
            agendamento?.telefoneCliente?.replace(/\D/g, "") ||
            "";

        if (!tel) {
            Alert.alert("Aviso", "Número do cliente não disponível.");
            return;
        }

        const url = `https://wa.me/55${tel}`;

        try {
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
            }
        } catch (error) {
            console.log("Erro ao abrir WhatsApp:", error);
            Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
        }
    };

    const enviarNotificacaoCompletaParaCliente = async (novoStatus) => {
        if (!agendamento?.clienteId) return;

        const profissionalNome = getNomeProfissional(agendamento);

        await salvarNotificacaoCliente({
            clienteId: agendamento.clienteId,
            status: novoStatus,
            agendamentoId: agendamento?.id || null,
            profissionalId: agendamento?.colaboradorId || agendamento?.clinicaId || null,
            profissionalNome,
        });

        const pushTokenCliente =
            agendamento?.clientePushToken ||
            '';

        if (!pushTokenCliente) {
            return;
        }

        if (novoStatus === 'concluido') {
            await enviarPushAoCliente(pushTokenCliente, novoStatus, {
                screen: 'AvaliarAtendimento',
                root: '',
                params: { agendamento },
            });
            return;
        }

        await enviarPushAoCliente(pushTokenCliente, novoStatus, {
            screen: 'MeusAgendamentosCliente',
            root: 'Main',
            params: {},
        });
    };

    const atualizarStatus = async (novoStatus) => {
        if (!agendamento?.id) {
            Alert.alert("Erro", "Agendamento inválido.");
            return;
        }

        try {
            setLoadingAcao(true);

            const dadosUpdate = {
                status: novoStatus,
                atualizadoEm: serverTimestamp(),
                atualizadoPor: auth.currentUser?.uid || null,
            };

            if (novoStatus === 'confirmado') {
                dadosUpdate.confirmadoEm = serverTimestamp();
            }

            if (novoStatus === 'recusado') {
                dadosUpdate.recusadoEm = serverTimestamp();
            }

            if (novoStatus === 'concluido') {
                dadosUpdate.concluidoEm = serverTimestamp();
            }

            await updateDoc(doc(db, "agendamentos", agendamento.id), dadosUpdate);

            await enviarNotificacaoCompletaParaCliente(novoStatus);

            Alert.alert("Sucesso", "Status atualizado com sucesso.");
            navigation.goBack();
        } catch (error) {
            console.log("Erro ao atualizar status:", error);
            Alert.alert("Erro", "Não foi possível atualizar o status.");
        } finally {
            setLoadingAcao(false);
        }
    };

    const confirmarAgendamento = () => {
        Alert.alert(
            "Confirmar agendamento",
            "Deseja confirmar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, confirmar",
                    onPress: () => atualizarStatus('confirmado'),
                },
            ]
        );
    };

    const recusarAgendamento = () => {
        Alert.alert(
            "Recusar agendamento",
            "Deseja recusar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, recusar",
                    style: "destructive",
                    onPress: () => atualizarStatus('recusado'),
                },
            ]
        );
    };

    const concluirAgendamento = () => {
        Alert.alert(
            "Concluir atendimento",
            "Deseja marcar este atendimento como concluído?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, concluir",
                    onPress: () => atualizarStatus('concluido'),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                    </TouchableOpacity>

                    <View style={styles.headerTextArea}>
                        <Text style={styles.title}>Detalhes do Agendamento</Text>
                        <Text style={styles.subtitle}>Painel do profissional</Text>
                    </View>
                </View>

                <View style={styles.statusArea}>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.cor }]}>
                        <Text style={styles.statusText}>{statusConfig.label}</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <Text style={styles.value}>
                        {agendamento?.clienteNome || "Cliente"}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>DATA E HORÁRIO</Text>
                    <Text style={styles.value}>
                        {agendamento?.data} às {agendamento?.horario}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>SERVIÇOS</Text>
                    {agendamento?.servicos && agendamento.servicos.length > 0 ? (
                        agendamento.servicos.map((s, index) => (
                            <View key={index} style={styles.itemServico}>
                                <Text style={styles.servicoNome}>• {s.nome}</Text>
                                <Text style={styles.servicoPreco}>{formatarMoeda(s.preco)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.value}>Nenhum serviço informado</Text>
                    )}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>VALOR TOTAL</Text>
                        <Text style={styles.totalValue}>{formatarMoeda(totalAgendamento)}</Text>
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>WHATSAPP DO CLIENTE</Text>
                    <TouchableOpacity
                        style={styles.whatsButton}
                        onPress={abrirWhatsAppCliente}
                        activeOpacity={0.88}
                    >
                        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        <Text style={styles.whatsButtonText}>Chamar no WhatsApp</Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { marginTop: 16 }]}>STATUS ATUAL</Text>
                    <Text style={[styles.value, { color: statusConfig.cor, fontWeight: '800' }]}>
                        {statusConfig.label}
                    </Text>
                </View>

                {loadingAcao ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Atualizando status...</Text>
                    </View>
                ) : (
                    <View style={styles.actionsArea}>
                        {podeConfirmar && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.confirmButton]}
                                onPress={confirmarAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>ACEITAR AGENDAMENTO</Text>
                            </TouchableOpacity>
                        )}

                        {podeRecusar && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={recusarAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>RECUSAR AGENDAMENTO</Text>
                            </TouchableOpacity>
                        )}

                        {podeConcluir && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.finishButton]}
                                onPress={concluirAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>MARCAR COMO CONCLUÍDO</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
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
        paddingBottom: 12,
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

    headerTextArea: {
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

    statusArea: {
        paddingHorizontal: 16,
        marginBottom: 8,
    },

    statusBadge: {
        alignSelf: 'flex-start',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },

    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },

    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        padding: 18,
        borderRadius: 18,
        elevation: 2,
    },

    label: {
        fontSize: 11,
        color: '#999',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 6,
    },

    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },

    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    servicoNome: {
        fontSize: 14,
        color: '#444',
        flex: 1,
        paddingRight: 10,
    },

    servicoPreco: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        marginTop: 12,
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    totalLabel: {
        fontWeight: 'bold',
        color: '#333',
    },

    totalValue: {
        fontWeight: 'bold',
        color: colors.primary,
        fontSize: 18,
    },

    whatsButton: {
        backgroundColor: '#F0FFF4',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
    },

    whatsButtonText: {
        marginLeft: 8,
        color: '#25D366',
        fontWeight: '800',
    },

    actionsArea: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    actionButton: {
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },

    confirmButton: {
        backgroundColor: '#27AE60',
    },

    rejectButton: {
        backgroundColor: '#E74C3C',
    },

    finishButton: {
        backgroundColor: '#1565C0',
    },

    actionButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },

    loadingBox: {
        paddingTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingText: {
        marginTop: 10,
        color: colors.secondary,
        fontSize: 14,
    },
});