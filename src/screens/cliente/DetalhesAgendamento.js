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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import { doc, updateDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { liberarHorario } from '../../utils/agendaDisponibilidade';

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
            const avaliacaoRef = doc(db, "avaliacoes", agendamento.id);
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.header}>
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

                <View style={styles.card}>
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
                    <Text style={styles.sectionTitle}>Data e horário</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>
                            {agendamento?.data} às {agendamento?.horario}
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

                    <TouchableOpacity
                        style={styles.whatsBtn}
                        onPress={abrirWhatsAppProfissional}
                    >
                        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                        <Text style={styles.whatsText}>
                            Chamar no WhatsApp com mensagem pronta
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.paymentBtn}
                        onPress={abrirTelaPagamento}
                    >
                        <Ionicons name="wallet-outline" size={20} color="#FFF" />
                        <Text style={styles.btnText}>VER COBRANÇA / PAGAMENTO</Text>
                    </TouchableOpacity>
                </View>

                {podeCancelar(agendamento?.status) && (
                    <View style={styles.actionArea}>
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
                    <View style={styles.actionArea}>
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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEF3F9',
    },

    content: {
        paddingBottom: 28,
    },

    header: {
        padding: 20,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },

    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
    },

    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 12,
    },

    statusBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },

    statusText: {
        marginLeft: 6,
        fontWeight: '800',
        fontSize: 12,
    },

    origemBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 20,
        marginBottom: 8,
    },

    origemText: {
        marginLeft: 6,
        fontWeight: '800',
        fontSize: 12,
    },

    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 18,
        borderRadius: 18,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 14,
    },

    profissionalBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: '#EDEFF3',
    },

    avatarFallback: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: `${colors.primary}18`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatarFallbackText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.primary,
    },

    profissionalInfo: {
        flex: 1,
        marginLeft: 14,
    },

    profissionalNome: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textDark,
    },

    profissionalSub: {
        marginTop: 4,
        fontSize: 13,
        color: colors.secondary,
    },

    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
    },

    itemServicoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 12,
    },

    servicoNome: {
        fontSize: 14,
        color: '#444',
        marginLeft: 8,
        flex: 1,
    },

    servicoPreco: {
        fontWeight: '800',
        color: colors.textDark,
    },

    totalRow: {
        marginTop: 8,
        borderTopWidth: 1,
        borderColor: '#EEE',
        paddingTop: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    totalLabel: {
        fontWeight: '800',
        color: colors.textDark,
    },

    totalValue: {
        fontSize: 19,
        fontWeight: '800',
        color: colors.primary,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    infoText: {
        fontSize: 15,
        color: '#333',
        marginLeft: 10,
        flex: 1,
    },

    whatsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FFF4',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D8F5E3',
    },

    whatsText: {
        marginLeft: 8,
        fontWeight: '700',
        color: '#25D366',
        flex: 1,
    },

    pagamentoResumoBox: {
        backgroundColor: '#F7F9FC',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E4EAF1',
    },

    pagamentoTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },

    pagamentoFormaText: {
        fontSize: 15,
        fontWeight: '800',
        color: colors.textDark,
    },

    pagamentoStatusBadge: {
        marginTop: 8,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },

    pagamentoStatusText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: '800',
    },

    pagamentoValorText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },

    pagamentoButtonInline: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },

    pagamentoButtonInlineText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
    },

    paymentBtn: {
        marginTop: 14,
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },

    actionArea: {
        marginHorizontal: 16,
        marginTop: 16,
    },

    cancelBtn: {
        backgroundColor: '#E74C3C',
        padding: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#E74C3C',
        shadowOpacity: 0.14,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },

    rateBtn: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },

    btnText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
    },

    avaliadoBox: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: '#F0FFF4',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D8F5E3',
    },

    avaliadoText: {
        color: '#27AE60',
        marginLeft: 6,
        fontWeight: '800',
    },

    btnVoltar: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 15,
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E8EDF5',
    },

    btnVoltarTxt: {
        color: colors.primary,
        fontWeight: '800',
    },
});
