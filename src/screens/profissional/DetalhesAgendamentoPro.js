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
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function DetalhesAgendamentoPro({ route, navigation }) {
    const { agendamentoId } = route.params || {};
    const [agendamento, setAgendamento] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarAgendamento();
    }, [agendamentoId]);

    const carregarAgendamento = async () => {
        if (!agendamentoId) {
            Alert.alert("Erro", "Agendamento não encontrado.");
            navigation.goBack();
            return;
        }

        try {
            setLoading(true);

            const ref = doc(db, "agendamentos", agendamentoId);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                Alert.alert("Erro", "Agendamento não encontrado.");
                navigation.goBack();
                return;
            }

            setAgendamento({
                id: snap.id,
                ...snap.data(),
            });
        } catch (error) {
            console.log("Erro ao carregar detalhes do agendamento:", error);
            Alert.alert("Erro", "Não foi possível carregar os detalhes.");
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const abrirWhatsapp = async () => {
        if (!agendamento?.clienteWhatsapp) {
            Alert.alert("Aviso", "Este cliente não possui WhatsApp cadastrado.");
            return;
        }

        const tel = agendamento.clienteWhatsapp.replace(/\D/g, '');
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmado':
                return '#27AE60';
            case 'cancelado':
                return '#6c757d';
            case 'recusado':
                return '#C62828';
            case 'concluido':
                return '#1565C0';
            default:
                return '#E67E22';
        }
    };

    const valorTotal = agendamento?.servicos
        ? agendamento.servicos.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0)
        : parseFloat(agendamento?.preco || 0);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!agendamento) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.emptyText}>Agendamento não encontrado.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalhes do Agendamento</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>CLIENTE</Text>
                <Text style={styles.clienteNome}>
                    {agendamento.clienteNome || "Cliente Particular"}
                </Text>

                <View style={styles.infoLine}>
                    <Ionicons name="call-outline" size={18} color={colors.primary} />
                    <Text style={styles.infoLineText}>
                        {agendamento.clienteWhatsapp || "WhatsApp não informado"}
                    </Text>
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.whatsappBtn} onPress={abrirWhatsapp}>
                    <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                    <Text style={styles.whatsappBtnText}>Chamar no WhatsApp</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>AGENDADO PARA</Text>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>{agendamento.data}</Text>
                </View>

                <View style={[styles.infoRow, { marginTop: 10 }]}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>{agendamento.horario}</Text>
                </View>

                <View style={[styles.infoRow, { marginTop: 10 }]}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>
                        {agendamento.colaboradorNome || "Profissional"}
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>SERVIÇOS E VALORES</Text>

                {agendamento.servicos && agendamento.servicos.length > 0 ? (
                    agendamento.servicos.map((item, index) => (
                        <View key={index} style={styles.servicoItem}>
                            <Text style={styles.servicoNome}>{item.nome}</Text>
                            <Text style={styles.servicoPreco}>
                                R$ {parseFloat(item.preco || 0).toFixed(2)}
                            </Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.servicoItem}>
                        <Text style={styles.servicoNome}>
                            {agendamento.servicoNome || "Serviço"}
                        </Text>
                        <Text style={styles.servicoPreco}>
                            R$ {parseFloat(agendamento.preco || 0).toFixed(2)}
                        </Text>
                    </View>
                )}

                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>TOTAL A RECEBER</Text>
                    <Text style={styles.totalValor}>R$ {valorTotal.toFixed(2)}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>LOCAL DO ATENDIMENTO</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color="#E74C3C" />
                    <Text style={styles.enderecoText}>
                        {agendamento.clienteEndereco ||
                            agendamento.endereco ||
                            "Endereço não disponível"}
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.statusBanner,
                    { backgroundColor: getStatusColor(agendamento.status) },
                ]}
            >
                <Text style={styles.statusBannerText}>
                    STATUS: {(agendamento.status || 'pendente').toUpperCase()}
                </Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyText: {
        color: '#666',
        fontSize: 16,
    },

    header: {
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#FFF',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },

    backBtn: {
        padding: 5,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 15,
        color: '#333',
    },

    card: {
        backgroundColor: '#FFF',
        padding: 20,
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 15,
        elevation: 2,
    },

    label: {
        fontSize: 11,
        color: '#AAA',
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },

    clienteNome: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },

    infoLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },

    infoLineText: {
        fontSize: 14,
        color: '#444',
        marginLeft: 8,
    },

    divider: {
        height: 1,
        backgroundColor: '#EEE',
        marginVertical: 15,
    },

    whatsappBtn: {
        backgroundColor: '#25D366',
        flexDirection: 'row',
        padding: 12,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    whatsappBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 10,
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    infoText: {
        fontSize: 16,
        marginLeft: 10,
        color: '#444',
        fontWeight: '500',
    },

    servicoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },

    servicoNome: {
        fontSize: 15,
        color: '#666',
        flex: 1,
        paddingRight: 10,
    },

    servicoPreco: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },

    totalContainer: {
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    totalLabel: {
        fontWeight: 'bold',
        color: '#333',
        fontSize: 12,
    },

    totalValor: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primary,
    },

    enderecoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
        flex: 1,
        lineHeight: 20,
    },

    statusBanner: {
        margin: 20,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },

    statusBannerText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 1,
    },
});