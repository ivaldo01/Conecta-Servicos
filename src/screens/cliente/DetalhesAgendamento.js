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
import { auth, db } from "../../services/firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function DetalhesAgendamento({ route, navigation }) {
    const { agendamento } = route.params || {};
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [loadingAvaliacao, setLoadingAvaliacao] = useState(true);
    const [jaAvaliado, setJaAvaliado] = useState(false);

    useEffect(() => {
        verificarAvaliacao();
    }, [agendamento?.id]);

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

    const getStatusConfig = (status) => {
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
    };

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

        if (!tel || tel === "") {
            Alert.alert("Aviso", "Número do profissional não disponível.");
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
                            console.log("Erro ao cancelar agendamento:", error);
                            Alert.alert("Erro", "Não foi possível cancelar o agendamento.");
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

    const totalAgendamento = agendamento?.servicos?.reduce(
        (acc, s) => acc + parseFloat(s.preco || 0),
        0
    ) || parseFloat(agendamento?.preco || 0);

    const statusConfig = getStatusConfig(agendamento?.status);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Detalhes do Agendamento</Text>

                <View style={[styles.statusBadge, { backgroundColor: statusConfig.cor }]}>
                    <Text style={styles.statusText}>{statusConfig.label}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>PROFISSIONAL</Text>
                <Text style={styles.value}>
                    {agendamento?.colaboradorNome || "Profissional não informado"}
                </Text>

                <Text style={[styles.label, { marginTop: 15 }]}>SERVIÇOS CONTRATADOS</Text>
                {agendamento?.servicos && agendamento.servicos.length > 0 ? (
                    agendamento.servicos.map((s, index) => (
                        <View key={index} style={styles.itemServico}>
                            <Text style={styles.servicoNome}>• {s.nome}</Text>
                            <Text style={styles.servicoPreco}>
                                R$ {parseFloat(s.preco || 0).toFixed(2)}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.value}>Nenhum serviço listado</Text>
                )}

                <View style={styles.linhaTotal}>
                    <Text style={styles.labelTotal}>VALOR TOTAL</Text>
                    <Text style={styles.valorTotal}>R$ {totalAgendamento.toFixed(2)}</Text>
                </View>

                <Text style={[styles.label, { marginTop: 15 }]}>DATA E HORÁRIO</Text>
                <Text style={styles.value}>
                    {agendamento?.data} às {agendamento?.horario}
                </Text>

                <Text style={[styles.label, { marginTop: 15 }]}>STATUS ATUAL</Text>
                <Text style={[styles.value, { color: statusConfig.cor, fontWeight: 'bold' }]}>
                    {statusConfig.label}
                </Text>

                <Text style={[styles.label, { marginTop: 15 }]}>CONTATO DO PROFISSIONAL</Text>
                <TouchableOpacity onPress={abrirWhatsAppProfissional} style={styles.zapRow}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    <Text style={styles.link}> Chamar no WhatsApp</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 15 }]}>LOCAL DO ATENDIMENTO</Text>
                <Text style={styles.value}>
                    {agendamento?.clienteEndereco ||
                        agendamento?.enderecoCliente ||
                        agendamento?.endereco ||
                        "Endereço não informado"}
                </Text>
            </View>

            {podeCancelar(agendamento?.status) && (
                <View style={styles.areaAcoes}>
                    {loadingAcao ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <TouchableOpacity
                            style={[styles.btnAcao, { backgroundColor: '#E74C3C' }]}
                            onPress={cancelarAgendamento}
                        >
                            <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                            <Text style={styles.btnText}>CANCELAR AGENDAMENTO</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {!loadingAvaliacao && podeAvaliar(agendamento?.status) && (
                <View style={styles.areaAcoes}>
                    <TouchableOpacity
                        style={[styles.btnAcao, { backgroundColor: colors.primary }]}
                        onPress={abrirTelaAvaliacao}
                    >
                        <Ionicons name="star-outline" size={20} color="#FFF" />
                        <Text style={styles.btnText}>AVALIAR ATENDIMENTO</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loadingAvaliacao && agendamento?.status === 'concluido' && jaAvaliado && (
                <View style={styles.avaliadoBox}>
                    <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                    <Text style={styles.avaliadoText}>Você já avaliou este atendimento</Text>
                </View>
            )}

            <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
                <Text style={styles.btnVoltarTxt}>VOLTAR</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    header: {
        padding: 30,
        backgroundColor: '#FFF',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#EEE',
    },

    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 5,
        marginTop: 8,
    },

    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },

    card: {
        backgroundColor: '#FFF',
        margin: 20,
        padding: 20,
        borderRadius: 15,
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
        marginBottom: 10,
        fontWeight: '500',
    },

    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
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
    },

    linhaTotal: {
        borderTopWidth: 1,
        borderColor: '#EEE',
        marginTop: 10,
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    labelTotal: {
        fontWeight: 'bold',
        color: '#333',
    },

    valorTotal: {
        fontWeight: 'bold',
        color: colors.primary,
        fontSize: 18,
    },

    zapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#F0FFF4',
        padding: 10,
        borderRadius: 8,
    },

    link: {
        fontSize: 16,
        color: '#25D366',
        fontWeight: 'bold',
    },

    areaAcoes: {
        marginHorizontal: 20,
        marginBottom: 10,
    },

    btnAcao: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
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
        alignItems: 'center',
        justifyContent: 'center',
    },

    avaliadoText: {
        color: '#27AE60',
        fontWeight: 'bold',
        marginLeft: 8,
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