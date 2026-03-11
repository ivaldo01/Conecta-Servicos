import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

export default function MeusAgendamentosCliente({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('todos');

    const filtros = [
        { key: 'todos', label: 'Todos' },
        { key: 'pendente', label: 'Pendentes' },
        { key: 'confirmado', label: 'Confirmados' },
        { key: 'concluido', label: 'Concluídos' },
        { key: 'cancelado', label: 'Cancelados' },
        { key: 'recusado', label: 'Recusados' },
    ];

    useEffect(() => {
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "agendamentos"),
            where("clienteId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const lista = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));

                const ordenada = lista.sort((a, b) => {
                    const dataA = a.dataCriacao?.seconds || 0;
                    const dataB = b.dataCriacao?.seconds || 0;
                    return dataB - dataA;
                });

                setAgendamentos(ordenada);
                setLoading(false);
            },
            (error) => {
                if (error.code !== 'permission-denied') {
                    console.error("Erro no Firestore Cliente:", error);
                }
                setLoading(false);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const agendamentosFiltrados = useMemo(() => {
        if (filtroStatus === 'todos') return agendamentos;
        return agendamentos.filter((item) => (item.status || 'pendente') === filtroStatus);
    }, [agendamentos, filtroStatus]);

    const contagemPorStatus = useMemo(() => {
        return {
            todos: agendamentos.length,
            pendente: agendamentos.filter((a) => (a.status || 'pendente') === 'pendente').length,
            confirmado: agendamentos.filter((a) => a.status === 'confirmado').length,
            concluido: agendamentos.filter((a) => a.status === 'concluido').length,
            cancelado: agendamentos.filter((a) => a.status === 'cancelado').length,
            recusado: agendamentos.filter((a) => a.status === 'recusado').length,
        };
    }, [agendamentos]);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'confirmado':
                return { color: '#27AE60', label: 'Confirmado' };
            case 'cancelado':
                return { color: '#6c757d', label: 'Cancelado' };
            case 'recusado':
                return { color: '#C62828', label: 'Recusado' };
            case 'concluido':
                return { color: '#1565C0', label: 'Concluído' };
            default:
                return { color: '#E67E22', label: 'Pendente' };
        }
    };

    const podeCancelar = (status) => {
        return status === 'pendente' || status === 'confirmado';
    };

    const cancelarAgendamento = (item) => {
        Alert.alert(
            "Cancelar agendamento",
            "Tem certeza que deseja cancelar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, cancelar",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await updateDoc(doc(db, "agendamentos", item.id), {
                                status: "cancelado",
                            });

                            Alert.alert("Sucesso", "Agendamento cancelado com sucesso.");
                        } catch (error) {
                            console.log("Erro ao cancelar agendamento:", error);
                            Alert.alert("Erro", "Não foi possível cancelar o agendamento.");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status);
        const total =
            item.servicos?.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0) || 0;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() =>
                    navigation.navigate("DetalhesAgendamento", { agendamento: item })
                }
                activeOpacity={0.9}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.servicoNome} numberOfLines={1}>
                        {item.servicos && item.servicos.length > 0
                            ? item.servicos.length > 1
                                ? `${item.servicos[0].nome} +${item.servicos.length - 1}`
                                : item.servicos[0].nome
                            : "Serviço"}
                    </Text>

                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {statusStyle.label.toUpperCase()}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                        {item.data} às {item.horario}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#666" />
                    <Text style={styles.infoText}>
                        Profissional: {item.colaboradorNome || "Profissional"}
                    </Text>
                </View>

                <View style={styles.footerCard}>
                    <Text style={styles.servicosLista} numberOfLines={1}>
                        {item.servicos?.map((s) => s.nome).join(", ") || "Serviço"}
                    </Text>

                    <View style={styles.priceTag}>
                        <Text style={styles.priceText}>R$ {total.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.tapHint}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
                    <Text style={styles.tapHintText}>Toque para ver os detalhes</Text>
                </View>

                {podeCancelar(item.status) && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => cancelarAgendamento(item)}
                    >
                        <Ionicons name="close-circle-outline" size={18} color="#FFF" />
                        <Text style={styles.cancelButtonText}>Cancelar Agendamento</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderFiltro = (filtro) => {
        const ativo = filtroStatus === filtro.key;

        return (
            <TouchableOpacity
                key={filtro.key}
                style={[styles.filtroChip, ativo && styles.filtroChipAtivo]}
                onPress={() => setFiltroStatus(filtro.key)}
            >
                <Text style={[styles.filtroChipText, ativo && styles.filtroChipTextAtivo]}>
                    {filtro.label} ({contagemPorStatus[filtro.key] || 0})
                </Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <ActivityIndicator
                style={{ flex: 1 }}
                size="large"
                color={colors.primary}
            />
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Meus Agendamentos</Text>
            <Text style={styles.subtitle}>
                {agendamentosFiltrados.length} agendamento(s) em {filtros.find(f => f.key === filtroStatus)?.label.toLowerCase()}
            </Text>

            <View style={styles.filtrosWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtrosContainer}
                >
                    {filtros.map(renderFiltro)}
                </ScrollView>
            </View>

            <FlatList
                data={agendamentosFiltrados}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        Nenhum agendamento encontrado neste filtro.
                    </Text>
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 20,
        paddingTop: 40,
    },

    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginBottom: 12,
    },

    filtrosWrapper: {
        marginBottom: 10,
    },

    filtrosContainer: {
        paddingRight: 10,
    },

    filtroChip: {
        backgroundColor: '#F1F3F5',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
    },

    filtroChipAtivo: {
        backgroundColor: colors.primary,
    },

    filtroChipText: {
        color: '#555',
        fontWeight: '600',
        fontSize: 13,
    },

    filtroChipTextAtivo: {
        color: '#FFF',
    },

    card: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 3,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },

    servicoNome: {
        fontSize: 17,
        fontWeight: 'bold',
        color: colors.primary,
        flex: 0.7,
    },

    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },

    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },

    infoText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },

    footerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    },

    servicosLista: {
        fontSize: 12,
        color: '#999',
        flex: 0.6,
    },

    priceTag: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },

    priceText: {
        color: '#27AE60',
        fontWeight: 'bold',
        fontSize: 15,
    },

    tapHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 10,
    },

    tapHintText: {
        marginLeft: 6,
        fontSize: 12,
        color: colors.secondary,
    },

    cancelButton: {
        marginTop: 8,
        backgroundColor: colors.danger || '#dc3545',
        borderRadius: 12,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    cancelButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },

    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
});