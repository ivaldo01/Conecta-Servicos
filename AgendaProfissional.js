import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function AgendaProfissional({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "agendamentos"), where("clinicaId", "==", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAgendamentos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.log("Erro de permissão ou busca:", error);
        });

        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("DetalhesAgendamento", { agendamento: item })}
        >
            <View style={styles.headerCard}>
                <Text style={styles.hora}>{item.horario || "00:00"}</Text>
                <Text style={[styles.status, { color: item.status === 'confirmado' ? 'green' : colors.primary }]}>
                    {(item.status || "pendente").toUpperCase()}
                </Text>
            </View>
            <Text style={styles.clienteNome}>{item.clienteNome || "Carregando..."}</Text>
            <Text style={styles.servico}>{item.servicoNome}</Text>
            <Text style={styles.txtToque}>Ver detalhes e endereço ➔</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Agenda de Pedidos</Text>
            <FlatList
                data={agendamentos}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Nenhum pedido ainda.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
    headerCard: { flexDirection: 'row', justifyContent: 'space-between' },
    hora: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
    status: { fontWeight: 'bold', fontSize: 12 },
    clienteNome: { fontSize: 16, fontWeight: '600' },
    servico: { color: '#666' },
    txtToque: { fontSize: 10, color: colors.primary, marginTop: 10, textAlign: 'right' }
});