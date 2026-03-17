import React, { useEffect, useState } from 'react';
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
import { doc, updateDoc, getDoc, onSnapshot } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function DetalhesAgendamento({ route, navigation }) {
    const { agendamento } = route.params || {};
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [loadingAvaliacao, setLoadingAvaliacao] = useState(true);
    const [jaAvaliado, setJaAvaliado] = useState(false);
    const [statusPagamentoAtual, setStatusPagamentoAtual] = useState(agendamento?.statusPagamento || 'aguardando_cobranca');

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

    const podeCancelar = (status) => {
        return status === 'pendente' || status === 'confirmado';
    };

    const podeAvaliar = (status) => {
        return status === 'concluido' && !jaAvaliado;
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
                            });

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

    const totalAgendamento =
        agendamento?.servicos?.reduce(
            (acc, s) => acc + parseFloat(s.preco || 0),
            0
        ) || 0;

    const statusConfig = getStatusConfig(agendamento?.status);

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

    const pagamentoLabel = getStatusPagamentoLabel(statusPagamentoAtual);
    const pagamentoCor = getStatusPagamentoCor(statusPagamentoAtual);

    const abrirTelaPagamento = () => {
        navigation.navigate('PagamentoAgendamento', {
            agendamento,
            agendamentoId: agendamento?.id,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Detalhes do Agendamento</Text>

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
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>PROFISSIONAL</Text>
                    <Text style={styles.value}>
                        {agendamento?.colaboradorNome || "Profissional não informado"}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>
                        SERVIÇOS CONTRATADOS
                    </Text>

                    {agendamento?.servicos?.map((s, index) => (
                        <View key={index} style={styles.itemServico}>
                            <Text style={styles.servicoNome}>{s.nome}</Text>
                            <Text style={styles.servicoPreco}>
                                R$ {parseFloat(s.preco || 0).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={styles.totalValue}>
                            R$ {totalAgendamento.toFixed(2)}
                        </Text>
                    </View>

                    <Text style={[styles.label, { marginTop: 16 }]}>PAGAMENTO</Text>

                    <View style={styles.pagamentoResumoBox}>
                        <View>
                            <Text style={styles.pagamentoFormaText}>
                                {agendamento?.formaPagamentoLabel || 'Pix'}
                            </Text>
                            <Text style={[styles.pagamentoStatusText, { color: pagamentoCor }]}>
                                {pagamentoLabel}
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

                    <Text style={[styles.label, { marginTop: 16 }]}>
                        DATA E HORÁRIO
                    </Text>

                    <Text style={styles.value}>
                        {agendamento?.data} às {agendamento?.horario}
                    </Text>

                    <Text style={[styles.label, { marginTop: 16 }]}>
                        CONTATO
                    </Text>

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

                {!loadingAvaliacao && podeAvaliar(agendamento?.status) && (
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
        backgroundColor: '#F7F8FA',
    },

    header: {
        padding: 24,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderColor: '#EEE',
    },

    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    statusBadge: {
        marginTop: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },

    statusText: {
        marginLeft: 6,
        fontWeight: 'bold',
        fontSize: 12,
    },

    card: {
        backgroundColor: '#FFF',
        margin: 20,
        padding: 20,
        borderRadius: 16,
        elevation: 2,
    },

    label: {
        fontSize: 11,
        color: '#999',
        fontWeight: 'bold',
        letterSpacing: 1,
    },

    value: {
        fontSize: 16,
        color: '#333',
        marginTop: 4,
    },

    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },

    servicoNome: {
        fontSize: 14,
        color: '#444',
        flex: 1,
        paddingRight: 10,
    },

    servicoPreco: {
        fontWeight: 'bold',
    },

    totalRow: {
        marginTop: 14,
        borderTopWidth: 1,
        borderColor: '#EEE',
        paddingTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    totalLabel: {
        fontWeight: 'bold',
    },

    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },

    whatsBtn: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FFF4',
        padding: 12,
        borderRadius: 10,
    },

    whatsText: {
        marginLeft: 8,
        fontWeight: 'bold',
        color: '#25D366',
        flex: 1,
    },

    pagamentoResumoBox: {
        marginTop: 8,
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E4EAF1',
    },

    pagamentoFormaText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    pagamentoStatusText: {
        marginTop: 4,
        fontSize: 14,
        fontWeight: '600',
    },

    pagamentoButtonInline: {
        marginTop: 12,
        backgroundColor: colors.primary,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },

    pagamentoButtonInlineText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },

    paymentBtn: {
        marginTop: 14,
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    actionArea: {
        marginHorizontal: 20,
        marginBottom: 10,
    },

    cancelBtn: {
        backgroundColor: '#E74C3C',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    rateBtn: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    btnText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },

    avaliadoBox: {
        marginHorizontal: 20,
        marginBottom: 10,
        backgroundColor: '#F0FFF4',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },

    avaliadoText: {
        color: '#27AE60',
        marginLeft: 6,
        fontWeight: 'bold',
    },

    btnVoltar: {
        margin: 20,
        padding: 15,
        alignItems: 'center',
    },

    btnVoltarTxt: {
        color: '#999',
        fontWeight: 'bold',
    },
});