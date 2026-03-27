import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAuth } from "../../hooks/useAuth";
import { useRelatoriosPro } from "../../hooks/useRelatoriosPro";
import EmptyState from "../../components/EmptyState";

export default function RelatoriosPro() {
    const { usuario, loadingAuth } = useAuth();

    const {
        loading,
        resumo,
        dadosGrafico,
        ultimosAtendimentos,
        carregarDadosFinanceiros,
    } = useRelatoriosPro(usuario?.uid);

    if (loadingAuth || loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando seu relatório...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.topBanner}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Relatório Financeiro</Text>
                    <Text style={styles.subtitle}>
                        Acompanhe seu faturamento e desempenho
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={carregarDadosFinanceiros}
                    style={styles.refreshButton}
                >
                    <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.mainCard}>
                <Text style={styles.cardLabel}>Faturamento Total</Text>
                <Text style={styles.totalValue}>
                    {formatCurrency(resumo.faturamentoTotal)}
                </Text>

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
                    <View style={styles.infoIconBox}>
                        <Ionicons name="today-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.smallLabel}>Hoje</Text>
                    <Text style={styles.smallValue}>
                        {formatCurrency(resumo.faturamentoHoje)}
                    </Text>
                    <Text style={styles.smallSub}>
                        {resumo.atendimentosHoje} atendimento(s)
                    </Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoIconBox}>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.smallLabel}>Este mês</Text>
                    <Text style={styles.smallValue}>
                        {formatCurrency(resumo.faturamentoMes)}
                    </Text>
                    <Text style={styles.smallSub}>
                        {resumo.atendimentosMes} atendimento(s)
                    </Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoIconBox}>
                        <Ionicons name="trending-up-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.smallLabel}>Ticket médio</Text>
                    <Text style={styles.smallValue}>
                        {formatCurrency(resumo.ticketMedio)}
                    </Text>
                    <Text style={styles.smallSub}>por atendimento</Text>
                </View>

                <View style={styles.infoCard}>
                    <View style={styles.infoIconBox}>
                        <Ionicons
                            name="star-outline"
                            size={20}
                            color={colors.warning || "#FFC107"}
                        />
                    </View>
                    <Text style={styles.smallLabel}>Avaliação média</Text>
                    <Text style={styles.smallValue}>
                        {resumo.totalAvaliacoes > 0
                            ? resumo.mediaAvaliacoes.toFixed(1)
                            : "—"}
                    </Text>
                    <Text style={styles.smallSub}>
                        {resumo.totalAvaliacoes} avaliação
                        {resumo.totalAvaliacoes === 1 ? "" : "ões"}
                    </Text>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Comparativo de faturamento</Text>

                {dadosGrafico.map((item) => (
                    <View key={item.label} style={styles.barItem}>
                        <View style={styles.barHeader}>
                            <Text style={styles.barLabel}>{item.label}</Text>
                            <Text style={styles.barValue}>
                                {formatCurrency(item.valor)}
                            </Text>
                        </View>

                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    { width: `${item.percentual}%` },
                                ]}
                            />
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Últimos atendimentos concluídos</Text>

                {ultimosAtendimentos.length === 0 ? (
                    <EmptyState
                        icon="receipt-outline"
                        title="Nenhum atendimento concluído"
                        subtitle="Quando você concluir atendimentos, eles aparecerão aqui."
                    />
                ) : (
                    ultimosAtendimentos.map((item) => (
                        <View key={item.id} style={styles.atendimentoCard}>
                            <View style={styles.atendimentoAvatar}>
                                <Ionicons name="person-outline" size={18} color={colors.primary} />
                            </View>

                            <View style={styles.atendimentoContent}>
                                <Text style={styles.atendimentoCliente}>
                                    {item.clienteNome || "Cliente"}
                                </Text>
                                <Text style={styles.atendimentoInfo}>
                                    {item.data || "Data não informada"} às {item.horario || "--:--"}
                                </Text>
                            </View>

                            <Text style={styles.atendimentoValor}>
                                {formatCurrency(item.valorTotal)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={22} color="#856404" />
                <Text style={styles.tipText}>
                    Este relatório considera apenas agendamentos com status{" "}
                    <Text style={styles.tipBold}>concluído</Text> como faturamento realizado.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    scrollContent: {
        padding: 20,
        paddingBottom: 30,
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },

    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 14,
    },

    topBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 20,
    },

    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#222',
    },

    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },

    refreshButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
    },

    mainCard: {
        backgroundColor: colors.primary,
        padding: 25,
        borderRadius: 22,
        elevation: 8,
        shadowColor: colors.primary,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        marginBottom: 6,
    },

    cardLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    totalValue: {
        color: '#FFF',
        fontSize: 34,
        fontWeight: 'bold',
        marginVertical: 10,
    },

    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.22)',
        marginVertical: 15,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    subText: {
        color: '#FFF',
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '500',
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
        borderRadius: 16,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        marginBottom: 14,
    },

    infoIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    smallLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: 'bold',
        marginTop: 10,
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
        borderRadius: 18,
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
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },

    atendimentoAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: `${colors.primary}12`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    atendimentoContent: {
        flex: 1,
        marginLeft: 12,
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

    tipCard: {
        backgroundColor: '#FFF3CD',
        padding: 15,
        borderRadius: 14,
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
        lineHeight: 19,
    },

    tipBold: {
        fontWeight: 'bold',
    },
});