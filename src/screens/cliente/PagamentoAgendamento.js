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
    TextInput,
    Modal,
    Dimensions,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';

import { db } from '../../services/firebaseConfig';
import colors from '../../constants/colors';
import Sidebar from '../../components/Sidebar';
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
    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

    const agendamentoParam = route?.params?.agendamento || null;
    const agendamentoId =
        route?.params?.agendamentoId || agendamentoParam?.id || null;

    const [loading, setLoading] = useState(true);
    const [gerandoCobranca, setGerandoCobranca] = useState(false);
    const [consultandoStatus, setConsultandoStatus] = useState(false);
    const [agendamento, setAgendamento] = useState(agendamentoParam);
    const [pagamento, setPagamento] = useState(null);

    // Estados para o Modal de Pagamento
    const [modalPagamentoVisible, setModalPagamentoVisible] = useState(false);
    const [metodoSelecionado, setMetodoSelecionado] = useState(agendamentoParam?.formaPagamento || 'pix');
    const [cardData, setCardData] = useState({
        holderName: '',
        number: '',
        expiry: '',
        cvv: '',
        cpfCnpj: '',
        cep: '',
        numeroEndereco: ''
    });

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

    async function handleGerarCobranca() {
        if (!agendamento?.id) {
            Alert.alert('Erro', 'Agendamento inválido.');
            return;
        }

        // Se o método atual for pix, gera direto. Se for cartão, abre o modal.
        // Mas para manter a lógica de "escolha", vamos sempre abrir o modal de seleção.
        setModalPagamentoVisible(true);
    }

    async function processarCobranca() {
        if (!agendamento?.id) return;

        // Sempre sincroniza a forma de pagamento do agendamento com o que está no modal agora
        const agendamentoParaEnvio = {
            ...agendamento,
            formaPagamento: metodoSelecionado
        };

        let payload = { agendamento: agendamentoParaEnvio };

        if (metodoSelecionado === 'cartao_credito' || metodoSelecionado === 'cartao_debito' || metodoSelecionado === 'credit_card' || metodoSelecionado === 'debit_card') {
            // Validações básicas
            if (!cardData.holderName || cardData.number.length < 16 || !cardData.expiry || !cardData.cvv) {
                Alert.alert('Atenção', 'Preencha os dados do cartão corretamente.');
                return;
            }
            if (!cardData.cpfCnpj || !cardData.cep) {
                Alert.alert('Atenção', 'CPF/CNPJ e CEP são obrigatórios.');
                return;
            }

            const [month, year] = cardData.expiry.split('/');
            payload.creditCard = {
                holderName: cardData.holderName,
                number: cardData.number.replace(/\s/g, ''),
                expiryMonth: month,
                expiryYear: '20' + year,
                ccv: cardData.cvv
            };
            payload.creditCardHolderInfo = {
                name: cardData.holderName,
                email: agendamento?.clienteEmail || '',
                cpfCnpj: cardData.cpfCnpj.replace(/\D/g, ''),
                postalCode: cardData.cep.replace(/\D/g, ''),
                addressNumber: cardData.numeroEndereco || 'SN',
                mobilePhone: (agendamento?.clienteTelefone || '').replace(/\D/g, '')
            };
        }

        try {
            setGerandoCobranca(true);
            const result = await gerarCobrancaAgendamento(payload);
            setModalPagamentoVisible(false);

            if (metodoSelecionado === 'pix') {
                Alert.alert('Sucesso', 'Cobrança Pix gerada com sucesso.');
            } else {
                Alert.alert('Sucesso', 'Pagamento processado com sucesso!');
            }
        } catch (error) {
            handleAppError({
                context: 'Gerar cobrança Asaas',
                error,
                title: 'Erro no pagamento',
                fallbackMessage: 'Não foi possível processar o pagamento.',
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

    const MainContent = (
        <ScrollView style={styles.container} contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}>
            <View style={isLargeScreen ? styles.webContainer : null}>
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

                <View style={isLargeScreen ? styles.cardsRow : null}>
                    <View style={[styles.card, isLargeScreen && styles.cardHalf]}>
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

                    <View style={[styles.card, isLargeScreen && styles.cardHalf]}>
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
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Dados da cobrança</Text>

                    <View style={isLargeScreen ? styles.qrFlexRow : null}>
                        {qrImageUri ? (
                            <View style={[styles.qrContainer, isLargeScreen && styles.qrContainerLarge]}>
                                <Image source={{ uri: qrImageUri }} style={styles.qrImage} />
                                <Text style={styles.qrHint}>
                                    Escaneie o QR Code no aplicativo do seu banco.
                                </Text>
                            </View>
                        ) : (
                            formaPagamento === 'pix' && (
                                <Text style={styles.emptyCardText}>
                                    O QR Code ainda não foi gerado.
                                </Text>
                            )
                        )}

                        <View style={[styles.pixBox, isLargeScreen && styles.pixBoxLarge]}>
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
                    </View>

                    {renderLinhaInfo(
                        'calendar-clear-outline',
                        'Vencimento',
                        pagamento?.dueDate || 'Não informado'
                    )}

                    {pagamento?.invoiceUrl
                        ? renderLinhaInfo('link-outline', 'Link da cobrança', 'Disponível')
                        : null}
                </View>

                {statusPagamento === STATUS_PAGAMENTO.AGUARDANDO_COBRANCA && (
                    <TouchableOpacity
                        style={[styles.primaryButton, gerandoCobranca && styles.buttonDisabled, isLargeScreen && styles.primaryButtonLarge]}
                        onPress={handleGerarCobranca}
                        disabled={gerandoCobranca}
                    >
                        {gerandoCobranca ? (
                            <ActivityIndicator size="small" color={colors.textLight || '#FFF'} />
                        ) : (
                            <Ionicons name="card-outline" size={18} color={colors.textLight || '#FFF'} />
                        )}
                        <Text style={styles.primaryButtonText}>
                            {gerandoCobranca ? 'Processando...' : 'Pagar Agora'}
                        </Text>
                    </TouchableOpacity>
                )}

                {statusPagamento === STATUS_PAGAMENTO.GERADA && (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { marginBottom: 12 }, isLargeScreen && styles.primaryButtonLarge]}
                            onPress={() => setModalPagamentoVisible(true)}
                        >
                            <Ionicons name="card-outline" size={18} color="#FFF" />
                            <Text style={styles.primaryButtonText}>Pagar com Cartão</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryActionButton, { marginBottom: 12 }, isLargeScreen && styles.secondaryButtonLarge]}
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
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.secondaryButton, consultandoStatus && styles.buttonDisabled, isLargeScreen && styles.secondaryButtonLarge]}
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
                    style={[styles.secondaryButton, isLargeScreen && styles.secondaryButtonLarge]}
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
            </View>
        </ScrollView>
    );

    return (
        <View style={styles.screenContainer}>
            {isLargeScreen ? (
                <View style={styles.webLayout}>
                    <Sidebar navigation={navigation} activeRoute="MeusAgendamentosCliente" />
                    <View style={styles.webContentArea}>
                        {MainContent}
                    </View>
                </View>
            ) : (
                <SafeAreaView style={styles.container}>
                    {MainContent}
                </SafeAreaView>
            )}

            {/* Modal de Pagamento */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalPagamentoVisible}
                onRequestClose={() => setModalPagamentoVisible(false)}
            >
                <View style={styles.modalCentered}>
                    <View style={[styles.modalView, isLargeScreen && styles.modalViewLarge]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Escolha o Pagamento</Text>
                            <TouchableOpacity onPress={() => setModalPagamentoVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.methodTabs}>
                            <TouchableOpacity
                                style={[styles.methodTab, metodoSelecionado === 'pix' && styles.methodTabActive]}
                                onPress={() => setMetodoSelecionado('pix')}
                            >
                                <Ionicons name="qr-code-outline" size={18} color={metodoSelecionado === 'pix' ? '#FFF' : '#666'} />
                                <Text style={[styles.methodTabText, metodoSelecionado === 'pix' && styles.methodTabTextActive]}>Pix</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.methodTab, (metodoSelecionado === 'cartao_credito' || metodoSelecionado === 'credit_card') && styles.methodTabActive]}
                                onPress={() => setMetodoSelecionado('cartao_credito')}
                            >
                                <Ionicons name="card-outline" size={18} color={(metodoSelecionado === 'cartao_credito' || metodoSelecionado === 'credit_card') ? '#FFF' : '#666'} />
                                <Text style={[styles.methodTabText, (metodoSelecionado === 'cartao_credito' || metodoSelecionado === 'credit_card') && styles.methodTabTextActive]}>Cartão</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ width: '100%', maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {metodoSelecionado === 'pix' ? (
                                <View style={styles.pixInfoContainer}>
                                    <Ionicons name="flash-outline" size={40} color={colors.primary} />
                                    <Text style={styles.pixInfoTitle}>Ativação Instantânea</Text>
                                    <Text style={styles.pixInfoText}>
                                        O Pix é processado na hora e seu agendamento é confirmado imediatamente.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.cardForm}>
                                    <Text style={styles.inputLabel}>Número do Cartão</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0000 0000 0000 0000"
                                        keyboardType="numeric"
                                        maxLength={16}
                                        value={cardData.number}
                                        onChangeText={(v) => setCardData({ ...cardData, number: v })}
                                    />

                                    <Text style={styles.inputLabel}>Nome no Cartão</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Como está no cartão"
                                        autoCapitalize="characters"
                                        value={cardData.holderName}
                                        onChangeText={(v) => setCardData({ ...cardData, holderName: v })}
                                    />

                                    <View style={styles.inputRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.inputLabel}>Validade (MM/AA)</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="MM/AA"
                                                keyboardType="numeric"
                                                maxLength={5}
                                                value={cardData.expiry}
                                                onChangeText={(v) => {
                                                    if (v.length === 2 && !v.includes('/')) v += '/';
                                                    setCardData({ ...cardData, expiry: v });
                                                }}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>CVV</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="000"
                                                keyboardType="numeric"
                                                maxLength={4}
                                                value={cardData.cvv}
                                                onChangeText={(v) => setCardData({ ...cardData, cvv: v })}
                                            />
                                        </View>
                                    </View>

                                    <Text style={styles.inputLabel}>CPF/CNPJ do Titular</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="000.000.000-00"
                                        keyboardType="numeric"
                                        value={cardData.cpfCnpj}
                                        onChangeText={(v) => setCardData({ ...cardData, cpfCnpj: v })}
                                    />

                                    <View style={styles.inputRow}>
                                        <View style={{ flex: 2, marginRight: 10 }}>
                                            <Text style={styles.inputLabel}>CEP</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="00000-000"
                                                keyboardType="numeric"
                                                maxLength={9}
                                                value={cardData.cep}
                                                onChangeText={(v) => setCardData({ ...cardData, cep: v })}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.inputLabel}>Nº</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="123"
                                                keyboardType="numeric"
                                                value={cardData.numeroEndereco}
                                                onChangeText={(v) => setCardData({ ...cardData, numeroEndereco: v })}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.confirmButton, gerandoCobranca && { opacity: 0.7 }]}
                            onPress={processarCobranca}
                            disabled={gerandoCobranca}
                        >
                            {gerandoCobranca ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    {metodoSelecionado === 'pix' ? 'Gerar Pix' : 'Confirmar Pagamento'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    webLayout: {
        flex: 1,
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
    },
    webContentArea: {
        flex: 1,
        backgroundColor: colors.background,
        height: '100%',
        display: 'flex',
        overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
        height: Platform.OS === 'web' ? '100%' : 'auto',
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
        backgroundColor: '#1E2535',
        borderRadius: 22,
        padding: 20,
        marginBottom: 16,
        borderWidth: 0,
        shadowColor: colors.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
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
        fontWeight: '800',
        color: '#FFF',
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
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 22,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8EDF5',
        shadowColor: colors.shadow,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
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
        borderRadius: 16,
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 12,
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
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
    modalCentered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        width: width * 0.9,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },
    methodTabs: {
        flexDirection: 'row',
        backgroundColor: '#F0F2F5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        width: '100%',
    },
    methodTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    methodTabActive: {
        backgroundColor: colors.primary,
    },
    methodTabText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666',
    },
    methodTabTextActive: {
        color: '#FFF',
    },
    pixInfoContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        width: '100%',
    },
    pixInfoTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        marginTop: 10,
    },
    pixInfoText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 18,
    },
    cardForm: {
        width: '100%',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#666',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#E9ECEF',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 14,
        color: colors.textDark,
    },
    inputRow: {
        flexDirection: 'row',
    },
    confirmButton: {
        backgroundColor: colors.primary,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    },
});