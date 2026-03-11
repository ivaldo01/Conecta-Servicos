import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function RelatoriosPro() {
    const [loading, setLoading] = useState(true);
    const [agendamentosConcluidos, setAgendamentosConcluidos] = useState([]);
    const [avaliacoes, setAvaliacoes] = useState([]);

    useEffect(() => {
        carregarDadosFinanceiros();
    }, []);

    const formatarMoeda = (valor) => {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    const valorDoAgendamento = (data) => {
        if (data?.servicos && Array.isArray(data.servicos)) {
            return data.servicos.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0);
        }
        return parseFloat(data?.preco || 0);
    };

    const carregarDadosFinanceiros = async () => {
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return;
            }

            const qAgendamentos = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", user.uid),
                where("status", "==", "concluido")
            );

            const qAvaliacoes = query(
                collection(db, "avaliacoes"),
                where("profissionalId", "==", user.uid)
            );

            const [agendamentosSnap, avaliacoesSnap] = await Promise.all([
                getDocs(qAgendamentos),
                getDocs(qAvaliacoes),
            ]);

            const listaAgendamentos = agendamentosSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            const listaAvaliacoes = avaliacoesSnap.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));

            const ordenados = listaAgendamentos.sort((a, b) => {
                const dataA = a.dataCriacao?.seconds || 0;
                const dataB = b.dataCriacao?.seconds || 0;
                return dataB - dataA;
            });

            setAgendamentosConcluidos(ordenados);
            setAvaliacoes(listaAvaliacoes);
        } catch (error) {
            console.error("Erro ao carregar relatório:", error);
        } finally {
            setLoading(false);
        }
    };

    const resumo = useMemo(() => {
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();
        const diaAtual = hoje.getDate();

        let faturamentoTotal = 0;
        let faturamentoHoje = 0;
        let faturamentoMes = 0;
        let totalAtendimentos = 0;
        let atendimentosHoje = 0;
        let atendimentosMes = 0;

        agendamentosConcluidos.forEach((item) => {
            const valor = valorDoAgendamento(item);
            faturamentoTotal += valor;
            totalAtendimentos += 1;

            let dataItem = null;

            if (item.dataFiltro) {
                const [ano, mes, dia] = item.dataFiltro.split('-').map(Number);
                dataItem = new Date(ano, mes - 1, dia);
            } else if (item.dataCriacao?.seconds) {
                dataItem = new Date(item.dataCriacao.seconds * 1000);
            }

            if (dataItem) {
                const mesmoAno = dataItem.getFullYear() === anoAtual;
                const mesmoMes = dataItem.getMonth() === mesAtual;
                const mesmoDia = dataItem.getDate() === diaAtual;

                if (mesmoAno && mesmoMes) {
                    faturamentoMes += valor;
                    atendimentosMes += 1;
                }

                if (mesmoAno && mesmoMes && mesmoDia) {
                    faturamentoHoje += valor;
                    atendimentosHoje += 1;
                }
            }
        });

        const ticketMedio =
            totalAtendimentos > 0 ? faturamentoTotal / totalAtendimentos : 0;

        const mediaAvaliacoes =
            avaliacoes.length > 0
                ? avaliacoes.reduce((acc, item) => acc + Number(item.nota || 0), 0) / avaliacoes.length
                : 0;

        return {
            faturamentoTotal,
            faturamentoHoje,
            faturamentoMes,
            totalAtendimentos,
            atendimentosHoje,
            atendimentosMes,
            ticketMedio,
            mediaAvaliacoes,
            totalAvaliacoes: avaliacoes.length,
        };
    }, [agendamentosConcluidos, avaliacoes]);

    const dadosGrafico = useMemo(() => {
        const itens = [
            { label: 'Hoje', valor: resumo.faturamentoHoje },
            { label: 'Mês', valor: resumo.faturamentoMes },
            { label: 'Total', valor: resumo.faturamentoTotal },
        ];

        const maiorValor = Math.max(...itens.map((i) => i.valor), 1);

        return itens.map((item) => ({
            ...item,
            percentual: (item.valor / maiorValor) * 100,
        }));
    }, [resumo]);

    const ultimosAtendimentos = useMemo(() => {
        return agendamentosConcluidos.slice(0, 5).map((item) => ({
            ...item,
            valorTotal: valorDoAgendamento(item),
        }));
    }, [agendamentosConcluidos]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando seu relatório...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={styles.header}>
                <Text style={styles.title}>Relatório Financeiro</Text>

                <TouchableOpacity onPress={carregarDadosFinanceiros}>
                    <Ionicons name="refresh-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.mainCard}>
                <Text style={styles.cardLabel}>Faturamento Total</Text>
                <Text style={styles.totalValue}>{formatarMoeda(resumo.faturamentoTotal)}</Text>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.subText}>
                        {resumo.totalAtendimentos} atendimento(s) concluído(s)
                    </Text>
                </View>
            </View>

            <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                    <Ionicons name="today-outline" size={22} color={colors.primary} />
                    <Text style={styles.smallLabel}>Hoje</Text>
                    <Text style={styles.smallValue}>{formatarMoeda(resumo.faturamentoHoje)}</Text>
                    <Text style={styles.smallSub}>{resumo.atendimentosHoje} atendimento(s)</Text>
                </View>

                <View style={styles.infoCard}>
                    <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                    <Text style={styles.smallLabel}>Este mês</Text>
                    <Text style={styles.smallValue}>{formatarMoeda(resumo.faturamentoMes)}</Text>
                    <Text style={styles.smallSub}>{resumo.atendimentosMes} atendimento(s)</Text>
                </View>

                <View style={styles.infoCard}>
                    <Ionicons name="trending-up-outline" size={22} color={colors.primary} />
                    <Text style={styles.smallLabel}>Ticket médio</Text>
                    <Text style={styles.smallValue}>{formatarMoeda(resumo.ticketMedio)}</Text>
                    <Text style={styles.smallSub}>por atendimento</Text>
                </View>

                <View style={styles.infoCard}>
                    <Ionicons name="star-outline" size={22} color={colors.warning || "#FFC107"} />
                    <Text style={styles.smallLabel}>Avaliação média</Text>
                    <Text style={styles.smallValue}>
                        {resumo.totalAvaliacoes > 0 ? resumo.mediaAvaliacoes.toFixed(1) : "—"}
                    </Text>
                    <Text style={styles.smallSub}>
                        {resumo.totalAvaliacoes} avaliação{resumo.totalAvaliacoes === 1 ? "" : "ões"}
                    </Text>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Comparativo de faturamento</Text>

                {dadosGrafico.map((item) => (
                    <View key={item.label} style={styles.barItem}>
                        <View style={styles.barHeader}>
                            <Text style={styles.barLabel}>{item.label}</Text>
                            <Text style={styles.barValue}>{formatarMoeda(item.valor)}</Text>
                        </View>

                        <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${item.percentual}%` }]} />
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Últimos atendimentos concluídos</Text>

                {ultimosAtendimentos.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhum atendimento concluído ainda.</Text>
                ) : (
                    ultimosAtendimentos.map((item) => (
                        <View key={item.id} style={styles.atendimentoCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.atendimentoCliente}>
                                    {item.clienteNome || "Cliente"}
                                </Text>
                                <Text style={styles.atendimentoInfo}>
                                    {item.data || "Data não informada"} às {item.horario || "--:--"}
                                </Text>
                            </View>

                            <Text style={styles.atendimentoValor}>
                                {formatarMoeda(item.valorTotal)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={24} color="#856404" />
                <Text style={styles.tipText}>
                    Este relatório considera apenas agendamentos com status{" "}
                    <Text style={{ fontWeight: 'bold' }}>concluído</Text> como faturamento realizado.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 20,
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 10,
        color: '#666',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },

    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },

    mainCard: {
        backgroundColor: colors.primary,
        padding: 25,
        borderRadius: 20,
        elevation: 8,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },

    cardLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
    },

    totalValue: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginVertical: 10,
    },

    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 15,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    subText: {
        color: '#FFF',
        marginLeft: 10,
        fontSize: 16,
    },

    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 20,
    },

    infoCard: {
        backgroundColor: '#FFF',
        width: '48%',
        padding: 18,
        borderRadius: 15,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        marginBottom: 14,
    },

    smallLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: 'bold',
        marginTop: 8,
    },

    smallValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 6,
    },

    smallSub: {
        fontSize: 12,
        color: '#777',
        marginTop: 4,
    },

    sectionCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginTop: 18,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 14,
    },

    barItem: {
        marginBottom: 14,
    },

    barHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },

    barLabel: {
        fontSize: 13,
        color: '#555',
        fontWeight: '600',
    },

    barValue: {
        fontSize: 13,
        color: '#333',
        fontWeight: 'bold',
    },

    barTrack: {
        height: 12,
        backgroundColor: '#E9ECEF',
        borderRadius: 999,
        overflow: 'hidden',
    },

    barFill: {
        height: 12,
        backgroundColor: colors.primary,
        borderRadius: 999,
    },

    atendimentoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },

    atendimentoCliente: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },

    atendimentoInfo: {
        fontSize: 12,
        color: '#777',
        marginTop: 3,
    },

    atendimentoValor: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        marginLeft: 10,
    },

    emptyText: {
        color: '#999',
        textAlign: 'center',
        paddingVertical: 10,
    },

    tipCard: {
        backgroundColor: '#FFF3CD',
        padding: 15,
        borderRadius: 12,
        marginTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFEEBA',
    },

    tipText: {
        color: '#856404',
        marginLeft: 10,
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
});