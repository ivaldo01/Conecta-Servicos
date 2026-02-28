import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function MeusAgendamentosCliente() {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        // Busca agendamentos onde o clienteId é o do usuário logado
        const q = query(
            collection(db, "agendamentos"),
            where("clienteId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            // Ordena por data de criação (os mais recentes primeiro)
            setAgendamentos(lista.sort((a, b) => b.criadoEm - a.criadoEm));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmado': return { color: colors.success, label: 'Confirmado' };
            case 'cancelado': return { color: '#FF4444', label: 'Cancelado' };
            default: return { color: colors.primary, label: 'Pendente' };
        }
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.servicoNome}>{item.servicoNome}</Text>
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

                <View style={styles.priceTag}>
                    <Text style={styles.priceText}>R$ {parseFloat(item.preco).toFixed(2)}</Text>
                </View>
            </View>
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
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    servicoNome: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    infoText: { fontSize: 14, color: '#666', marginLeft: 8 },
    priceTag: { marginTop: 10, alignSelf: 'flex-end', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    priceText: { color: colors.success, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 }
});