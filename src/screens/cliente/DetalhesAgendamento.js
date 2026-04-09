import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
    Image,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import { doc, updateDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { liberarHorario } from '../../utils/agendaDisponibilidade';
import Sidebar from '../../components/Sidebar';

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

function getStatusConfig(status) {
    switch (status) {
        case 'confirmado':
            return { cor: '#27AE60', bg: '#E8F5E9', label: 'Confirmado', icon: 'checkmark-circle-outline' };
        case 'cancelado':
            return { cor: '#6c757d', bg: '#F1F3F5', label: 'Cancelado', icon: 'close-circle-outline' };
        case 'recusado':
            return { cor: '#C62828', bg: '#FDECEC', label: 'Recusado', icon: 'ban-outline' };
        case 'concluido':
            return { cor: '#1565C0', bg: '#E3F2FD', label: 'Concluído', icon: 'checkmark-done-outline' };
        default:
            return { cor: '#E67E22', bg: '#FFF4E5', label: 'Pendente', icon: 'time-outline' };
    }
}

function getStatusPagamentoLabel(status) {
    switch (status) {
        case 'gerada':
            return 'Cobrança gerada';
        case 'pago':
            return 'Pagamento confirmado';
        case 'cancelado':
            return 'Cobrança cancelada';
        case 'vencido':
            return 'Cobrança vencida';
        case 'aguardando_cobranca':
        default:
            return 'Aguardando cobrança';
    }
}

function getStatusPagamentoCor(status) {
    switch (status) {
        case 'pago':
            return '#1E8E3E';
        case 'cancelado':
            return '#6C757D';
        case 'vencido':
            return '#E67E22';
        case 'gerada':
            return colors.primary;
        case 'aguardando_cobranca':
        default:
            return '#7F8C8D';
    }
}

function getStatusPagamentoBg(status) {
    switch (status) {
        case 'pago':
            return '#EAF7ED';
        case 'cancelado':
            return '#F1F3F5';
        case 'vencido':
            return '#FFF4E5';
        case 'gerada':
            return '#EEF3FF';
        case 'aguardando_cobranca':
        default:
            return '#F5F6F8';
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

function podeCancelar(status) {
    return status === 'pendente' || status === 'confirmado';
}

function getFotoProfissional(agendamento) {
    return (
        agendamento?.profissionalOrigemFoto ||
        agendamento?.fotoProfissional ||
        agendamento?.colaboradorFoto ||
        agendamento?.fotoPerfilProfissional ||
        ''
    );
}

function getNomeProfissional(agendamento) {
    return (
        agendamento?.colaboradorNome ||
        agendamento?.profissionalOrigemNome ||
        agendamento?.clinicaNome ||
        'Profissional'
    );
}

function getInicialNome(nome = '') {
    return String(nome).trim().charAt(0).toUpperCase() || 'P';
}

export default function DetalhesAgendamento({ route, navigation }) {
    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

    const { agendamento } = route.params || {};
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [loadingAvaliacao, setLoadingAvaliacao] = useState(true);
    const [jaAvaliado, setJaAvaliado] = useState(false);
    const [statusPagamentoAtual, setStatusPagamentoAtual] = useState(
        agendamento?.statusPagamento || 'aguardando_cobranca'
    );

    useEffect(() => {
        verificarAvaliacao();
    }, [agendamento?.id]);

    useEffect(() => {
        if (!agendamento?.id) return;

        const unsubscribePagamento = onSnapshot(
            doc(db, 'pagamentos', agendamento.id),
            (snap) => {
                if (snap.exists()) {
                    setStatusPagamentoAtual(snap.data()?.status || 'gerada');
                } else {
                    setStatusPagamentoAtual(agendamento?.statusPagamento || 'aguardando_cobranca');
                }
            },
            (error) => {
                console.log('Erro ao ouvir pagamento do cliente:', error);
            }
        );

        return () => unsubscribePagamento?.();
    }, [agendamento?.id, agendamento?.statusPagamento]);

    const verificarAvaliacao = async () => {
        if (!agendamento?.id) {
            setLoadingAvaliacao(false);
            return;
        }

        try {
            const profissionalId = agendamento.colaboradorId || agendamento.clinicaId;
            const avaliacaoRef = doc(db, "usuarios", profissionalId, "avaliacoes", agendamento.id);
            const avaliacaoSnap = await getDoc(avaliacaoRef);
            setJaAvaliado(avaliacaoSnap.exists());
        } catch (error) {
            console.log("Erro ao verificar avaliação:", error);
        } finally {
            setLoadingAvaliacao(false);
        }
    };

    const abrirWhatsAppProfissional = async () => {
        const tel =
            agendamento?.profissionalWhatsapp?.replace(/\D/g, "") ||
            agendamento?.clinicaWhatsapp?.replace(/\D/g, "") ||
            agendamento?.colaboradorWhatsapp?.replace(/\D/g, "");

        if (!tel) {
            Alert.alert("Aviso", "Número do profissional não disponível.");
            return;
        }

        const mensagem = encodeURIComponent(
            `Olá! Fiz um agendamento pelo Conecta Serviços para ${agendamento?.data || 'a data informada'} às ${agendamento?.horario || 'o horário informado'}. Gostaria de confirmar os detalhes.`
        );

        const url = `https://wa.me/55${tel}?text=${mensagem}`;

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

    const cancelarAgendamento = async () => {
        Alert.alert(
            "Cancelar agendamento",
            "Tem certeza que deseja cancelar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, cancelar",
                    style: "destructive",
                    onPress: async () => {
                        setLoadingAcao(true);

                        try {
                            const docRef = doc(db, "agendamentos", agendamento.id);
                            await updateDoc(docRef, {
                                status: 'cancelado',
                                canceladoEm: serverTimestamp(),
                                atualizadoEm: serverTimestamp(),
                            });

                            try {
                                await liberarHorario({
                                    clinicaId: agendamento?.clinicaId,
                                    data: agendamento?.dataFiltro,
                                    horario: agendamento?.horario,
                                    colaboradorId: agendamento?.colaboradorId,
                                });
                            } catch (erroLiberar) {
                                console.log('Aviso: erro ao liberar horário (pode já estar liberado):', erroLiberar);
                            }

                            Alert.alert("Sucesso", "O agendamento foi cancelado.");
                            navigation.goBack();
                        } catch (error) {
                            console.log("Erro ao cancelar:", error);
                            Alert.alert("Erro", "Não foi possível cancelar.");
                        } finally {
                            setLoadingAcao(false);
                        }
                    },
                },
            ]
        );
    };

    const abrirTelaAvaliacao = () => {
        navigation.navigate("AvaliarAtendimento", {
            agendamento,
        });
    };

    const abrirTelaPagamento = () => {
        navigation.navigate('PagamentoAgendamento', {
            agendamento,
            agendamentoId: agendamento?.id,
        });
    };

    const totalAgendamento = useMemo(() => {
        return (
            parseNumero(agendamento?.valorTotal, 0) ||
            agendamento?.servicos?.reduce(
                (acc, s) => acc + parseNumero(s.preco, 0),
                0
            ) ||
            0
        );
    }, [agendamento]);

    const statusConfig = getStatusConfig(agendamento?.status);
    const pagamentoLabel = getStatusPagamentoLabel(statusPagamentoAtual);
    const pagamentoCor = getStatusPagamentoCor(statusPagamentoAtual);
    const pagamentoBg = getStatusPagamentoBg(statusPagamentoAtual);
    const origemStyle = getOrigemStyle(agendamento?.origemAgendamento);

    const fotoProfissional = getFotoProfissional(agendamento);
    const nomeProfissional = getNomeProfissional(agendamento);

    const podeAvaliar = agendamento?.status === 'concluido' && !jaAvaliado;

    const MainContent = (
        <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollContent}
            contentContainerStyle={[styles.content, isLargeScreen && styles.contentLarge]}
        >
            <View style={isLargeScreen ? styles.webContainer : null}>
                <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
                    <View style={styles.headerCircle} />
                    <View style={styles.headerCircleTwo} />
                    {!isLargeScreen && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Detalhes do Agendamento</Text>

                        <View style={styles.badgesRow}>
                            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                                <Ionicons
                                    name={statusConfig.icon}
                                    size={16}
                                    color={statusConfig.cor}
                                />
                                <Text style={[styles.statusText, { color: statusConfig.cor }]}>
                                    {statusConfig.label}
                                </Text>
                            </View>

                            <View style={[styles.origemBadge, { backgroundColor: origemStyle.bg }]}>
                                <Ionicons name={origemStyle.icon} size={14} color={origemStyle.color} />
                                <Text style={[styles.origemText, { color: origemStyle.color }]}>
                                    {origemStyle.label}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={isLargeScreen ? styles.cardsRow : null}>
                    <View style={[styles.card, isLargeScreen && styles.cardHalf]}>
                        <Text style={styles.sectionTitle}>Profissional</Text>

                        <View style={styles.profissionalBox}>
                            {fotoProfissional ? (
                                <Image source={{ uri: fotoProfissional }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarFallbackText}>
                                        {getInicialNome(nomeProfissional)}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.profissionalInfo}>
                                <Text style={styles.profissionalNome}>{nomeProfissional}</Text>
                                <Text style={styles.profissionalSub}>
                                    {agendamento?.clinicaNome || 'Atendimento agendado pelo app'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.card, isLargeScreen && styles.cardHalf]}>
                        <Text style={styles.sectionTitle}>Data e horário</Text>

                        <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                            <Text style={styles.infoText}>
                                {agendamento?.data} às {agendamento?.horario}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Serviços contratados</Text>

                    {agendamento?.servicos?.map((s, index) => (
                        <View key={index} style={styles.itemServico}>
                            <View style={styles.itemServicoLeft}>
                                <Ionicons name="bag-outline" size={16} color={colors.primary} />
                                <Text style={styles.servicoNome}>{s.nome}</Text>
                            </View>

                            <Text style={styles.servicoPreco}>
                                {formatarMoeda(parseNumero(s.preco, 0))}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalValue}>
                            {formatarMoeda(totalAgendamento)}
                        </Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Pagamento</Text>

                    <View style={styles.pagamentoResumoBox}>
                        <View style={styles.pagamentoTop}>
                            <View>
                                <Text style={styles.pagamentoFormaText}>
                                    {agendamento?.formaPagamentoLabel || 'Pix'}
                                </Text>

                                <View style={[styles.pagamentoStatusBadge, { backgroundColor: pagamentoBg }]}>
                                    <Ionicons
                                        name="wallet-outline"
                                        size={14}
                                        color={pagamentoCor}
                                    />
                                    <Text style={[styles.pagamentoStatusText, { color: pagamentoCor }]}>
                                        {pagamentoLabel}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.pagamentoValorText}>
                                {formatarMoeda(totalAgendamento)}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.pagamentoButtonInline}
                            onPress={abrirTelaPagamento}
                        >
                            <Ionicons name="wallet-outline" size={18} color="#FFF" />
                            <Text style={styles.pagamentoButtonInlineText}>Ver cobrança</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Contato</Text>

                    <View style={isLargeScreen ? styles.actionsRowDesktop : null}>
                        <TouchableOpacity
                            style={[styles.whatsBtn, isLargeScreen && styles.actionBtnDesktop]}
                            onPress={abrirWhatsAppProfissional}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                            <Text style={styles.whatsText}>
                                Chamar no WhatsApp
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.paymentBtn, isLargeScreen && styles.actionBtnDesktop]}
                            onPress={abrirTelaPagamento}
                        >
                            <Ionicons name="wallet-outline" size={20} color="#FFF" />
                            <Text style={styles.btnText}>VER COBRANÇA</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={isLargeScreen ? styles.actionsRowDesktop : null}>
                    {podeCancelar(agendamento?.status) && (
                        <View style={[styles.actionArea, isLargeScreen && styles.actionBtnDesktop]}>
                            {loadingAcao ? (
                                <ActivityIndicator
                                    size="large"
                                    color={colors.primary}
                                />
                            ) : (
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={cancelarAgendamento}
                                >
                                    <Ionicons
                                        name="close-circle-outline"
                                        size={20}
                                        color="#FFF"
                                    />
                                    <Text style={styles.btnText}>
                                        CANCELAR AGENDAMENTO
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {!loadingAvaliacao && podeAvaliar && (
                        <View style={[styles.actionArea, isLargeScreen && styles.actionBtnDesktop]}>
                            <TouchableOpacity
                                style={styles.rateBtn}
                                onPress={abrirTelaAvaliacao}
                            >
                                <Ionicons
                                    name="star-outline"
                                    size={20}
                                    color="#FFF"
                                />
                                <Text style={styles.btnText}>
                                    AVALIAR ATENDIMENTO
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {!loadingAvaliacao &&
                    agendamento?.status === 'concluido' &&
                    jaAvaliado && (
                        <View style={styles.avaliadoBox}>
                            <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color="#27AE60"
                            />
                            <Text style={styles.avaliadoText}>
                                Você já avaliou este atendimento
                            </Text>
                        </View>
                    )}

                <TouchableOpacity
                    style={styles.btnVoltar}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.btnVoltarTxt}>
                        VOLTAR
                    </Text>
                </TouchableOpacity>
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
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    webLayout: {
        flex: 1,
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
    },
    webContentArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        height: '100%',
        display: 'flex',
        overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
    },
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    contentLarge: {
        padding: 40,
        paddingTop: 48,
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
    },
    scrollContent: {
        flex: 1,
        height: Platform.OS === 'web' ? '100%' : 'auto',
    },
    webContainer: {
        width: '100%',
    },
    backButton: {
        marginBottom: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionsRowDesktop: {
        flexDirection: 'row',
        gap: 16,
    },
    actionBtnDesktop: {
        flex: 1,
    },
    header: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        overflow: 'hidden',
    },
    headerLarge: {
        marginBottom: 24,
    },
    headerCircle: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -34,
        right: -18,
    },
    headerCircleTwo: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -18,
        left: -10,
    },
    headerContent: {
        zIndex: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 12,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 6,
    },
    origemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    origemText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    cardsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHalf: {
        flex: 1,
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    profissionalBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarFallback: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: `${colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarFallbackText: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },
    profissionalInfo: {
        flex: 1,
        marginLeft: 16,
    },
    profissionalNome: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    profissionalSub: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 2,
    },
    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    itemServicoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    servicoNome: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 10,
    },
    servicoPreco: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 2,
        borderTopColor: '#F1F5F9',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#10B981',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 12,
    },
    pagamentoResumoBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
    },
    pagamentoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    pagamentoFormaText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    pagamentoStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pagamentoStatusText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    pagamentoValorText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1E293B',
    },
    pagamentoButtonInline: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    pagamentoButtonInlineText: {
        color: '#FFF',
        fontWeight: '700',
        marginLeft: 8,
        fontSize: 14,
    },
    whatsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#25D366',
        backgroundColor: '#FFF',
        marginBottom: 12,
    },
    whatsText: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '700',
        color: '#128C7E',
    },
    paymentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: colors.primary,
    },
    actionArea: {
        marginBottom: 16,
    },
    actionsRowDesktop: {
        flexDirection: 'row',
        gap: 16,
    },
    actionAreaDesktop: {
        flex: 1,
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#EF4444',
    },
    rateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F59E0B',
    },
    btnText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 10,
        fontSize: 14,
    },
    avaliadoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#ECFDF5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    avaliadoText: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
    btnVoltar: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 15,
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    btnVoltarTxt: {
        color: colors.primary,
        fontWeight: '800',
    },
});
