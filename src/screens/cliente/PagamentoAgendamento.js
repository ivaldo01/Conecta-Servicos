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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import {
    FORMAS_PAGAMENTO_LABEL,
    STATUS_PAGAMENTO,
} from '../../services/paymentService';

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function getStatusPagamentoLabel(status) {
    switch (status) {
        case STATUS_PAGAMENTO.GERADA:
            return 'Cobrança gerada';
        case STATUS_PAGAMENTO.PAGO:
            return 'Pagamento confirmado';
        case STATUS_PAGAMENTO.CANCELADO:
            return 'Cobrança cancelada';
        case STATUS_PAGAMENTO.VENCIDO:
            return 'Cobrança vencida';
        case STATUS_PAGAMENTO.AGUARDANDO_COBRANCA:
        default:
            return 'Aguardando cobrança';
    }
}

function getStatusPagamentoColor(status) {
    switch (status) {
        case STATUS_PAGAMENTO.PAGO:
            return colors.success;
        case STATUS_PAGAMENTO.CANCELADO:
            return colors.danger;
        case STATUS_PAGAMENTO.VENCIDO:
            return colors.warning;
        case STATUS_PAGAMENTO.GERADA:
            return colors.info;
        case STATUS_PAGAMENTO.AGUARDANDO_COBRANCA:
        default:
            return colors.secondary;
    }
}

function getMensagemStatus(status, formaPagamento) {
    if (status === STATUS_PAGAMENTO.PAGO) {
        return 'Seu pagamento já foi confirmado.';
    }

    if (status === STATUS_PAGAMENTO.GERADA) {
        if (formaPagamento === 'pix') {
            return 'Sua cobrança Pix já foi gerada. Assim que integrarmos o banco, aqui aparecerão QR Code e código Pix.';
        }

        if (formaPagamento === 'boleto') {
            return 'Sua cobrança por boleto já foi gerada. Aqui aparecerão o código de barras e a linha digitável.';
        }

        return 'Sua cobrança já foi gerada. Aqui aparecerá o link seguro para finalizar o pagamento.';
    }

    if (status === STATUS_PAGAMENTO.CANCELADO) {
        return 'Esta cobrança foi cancelada pelo profissional ou pela plataforma.';
    }

    if (status === STATUS_PAGAMENTO.VENCIDO) {
        return 'Esta cobrança venceu. O profissional poderá gerar uma nova cobrança.';
    }

    return 'O profissional ainda não gerou a cobrança deste agendamento.';
}

export default function PagamentoAgendamento({ route, navigation }) {
    const agendamentoParam = route?.params?.agendamento || null;
    const agendamentoId = route?.params?.agendamentoId || agendamentoParam?.id || null;

    const [loading, setLoading] = useState(true);
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
                console.log('Erro ao ouvir agendamento no pagamento:', error);
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
                console.log('Erro ao ouvir pagamento do agendamento:', error);
            }
        );

        return () => {
            unsubAgendamento?.();
            unsubPagamento?.();
        };
    }, [agendamentoId]);

    const valorTotal = useMemo(() => {
        if (pagamento?.valorCobrado !== undefined && pagamento?.valorCobrado !== null) {
            return Number(pagamento.valorCobrado || 0);
        }
        if (agendamento?.valorTotal !== undefined && agendamento?.valorTotal !== null) {
            return Number(agendamento.valorTotal || 0);
        }

        const totalServicos = Array.isArray(agendamento?.servicos)
            ? agendamento.servicos.reduce((acc, servico) => acc + Number(servico?.preco || 0), 0)
            : 0;

        return totalServicos || Number(agendamento?.preco || 0);
    }, [agendamento, pagamento]);

    const formaPagamento = pagamento?.formaPagamento || agendamento?.formaPagamento || 'pix';
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

    async function abrirLinkPagamento() {
        const link = pagamento?.linkPagamento;

        if (!link) {
            Alert.alert(
                'Pagamento ainda indisponível',
                'O link de pagamento ainda não foi configurado. Quando integrarmos o banco, ele aparecerá aqui.'
            );
            return;
        }

        const canOpen = await Linking.canOpenURL(link);

        if (!canOpen) {
            Alert.alert('Não foi possível abrir', 'O link de pagamento é inválido.');
            return;
        }

        await Linking.openURL(link);
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
                <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
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
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                </View>

                <Text style={styles.headerValue}>{formatarMoeda(valorTotal)}</Text>
                <Text style={styles.headerSubtitle}>
                    {getMensagemStatus(statusPagamento, formaPagamento)}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Resumo</Text>

                {renderLinhaInfo('card-outline', 'Forma de pagamento', formaPagamentoLabel, true)}
                {renderLinhaInfo('cash-outline', 'Valor da cobrança', formatarMoeda(valorTotal), true)}
                {renderLinhaInfo('calendar-outline', 'Data do atendimento', agendamento?.data || '-')}
                {renderLinhaInfo('time-outline', 'Horário', agendamento?.horario || '-')}
                {renderLinhaInfo('business-outline', 'Profissional / clínica', agendamento?.clinicaNome || 'Profissional')}
                {renderLinhaInfo('document-text-outline', 'Código da cobrança', pagamento?.codigoReferencia || 'Será gerado automaticamente')}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Serviços do agendamento</Text>

                {Array.isArray(agendamento?.servicos) && agendamento.servicos.length > 0 ? (
                    agendamento.servicos.map((servico, index) => (
                        <View key={`${servico?.id || servico?.nome || 'servico'}-${index}`} style={styles.servicoRow}>
                            <View style={styles.servicoTextBox}>
                                <Text style={styles.servicoNome}>{servico?.nome || 'Serviço'}</Text>
                                <Text style={styles.servicoPreco}>
                                    {formatarMoeda(servico?.preco || 0)}
                                </Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyCardText}>Os serviços deste agendamento não foram encontrados.</Text>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Dados da cobrança</Text>

                {formaPagamento === 'pix' && (
                    <>
                        {renderLinhaInfo('qr-code-outline', 'QR Code Pix', pagamento?.qrCodePix ? 'Disponível' : 'Ainda não disponível')}
                        {renderLinhaInfo('copy-outline', 'Pix copia e cola', pagamento?.copiaEColaPix || 'Será mostrado após integração')}
                    </>
                )}

                {formaPagamento === 'boleto' && (
                    <>
                        {renderLinhaInfo('barcode-outline', 'Linha digitável', pagamento?.linhaDigitavel || 'Será mostrada após integração')}
                    </>
                )}

                {(formaPagamento === 'cartao_credito' || formaPagamento === 'cartao_debito') && (
                    <>
                        {renderLinhaInfo('link-outline', 'Link de pagamento', pagamento?.linkPagamento ? 'Disponível' : 'Ainda não disponível')}
                    </>
                )}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={abrirLinkPagamento}>
                <Ionicons name="wallet-outline" size={18} color={colors.textLight} />
                <Text style={styles.primaryButtonText}>Pagar agora</Text>
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
                <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
                <Text style={styles.footerHintText}>
                    Nesta fase, o app já mostra a cobrança em tempo real. Quando conectarmos a API do banco, os dados de Pix, boleto e cartão aparecerão automaticamente aqui.
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
        gap: 12,
        alignItems: 'flex-start',
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
    primaryButtonText: {
        color: colors.textLight,
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
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 15,
        fontWeight: '700',
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
