import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function RelatoriosPro() {
    const [loading, setLoading] = useState(true);
    const [faturamentoTotal, setFaturamentoTotal] = useState(0);
    const [totalAgendamentos, setTotalAgendamentos] = useState(0);

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const user = auth.currentUser;
            const q = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", user.uid),
                where("status", "==", "confirmado")
            );

            const querySnapshot = await getDocs(q);
            let total = 0;
            let count = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const valorAgendamento = data.servicos
                    ? data.servicos.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0)
                    : parseFloat(data.preco || 0);

                total += valorAgendamento;
                count++;
            });

            setFaturamentoTotal(total);
            setTotalAgendamentos(count);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Financeiro e Performance</Text>

            <View style={styles.mainCard}>
                <Text style={styles.cardLabel}>Faturamento Total (Confirmados)</Text>
                <Text style={styles.totalValue}>R$ {faturamentoTotal.toFixed(2)}</Text>
                <View style={styles.divider} />
                <View style={styles.row}>
                    <Ionicons name="calendar-check" size={20} color="#FFF" />
                    <Text style={styles.subText}>{totalAgendamentos} Serviços realizados</Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.smallCard}>
                    <Text style={styles.smallLabel}>Média por Pedido</Text>
                    <Text style={styles.smallValue}>
                        R$ {totalAgendamentos > 0 ? (faturamentoTotal / totalAgendamentos).toFixed(2) : "0,00"}
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginTop: 40, marginBottom: 20 },
    mainCard: { backgroundColor: colors.primary, padding: 25, borderRadius: 20, elevation: 5 },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
    totalValue: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginVertical: 10 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 15 },
    row: { flexDirection: 'row', alignItems: 'center' },
    subText: { color: '#FFF', marginLeft: 10, fontSize: 16 },
    infoRow: { flexDirection: 'row', marginTop: 20 },
    smallCard: { backgroundColor: '#FFF', flex: 1, padding: 20, borderRadius: 15, elevation: 2 },
    smallLabel: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    smallValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 5 }
});