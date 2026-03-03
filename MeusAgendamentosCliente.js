import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function MeusAgendamentosCliente({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;

        // 1. Trava de segurança: se não houver usuário, cancela a operação
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "agendamentos"),
            where("clienteId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            setAgendamentos(lista.sort((a, b) => {
                if (b.criadoEm && a.criadoEm) return b.criadoEm - a.criadoEm;
                return b.data.localeCompare(a.data);
            }));
            setLoading(false);
        }, (error) => {
            // 2. Silencia erro de permissão durante o logout
            if (error.code !== 'permission-denied') {
                console.error("Erro no Firestore Cliente:", error);
            }
            setLoading(false);
        });

        // 3. CRUCIAL: Limpa o listener ao sair da tela ou deslogar
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmado': return { color: '#27AE60', label: 'Confirmado' };
            case 'cancelado': return { color: '#FF4444', label: 'Cancelado' };
            default: return { color: '#E67E22', label: 'Pendente' };
        }
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const total = item.servicos?.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0) || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("DetalhesAgendamento", { agendamento: item })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.servicoNome} numberOfLines={1}>
                        {item.servicos && item.servicos.length > 0
                            ? (item.servicos.length > 1
                                ? `${item.servicos[0].nome} +${item.servicos.length - 1}`
                                : item.servicos[0].nome)
                            : "Serviço"}
                    </Text>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {statusStyle.label.toUpperCase()}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>{item.data} às {item.horario}</Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>Profissional: {item.colaboradorNome}</Text>
                </View>

                <View style={styles.footerCard}>
                    <Text style={styles.servicosLista} numberOfLines={1}>
                        {item.servicos?.map(s => s.nome).join(", ")}
                    </Text>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceText}>R$ {total.toFixed(2)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Meus Agendamentos</Text>
            <FlatList
                data={agendamentos}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Você ainda não possui agendamentos.</Text>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20, paddingTop: 40 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    servicoNome: { fontSize: 17, fontWeight: 'bold', color: colors.primary, flex: 0.7 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    infoText: { fontSize: 14, color: '#666', marginLeft: 8 },
    footerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
    servicosLista: { fontSize: 12, color: '#999', flex: 0.6 },
    priceTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    priceText: { color: '#27AE60', fontWeight: 'bold', fontSize: 15 },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});