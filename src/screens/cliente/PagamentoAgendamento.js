import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Linking,
    Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import {
    FORMAS_PAGAMENTO_LABEL,
    STATUS_PAGAMENTO,
    gerarCobrancaAgendamento,
    consultarStatusPagamento,
    getStatusPagamentoLabel,
    getStatusPagamentoMensagem,
} from '../../services/paymentService';
import { handleAppError } from '../../utils/errorUtils';

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function getStatusPagamentoColor(status) {
    switch (status) {
        case STATUS_PAGAMENTO.PAGO:
            return colors.success || '#2ecc71';
        case STATUS_PAGAMENTO.CANCELADO:
            return colors.danger || '#e74c3c';
        case STATUS_PAGAMENTO.VENCIDO:
            return colors.warning || '#f39c12';
        case STATUS_PAGAMENTO.EM_DISPUTA:
            return '#8E44AD';
        case STATUS_PAGAMENTO.GERADA:
            return colors.info || colors.primary;
        case STATUS_PAGAMENTO.AGUARDANDO_COBRANCA:
        default:
            return colors.secondary || '#7f8c8d';
    }
}

function getQrImageUri(qrCodePix) {
    if (!qrCodePix) return null;

    if (String(qrCodePix).startsWith('data:image')) {
        return qrCodePix;
    }

    return `data:image/png;base64,${qrCodePix}`;
}

function getValorAgendamento(agendamento, pagamento) {
    if (pagamento?.valorBruto !== undefined && pagamento?.valorBruto !== null) {
        return Number(pagamento.valorBruto || 0);
    }

    if (agendamento?.valorTotal !== undefined && agendamento?.valorTotal !== null) {
        return Number(agendamento.valorTotal || 0);
    }

    const totalServicos = Array.isArray(agendamento?.servicos)
        ? agendamento.servicos.reduce(
            (acc, servico) => acc + Number(servico?.preco || 0),
            0
        )
        : 0;

    return totalServicos || Number(agendamento?.preco || 0);
}

