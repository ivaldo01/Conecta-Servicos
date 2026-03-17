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
    salvarNotificacaoSistema,
} from "../../utils/notificationUtils";
import {
    buscarCobrancaPorAgendamento,
    calcularValorTotalAgendamento,
    gerarCobrancaAgendamento,
} from '../../services/paymentService';

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

function getStatusPagamentoConfig(statusPagamento) {
    switch (statusPagamento) {
        case 'gerada':
            return { cor: '#FF9800', label: 'COBRANÇA GERADA' };
        case 'pago':
            return { cor: '#27AE60', label: 'PAGO' };
        case 'cancelado':
            return { cor: '#6c757d', label: 'CANCELADO' };
        case 'vencido':
            return { cor: '#C62828', label: 'VENCIDO' };
        case 'aguardando_cobranca':
        default:
            return { cor: '#5D6D7E', label: 'AGUARDANDO COBRANÇA' };
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function getNomeProfissional(agendamento) {
    return (
        agendamento?.colaboradorNome ||
        agendamento?.clinicaNome ||
        'Profissional'
    );
}

function getFormaPagamentoLabel(agendamento) {
    if (agendamento?.formaPagamentoLabel) {
        return agendamento.formaPagamentoLabel;
    }

    switch (agendamento?.formaPagamento) {
        case 'boleto':
            return 'Boleto';
        case 'cartao_credito':
            return 'Cartão de crédito';
        case 'cartao_debito':
            return 'Cartão de débito';
        case 'pix':
        default:
            return 'Pix';
    }
}

function formatarDataHora(timestamp) {
    if (!timestamp) return 'Ainda não gerada';

    try {
        if (typeof timestamp?.toDate === 'function') {
            return timestamp.toDate().toLocaleString('pt-BR');
        }

        if (timestamp instanceof Date) {
            return timestamp.toLocaleString('pt-BR');
        }

        if (typeof timestamp === 'string') {
            return timestamp;
        }

        return 'Data indisponível';
    } catch (error) {
        return 'Data indisponível';
    }
}


function getMensagemStatusPagamento(status) {
    switch (status) {
        case 'pago':
            return 'Pagamento confirmado com sucesso.';
        case 'cancelado':
            return 'Cobrança cancelada.';
        case 'vencido':
            return 'Cobrança marcada como vencida.';
        case 'gerada':
            return 'Cobrança gerada e aguardando pagamento.';
        case 'aguardando_cobranca':
        default:
            return 'Aguardando geração da cobrança.';
    }
}

export default function DetalhesAgendamentoPro({ route, navigation }) {
    const [agendamentoAtual, setAgendamentoAtual] = useState(route?.params?.agendamento || null);
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [loadingCobranca, setLoadingCobranca] = useState(false);
    const [pagamentoGerado, setPagamentoGerado] = useState(null);

    const statusConfig = useMemo(
        () => getStatusConfig(agendamentoAtual?.status),
        [agendamentoAtual?.status]
    );

    const statusPagamentoConfig = useMemo(
        () => getStatusPagamentoConfig(agendamentoAtual?.statusPagamento),
        [agendamentoAtual?.statusPagamento]
    );

    const totalAgendamento = useMemo(() => {
        return calcularValorTotalAgendamento(agendamentoAtual);
    }, [agendamentoAtual]);

    const podeConfirmar = agendamentoAtual?.status === 'pendente';
    const podeRecusar = agendamentoAtual?.status === 'pendente';
    const podeConcluir = agendamentoAtual?.status === 'confirmado';
    const cobrancaJaGerada = !!agendamentoAtual?.cobrancaGerada || !!agendamentoAtual?.pagamentoId;
    const podeControlarCobranca = cobrancaJaGerada;
    const pagamentoJaConfirmado = agendamentoAtual?.statusPagamento === 'pago';
    const pagamentoCancelado = agendamentoAtual?.statusPagamento === 'cancelado';
    const pagamentoVencido = agendamentoAtual?.statusPagamento === 'vencido';

    const abrirWhatsAppCliente = async () => {
        const tel =
            agendamentoAtual?.clienteWhatsapp?.replace(/\D/g, "") ||
            agendamentoAtual?.telefoneCliente?.replace(/\D/g, "") ||
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
        if (!agendamentoAtual?.clienteId) return;

        const profissionalNome = getNomeProfissional(agendamentoAtual);

        await salvarNotificacaoCliente({
            clienteId: agendamentoAtual.clienteId,
            status: novoStatus,
            agendamentoId: agendamentoAtual?.id || null,
            profissionalId: agendamentoAtual?.colaboradorId || agendamentoAtual?.clinicaId || null,
            profissionalNome,
        });

        const pushTokenCliente =
            agendamentoAtual?.clientePushToken ||
            '';

        if (!pushTokenCliente) {
            return;
        }

        if (novoStatus === 'concluido') {
            await enviarPushAoCliente(pushTokenCliente, novoStatus, {
                screen: 'AvaliarAtendimento',
                root: '',
                params: { agendamento: agendamentoAtual },
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
        if (!agendamentoAtual?.id) {
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

            await updateDoc(doc(db, "agendamentos", agendamentoAtual.id), dadosUpdate);
            setAgendamentoAtual((prev) => ({ ...prev, ...dadosUpdate, status: novoStatus }));

            await enviarNotificacaoCompletaParaCliente(novoStatus);

            Alert.alert("Sucesso", "Status atualizado com sucesso.");
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

    const notificarClienteSobreCobranca = async (dadosPagamento) => {
        if (!agendamentoAtual?.clienteId) return;

        await salvarNotificacaoSistema({
            userId: agendamentoAtual.clienteId,
            titulo: 'Cobrança gerada 💳',
            mensagem: `O profissional gerou a cobrança de ${formatarMoeda(dadosPagamento?.valorCobrado || totalAgendamento)} para o seu agendamento. Forma escolhida: ${getFormaPagamentoLabel(agendamentoAtual)}.`,
            screen: 'MeusAgendamentosCliente',
            root: 'Main',
            params: {},
        });
    };

    const carregarCobrancaExistente = async () => {
        if (!agendamentoAtual?.id) return;

        try {
            setLoadingCobranca(true);
            const cobranca = await buscarCobrancaPorAgendamento(agendamentoAtual.id);

            if (cobranca) {
                setPagamentoGerado(cobranca);
                setAgendamentoAtual((prev) => ({
                    ...prev,
                    pagamentoId: cobranca.id,
                    cobrancaGerada: true,
                    statusPagamento: cobranca.status || 'gerada',
                }));

                Alert.alert(
                    'Cobrança existente',
                    `Esta cobrança já foi criada.\n\nMétodo: ${cobranca.formaPagamentoLabel || 'Pix'}\nValor: ${formatarMoeda(cobranca.valorCobrado)}\nStatus: ${getStatusPagamentoConfig(cobranca.status).label}`
                );
            }
        } catch (error) {
            console.log('Erro ao buscar cobrança existente:', error);
        } finally {
            setLoadingCobranca(false);
        }
    };

    const confirmarGeracaoCobranca = async () => {
        if (!agendamentoAtual?.id) {
            Alert.alert('Erro', 'Agendamento inválido.');
            return;
        }

        try {
            setLoadingCobranca(true);

            const { pagamento, agendamentoAtualizado, jaExistia } = await gerarCobrancaAgendamento({
                agendamento: agendamentoAtual,
                profissionalId: auth.currentUser?.uid || null,
            });

            setPagamentoGerado(pagamento);
            setAgendamentoAtual(agendamentoAtualizado);

            if (!jaExistia) {
                await notificarClienteSobreCobranca(pagamento);
            }

            Alert.alert(
                jaExistia ? 'Cobrança já existia' : 'Cobrança gerada com sucesso',
                `Método: ${pagamento?.formaPagamentoLabel || getFormaPagamentoLabel(agendamentoAtualizado)}\nValor: ${formatarMoeda(pagamento?.valorCobrado || totalAgendamento)}\nStatus: ${getStatusPagamentoConfig(pagamento?.status || 'gerada').label}`
            );
        } catch (error) {
            console.log('Erro ao gerar cobrança:', error);
            Alert.alert('Erro', 'Não foi possível gerar a cobrança deste agendamento.');
        } finally {
            setLoadingCobranca(false);
        }
    };

    const gerarCobranca = async () => {
        if (cobrancaJaGerada) {
            await carregarCobrancaExistente();
            return;
        }

        Alert.alert(
            'Gerar cobrança',
            `Deseja gerar a cobrança de ${formatarMoeda(totalAgendamento)} em ${getFormaPagamentoLabel(agendamentoAtual)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Gerar agora',
                    onPress: confirmarGeracaoCobranca,
                },
            ]
        );
    };


    const atualizarStatusCobranca = async (novoStatus) => {
        if (!agendamentoAtual?.id) {
            Alert.alert('Erro', 'Agendamento inválido.');
            return;
        }

        try {
            setLoadingCobranca(true);

            const pagamentoRef = doc(db, 'pagamentos', agendamentoAtual.id);
            const agendamentoRef = doc(db, 'agendamentos', agendamentoAtual.id);

            const dadosPagamento = {
                status: novoStatus,
                atualizadoEm: serverTimestamp(),
                atualizadoPor: auth.currentUser?.uid || null,
            };

            const dadosAgendamento = {
                statusPagamento: novoStatus,
                atualizadoEm: serverTimestamp(),
            };

            if (novoStatus === 'pago') {
                dadosPagamento.pagoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = true;
                dadosAgendamento.pagamentoConfirmadoEm = serverTimestamp();
            }

            if (novoStatus === 'cancelado') {
                dadosPagamento.canceladoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = false;
            }

            if (novoStatus === 'vencido') {
                dadosPagamento.vencimentoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = false;
            }

            await updateDoc(pagamentoRef, dadosPagamento);
            await updateDoc(agendamentoRef, dadosAgendamento);

            const pagamentoAtualizado = {
                ...(pagamentoGerado || {}),
                ...dadosPagamento,
                status: novoStatus,
            };

            setPagamentoGerado(pagamentoAtualizado);
            setAgendamentoAtual((prev) => ({
                ...prev,
                ...dadosAgendamento,
                statusPagamento: novoStatus,
            }));

            if (agendamentoAtual?.clienteId) {
                await salvarNotificacaoSistema({
                    userId: agendamentoAtual.clienteId,
                    titulo: 'Atualização da cobrança 💳',
                    mensagem: `O status da sua cobrança foi atualizado para: ${getStatusPagamentoConfig(novoStatus).label}.`,
                    screen: 'PagamentoAgendamento',
                    root: 'Main',
                    params: {
                        agendamentoId: agendamentoAtual.id,
                    },
                });
            }

            Alert.alert('Sucesso', getMensagemStatusPagamento(novoStatus));
        } catch (error) {
            console.log('Erro ao atualizar status da cobrança:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o status da cobrança.');
        } finally {
            setLoadingCobranca(false);
        }
    };

    const confirmarPagamento = () => {
        Alert.alert(
            'Confirmar pagamento',
            'Deseja marcar esta cobrança como paga?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, confirmar',
                    onPress: () => atualizarStatusCobranca('pago'),
                },
            ]
        );
    };

    const cancelarCobranca = () => {
        Alert.alert(
            'Cancelar cobrança',
            'Deseja cancelar esta cobrança?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: () => atualizarStatusCobranca('cancelado'),
                },
            ]
        );
    };

    const marcarCobrancaVencida = () => {
        Alert.alert(
            'Marcar como vencida',
            'Deseja marcar esta cobrança como vencida?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, marcar',
                    style: 'destructive',
                    onPress: () => atualizarStatusCobranca('vencido'),
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
                        {agendamentoAtual?.clienteNome || "Cliente"}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>DATA E HORÁRIO</Text>
                    <Text style={styles.value}>
                        {agendamentoAtual?.data} às {agendamentoAtual?.horario}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>SERVIÇOS</Text>
                    {agendamentoAtual?.servicos && agendamentoAtual.servicos.length > 0 ? (
                        agendamentoAtual.servicos.map((s, index) => (
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

                    <Text style={[styles.label, { marginTop: 16 }]}>FORMA DE PAGAMENTO ESCOLHIDA</Text>
                    <Text style={styles.value}>{getFormaPagamentoLabel(agendamentoAtual)}</Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>STATUS DO PAGAMENTO</Text>
                    <View style={[styles.paymentBadge, { backgroundColor: statusPagamentoConfig.cor }]}>
                        <Text style={styles.paymentBadgeText}>{statusPagamentoConfig.label}</Text>
                    </View>

                    {agendamentoAtual?.pagamentoId ? (
                        <>
                            <Text style={[styles.label, { marginTop: 16 }]}>ID DA COBRANÇA</Text>
                            <Text style={styles.value}>{agendamentoAtual.pagamentoId}</Text>
                        </>
                    ) : null}

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

                <View style={styles.billingCard}>
                    <View style={styles.billingHeader}>
                        <Ionicons name="cash-outline" size={20} color={colors.primary} />
                        <Text style={styles.billingTitle}>Cobrança do agendamento</Text>
                    </View>

                    <Text style={styles.billingText}>
                        O profissional já pode gerar a cobrança com base no valor do serviço e na forma de pagamento escolhida pelo cliente.
                    </Text>

                    <View style={styles.billingInfoBox}>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Método</Text>
                            <Text style={styles.billingInfoValue}>{getFormaPagamentoLabel(agendamentoAtual)}</Text>
                        </View>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Valor</Text>
                            <Text style={styles.billingInfoValue}>{formatarMoeda(totalAgendamento)}</Text>
                        </View>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Status</Text>
                            <Text style={[styles.billingInfoValue, { color: statusPagamentoConfig.cor }]}>
                                {statusPagamentoConfig.label}
                            </Text>
                        </View>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Gerada em</Text>
                            <Text style={styles.billingInfoValue}>{formatarDataHora(agendamentoAtual?.cobrancaGeradaEm)}</Text>
                        </View>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Observação</Text>
                            <Text style={styles.billingInfoValue}>{getMensagemStatusPagamento(agendamentoAtual?.statusPagamento)}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.billingButton, loadingCobranca && { opacity: 0.7 }]}
                        onPress={gerarCobranca}
                        activeOpacity={0.9}
                        disabled={loadingCobranca}
                    >
                        {loadingCobranca ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name={cobrancaJaGerada ? 'eye-outline' : 'receipt-outline'}
                                    size={20}
                                    color="#FFF"
                                />
                                <Text style={styles.billingButtonText}>
                                    {cobrancaJaGerada ? 'VER COBRANÇA' : 'GERAR COBRANÇA'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {podeControlarCobranca && (
                        <View style={styles.billingControls}>
                            {!pagamentoJaConfirmado && !pagamentoCancelado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.confirmPaymentButton]}
                                    onPress={confirmarPagamento}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="checkmark-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Confirmar pagamento</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Marque esta cobrança como recebida e confirme para o cliente.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}

                            {!pagamentoCancelado && !pagamentoJaConfirmado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.expirePaymentButton]}
                                    onPress={marcarCobrancaVencida}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="alert-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Marcar como vencida</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Informe que a cobrança venceu e precisa ser gerada novamente.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}

                            {!pagamentoCancelado && !pagamentoJaConfirmado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.cancelPaymentButton]}
                                    onPress={cancelarCobranca}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="close-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Cancelar cobrança</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Cancele esta cobrança e avise o cliente em tempo real.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <Text style={styles.billingFootnote}>
                        Nesta etapa a cobrança já fica registrada no Firestore. Depois vamos ligar isso à API real do banco.
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
        fontSize: 17,
    },
    paymentBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 14,
    },
    paymentBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '800',
    },
    whatsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3FFF7',
        borderWidth: 1,
        borderColor: '#D2F5DE',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        alignSelf: 'flex-start',
    },
    whatsButtonText: {
        marginLeft: 8,
        color: '#1E8E54',
        fontWeight: '700',
    },
    billingCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 18,
        padding: 18,
        elevation: 2,
    },
    billingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    billingTitle: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },
    billingText: {
        color: '#555',
        lineHeight: 20,
        marginBottom: 14,
    },
    billingInfoBox: {
        backgroundColor: '#F8FAFD',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E6ECF3',
        marginBottom: 14,
    },
    billingInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    billingInfoLabel: {
        color: '#6C7A89',
        fontWeight: '700',
        flex: 1,
    },
    billingInfoValue: {
        color: '#263238',
        fontWeight: '800',
        flex: 1,
        textAlign: 'right',
    },
    billingButton: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    billingButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },
    billingControls: {
        marginTop: 14,
    },
    billingControlCard: {
        borderRadius: 18,
        paddingVertical: 15,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    billingControlIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    billingControlTextBox: {
        flex: 1,
        paddingRight: 10,
    },
    billingControlTitle: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15,
    },
    billingControlDescription: {
        color: 'rgba(255,255,255,0.92)',
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
    },
    confirmPaymentButton: {
        backgroundColor: '#27AE60',
    },
    expirePaymentButton: {
        backgroundColor: '#E67E22',
    },
    cancelPaymentButton: {
        backgroundColor: '#C62828',
        marginBottom: 0,
    },
    billingFootnote: {
        marginTop: 12,
        color: '#6C7A89',
        lineHeight: 18,
        fontSize: 12,
    },
    loadingBox: {
        marginTop: 18,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
    },
    actionsArea: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    actionButton: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },
    confirmButton: {
        backgroundColor: '#27AE60',
    },
    rejectButton: {
        backgroundColor: '#C62828',
    },
    finishButton: {
        backgroundColor: '#1565C0',
    },
});
