import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function RelatoriosPro() {
    const [loading, setLoading] = useState(true);
    const [faturamentoTotal, setFaturamentoTotal] = useState(0);
    const [totalServicos, setTotalServicos] = useState(0);
    const [ticketMedio, setTicketMedio] = useState(0);

    useEffect(() => {
        carregarDadosFinanceiros();
    }, []);

    const carregarDadosFinanceiros = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            // Filtramos apenas os que já foram confirmados (dinheiro no bolso)
            const q = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", user.uid),
                where("status", "==", "confirmado")
            );

            const querySnapshot = await getDocs(q);
            let somaFaturamento = 0;
            let somaServicos = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Lógica de Soma: Verifica se tem lista de serviços ou preço único
                const valorAgendamento = data.servicos
                    ? data.servicos.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0)
                    : parseFloat(data.preco || 0);

                somaFaturamento += valorAgendamento;
                somaServicos++;
            });

            setFaturamentoTotal(somaFaturamento);
            setTotalServicos(somaServicos);
            setTicketMedio(somaServicos > 0 ? somaFaturamento / somaServicos : 0);

        } catch (error) {
            console.error("Erro ao carregar planilha:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: '#666' }}>Carregando sua planilha...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Relatório Financeiro</Text>
                <TouchableOpacity onPress={carregarDadosFinanceiros}>
                    <Ionicons name="refresh-circle" size={30} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* CARD PRINCIPAL: FATURAMENTO */}
            <View style={styles.mainCard}>
                <Text style={styles.cardLabel}>Faturamento Bruto</Text>
                <Text style={styles.totalValue}>R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                <View style={styles.divider} />
                <View style={styles.row}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#FFF" />
                    <Text style={styles.subText}>{totalServicos} serviços finalizados</Text>
                </View>
            </View>

            {/* CARDS SECUNDÁRIOS */}
            <View style={styles.infoRow}>
                <View style={styles.smallCard}>
                    <Ionicons name="trending-up" size={20} color={colors.primary} />
                    <Text style={styles.smallLabel}>Ticket Médio</Text>
                    <Text style={styles.smallValue}>R$ {ticketMedio.toFixed(2)}</Text>
                </View>

                <View style={styles.smallCard}>
                    <Ionicons name="people" size={20} color={colors.secondary} />
                    <Text style={styles.smallLabel}>Volume</Text>
                    <Text style={styles.smallValue}>{totalServicos} Atend.</Text>
                </View>
            </View>

            {/* DICA DE GESTÃO */}
            <View style={styles.tipCard}>
                <Ionicons name="bulb-outline" size={24} color="#856404" />
                <Text style={styles.tipText}>
                    Apenas agendamentos com status <Text style={{ fontWeight: 'bold' }}>confirmado</Text> aparecem nesta soma.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA', padding: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    mainCard: { backgroundColor: colors.primary, padding: 25, borderRadius: 20, elevation: 8, shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10 },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
    totalValue: { color: '#FFF', fontSize: 34, fontWeight: 'bold', marginVertical: 10 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
    row: { flexDirection: 'row', alignItems: 'center' },
    subText: { color: '#FFF', marginLeft: 10, fontSize: 16 },
    infoRow: { flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' },
    smallCard: { backgroundColor: '#FFF', width: '48%', padding: 20, borderRadius: 15, elevation: 3, borderLeftWidth: 4, borderLeftColor: colors.primary },
    smallLabel: { fontSize: 12, color: '#999', fontWeight: 'bold', marginTop: 5 },
    smallValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 5 },
    tipCard: { backgroundColor: '#FFF3CD', padding: 15, borderRadius: 12, marginTop: 30, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FFEEBA' },
    tipText: { color: '#856404', marginLeft: 10, fontSize: 13, flex: 1 }
});