export default function PagamentoAgendamento({ route, navigation }) {
    const agendamentoParam = route?.params?.agendamento || null;
    const agendamentoId =
        route?.params?.agendamentoId || agendamentoParam?.id || null;

    const [loading, setLoading] = useState(true);
    const [gerandoCobranca, setGerandoCobranca] = useState(false);
    const [consultandoStatus, setConsultandoStatus] = useState(false);
    const [agendamento, setAgendamento] = useState(agendamentoParam);
    const [pagamento, setPagamento] = useState(null);

    useEffect(() => {
        if (!agendamentoId) {
            setLoading(false);
            return;
        }

        const unsubAgendamento = onSnapshot(
            doc(db, 'agendamentos', agendamentoId),
            (snap) => {
                if (snap.exists()) {
                    setAgendamento({
                        id: snap.id,
                        ...snap.data(),
                    });
                }
                setLoading(false);
            },
            (error) => {
                handleAppError({
                    context: 'Ouvir agendamento no pagamento',
                    error,
                    title: 'Erro',
                    fallbackMessage: 'Não foi possível carregar o agendamento.',
                });
                setLoading(false);
            }
        );

        const unsubPagamento = onSnapshot(
            doc(db, 'pagamentos', agendamentoId),
            (snap) => {
                if (snap.exists()) {
                    setPagamento({
                        id: snap.id,
                        ...snap.data(),
                    });
                } else {
                    setPagamento(null);
                }
            },
            (error) => {
                handleAppError({
                    context: 'Ouvir pagamento do agendamento',
                    error,
                    title: 'Erro',
                    fallbackMessage: 'Não foi possível carregar a cobrança.',
                    showAlert: false,
                });
            }
        );

        return () => {
            unsubAgendamento?.();
            unsubPagamento?.();
        };
    }, [agendamentoId]);

    const valorTotal = useMemo(
        () => getValorAgendamento(agendamento, pagamento),
        [agendamento, pagamento]
    );

    const formaPagamento =
        pagamento?.formaPagamento || agendamento?.formaPagamento || 'pix';

    const formaPagamentoLabel =
        pagamento?.formaPagamentoLabel ||
        agendamento?.formaPagamentoLabel ||
        FORMAS_PAGAMENTO_LABEL[formaPagamento] ||
        'Pix';

    const statusPagamento =
        pagamento?.status ||
        agendamento?.statusPagamento ||
        STATUS_PAGAMENTO.AGUARDANDO_COBRANCA;

    const statusColor = getStatusPagamentoColor(statusPagamento);
    const statusLabel = getStatusPagamentoLabel(statusPagamento);
    const qrImageUri = getQrImageUri(pagamento?.qrCodePix);

    async function gerarCobranca() {
        if (!agendamento?.id) {
            Alert.alert('Erro', 'Agendamento inválido para gerar a cobrança.');
            return;
        }

        try {
            setGerandoCobranca(true);
            await gerarCobrancaAgendamento({ agendamento });
            Alert.alert('Sucesso', 'Cobrança Pix gerada com sucesso.');
        } catch (error) {
            handleAppError({
                context: 'Gerar cobrança Asaas',
                error,
                title: 'Erro ao gerar cobrança',
                fallbackMessage: 'Não foi possível gerar a cobrança agora.',
            });
        } finally {
            setGerandoCobranca(false);
        }
    }

    async function atualizarStatusPagamento() {
        if (!agendamentoId) return;

        try {
            setConsultandoStatus(true);
            const pagamentoAtualizado = await consultarStatusPagamento(agendamentoId);

            if (pagamentoAtualizado?.status === STATUS_PAGAMENTO.PAGO) {
                Alert.alert('Pagamento confirmado', 'O pagamento foi confirmado com sucesso.');
                return;
            }

            Alert.alert('Status atualizado', 'Consultamos o status mais recente da cobrança.');
        } catch (error) {
            handleAppError({
                context: 'Consultar pagamento Asaas',
                error,
                title: 'Erro ao consultar',
                fallbackMessage: 'Não foi possível consultar o pagamento agora.',
            });
        } finally {
            setConsultandoStatus(false);
        }
    }

    async function abrirLink(url, tituloIndisponivel, mensagemIndisponivel) {
        if (!url) {
            Alert.alert(tituloIndisponivel, mensagemIndisponivel);
            return;
        }

        const canOpen = await Linking.canOpenURL(url);

        if (!canOpen) {
            Alert.alert('Não foi possível abrir', 'O link informado é inválido.');
            return;
        }

        await Linking.openURL(url);
    }

    async function copiarCodigoPix() {
        if (!pagamento?.copiaEColaPix) {
            Alert.alert('Pix indisponível', 'O código Pix ainda não foi gerado.');
            return;
        }

        try {
            await Clipboard.setStringAsync(pagamento.copiaEColaPix);
            Alert.alert('Copiado', 'Código Pix copiado com sucesso.');
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível copiar o código Pix.');
        }
    }

    function renderLinhaInfo(icone, titulo, valor, destaque = false) {
        return (
            <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                    <Ionicons name={icone} size={18} color={colors.primary} />
                </View>

                <View style={styles.infoContent}>
                    <Text style={styles.infoTitle}>{titulo}</Text>
                    <Text style={[styles.infoValue, destaque && styles.infoValueDestaque]}>
                        {valor || '-'}
                    </Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando pagamento...</Text>
            </View>
        );
    }

    if (!agendamentoId) {
        return (
            <View style={styles.centered}>
                <Ionicons name="alert-circle-outline" size={56} color={colors.danger || '#e74c3c'} />
                <Text style={styles.emptyTitle}>Agendamento não encontrado</Text>
                <Text style={styles.emptyText}>
                    Não foi possível localizar o pagamento porque o agendamento não foi enviado para esta tela.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Pagamento do agendamento</Text>

                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: `${statusColor}20`, borderColor: statusColor },
                        ]}
                    >
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusLabel}
                        </Text>
                    </View>
                </View>

                <Text style={styles.headerValue}>{formatarMoeda(valorTotal)}</Text>

                <Text style={styles.headerSubtitle}>
                    {getStatusPagamentoMensagem(statusPagamento, formaPagamento)}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Resumo</Text>

                {renderLinhaInfo('card-outline', 'Forma de pagamento', formaPagamentoLabel, true)}
                {renderLinhaInfo('cash-outline', 'Valor da cobrança', formatarMoeda(valorTotal), true)}
                {renderLinhaInfo(
                    'remove-circle-outline',
                    'Taxa da plataforma',
                    formatarMoeda(pagamento?.taxaPlataforma || 0)
                )}
                {renderLinhaInfo(
                    'wallet-outline',
                    'Valor líquido do profissional',
                    formatarMoeda(pagamento?.valorLiquidoProfissional || 0)
                )}
                {renderLinhaInfo('calendar-outline', 'Data do atendimento', agendamento?.data || '-')}
                {renderLinhaInfo('time-outline', 'Horário', agendamento?.horario || '-')}
                {renderLinhaInfo(
                    'business-outline',
                    'Profissional / clínica',
                    agendamento?.clinicaNome ||
                    agendamento?.profissionalNome ||
                    agendamento?.colaboradorNome ||
                    'Profissional'
                )}
                {renderLinhaInfo(
                    'document-text-outline',
                    'ID da cobrança',
                    pagamento?.gatewayPaymentId || 'Será gerado ao criar a cobrança'
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Serviços do agendamento</Text>

                {Array.isArray(agendamento?.servicos) && agendamento.servicos.length > 0 ? (
                    agendamento.servicos.map((servico, index) => (
                        <View
                            key={`${servico?.id || servico?.nome || 'servico'}-${index}`}
                            style={styles.servicoRow}
                        >
                            <View style={styles.servicoTextBox}>
                                <Text style={styles.servicoNome}>
                                    {servico?.nome || 'Serviço'}
                                </Text>
                                <Text style={styles.servicoPreco}>
                                    {formatarMoeda(servico?.preco || 0)}
                                </Text>
                            </View>

                            <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={colors.success || '#2ecc71'}
                            />
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyCardText}>
                        Os serviços deste agendamento não foram encontrados.
                    </Text>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Dados da cobrança</Text>

                {formaPagamento === 'pix' && (
                    <>
                        {qrImageUri ? (
                            <View style={styles.qrContainer}>
                                <Image source={{ uri: qrImageUri }} style={styles.qrImage} />
                                <Text style={styles.qrHint}>
                                    Escaneie o QR Code no aplicativo do seu banco.
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.emptyCardText}>
                                O QR Code ainda não foi gerado.
                            </Text>
                        )}

                        <View style={styles.pixBox}>
                            <Text style={styles.pixLabel}>Pix copia e cola</Text>

                            <Text selectable style={styles.pixCode}>
                                {pagamento?.copiaEColaPix || 'Ainda não disponível'}
                            </Text>

                            <TouchableOpacity
                                style={[
                                    styles.copyButton,
                                    !pagamento?.copiaEColaPix && styles.copyButtonDisabled,
                                ]}
                                onPress={copiarCodigoPix}
                                disabled={!pagamento?.copiaEColaPix}
                            >
                                <Ionicons name="copy-outline" size={18} color="#FFF" />
                                <Text style={styles.copyButtonText}>Copiar código Pix</Text>
                            </TouchableOpacity>
                        </View>

                        {renderLinhaInfo(
                            'calendar-clear-outline',
                            'Vencimento',
                            pagamento?.dueDate || 'Não informado'
                        )}
                    </>
                )}

                {pagamento?.invoiceUrl
                    ? renderLinhaInfo('link-outline', 'Link da cobrança', 'Disponível')
                    : null}
            </View>

            {statusPagamento === STATUS_PAGAMENTO.AGUARDANDO_COBRANCA && (
                <TouchableOpacity
                    style={[styles.primaryButton, gerandoCobranca && styles.buttonDisabled]}
                    onPress={gerarCobranca}
                    disabled={gerandoCobranca}
                >
                    {gerandoCobranca ? (
                        <ActivityIndicator size="small" color={colors.textLight || '#FFF'} />
                    ) : (
                        <Ionicons name="flash-outline" size={18} color={colors.textLight || '#FFF'} />
                    )}
                    <Text style={styles.primaryButtonText}>
                        {gerandoCobranca ? 'Gerando cobrança...' : 'Gerar cobrança Pix'}
                    </Text>
                </TouchableOpacity>
            )}

            {statusPagamento === STATUS_PAGAMENTO.GERADA && (
                <>
                    <TouchableOpacity style={styles.primaryButton} onPress={copiarCodigoPix}>
                        <Ionicons name="copy-outline" size={18} color={colors.textLight || '#FFF'} />
                        <Text style={styles.primaryButtonText}>Copiar código Pix</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryActionButton}
                        onPress={() =>
                            abrirLink(
                                pagamento?.invoiceUrl,
                                'Link indisponível',
                                'O link da cobrança ainda não está disponível.'
                            )
                        }
                    >
                        <Ionicons name="open-outline" size={18} color={colors.primary} />
                        <Text style={styles.secondaryActionText}>Abrir link da cobrança</Text>
                    </TouchableOpacity>
                </>
            )}

            <TouchableOpacity
                style={[styles.secondaryButton, consultandoStatus && styles.buttonDisabled]}
                onPress={atualizarStatusPagamento}
                disabled={consultandoStatus}
            >
                {consultandoStatus ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                )}
                <Text style={styles.secondaryButtonText}>
                    {consultandoStatus ? 'Consultando...' : 'Atualizar status do pagamento'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation?.goBack?.()}
            >
                <Ionicons name="arrow-back-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryButtonText}>Voltar</Text>
            </TouchableOpacity>

            <View style={styles.footerSpace} />

            <View style={styles.footerHint}>
                <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.secondary || '#7f8c8d'}
                />
                <Text style={styles.footerHintText}>
                    Quando o pagamento for confirmado pelo Asaas, o saldo líquido do profissional
                    será liberado automaticamente para saque, conforme as regras da plataforma.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        paddingBottom: 28,
    },
    centered: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        color: colors.secondary,
    },
    emptyTitle: {
        marginTop: 12,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textDark,
        textAlign: 'center',
    },
    emptyText: {
        marginTop: 8,
        fontSize: 14,
        color: colors.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textDark,
    },
    statusBadge: {
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    headerValue: {
        marginTop: 18,
        fontSize: 30,
        fontWeight: '800',
        color: colors.primary,
    },
    headerSubtitle: {
        marginTop: 10,
        fontSize: 14,
        color: colors.secondary,
        lineHeight: 22,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textDark,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.inputFill,
    },
    infoIcon: {
        width: 34,
        alignItems: 'center',
        paddingTop: 1,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 13,
        color: colors.secondary,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        color: colors.textDark,
        fontWeight: '500',
    },
    infoValueDestaque: {
        fontWeight: '700',
        color: colors.primary,
    },
    servicoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.inputFill,
    },
    servicoTextBox: {
        flex: 1,
        paddingRight: 12,
    },
    servicoNome: {
        fontSize: 15,
        color: colors.textDark,
        fontWeight: '600',
    },
    servicoPreco: {
        marginTop: 4,
        fontSize: 14,
        color: colors.secondary,
    },
    emptyCardText: {
        fontSize: 14,
        color: colors.secondary,
        lineHeight: 22,
    },
    qrContainer: {
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.inputFill,
        marginBottom: 10,
    },
    qrImage: {
        width: 220,
        height: 220,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    qrHint: {
        marginTop: 10,
        fontSize: 12,
        color: colors.secondary,
        textAlign: 'center',
    },
    pixBox: {
        backgroundColor: '#F5F6F8',
        padding: 12,
        borderRadius: 12,
        marginTop: 8,
        marginBottom: 6,
    },
    pixLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textDark,
        marginBottom: 8,
    },
    pixCode: {
        fontSize: 12,
        color: '#333',
        lineHeight: 18,
    },
    copyButton: {
        marginTop: 12,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    copyButtonDisabled: {
        opacity: 0.6,
    },
    copyButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    primaryButton: {
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    secondaryActionButton: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    secondaryActionText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    primaryButtonText: {
        color: colors.textLight || '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    footerSpace: {
        height: 14,
    },
    footerHint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
    },
    footerHintText: {
        flex: 1,
        fontSize: 12,
        color: colors.secondary,
        lineHeight: 19,
    },
});