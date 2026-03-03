import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Vibration } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, doc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

// --- FUNÇÃO PARA NOTIFICAR O CLIENTE VIA PUSH EXTERNO ---
async function enviarPushAoCliente(expoPushToken, status) {
    const titulo = status === 'confirmado' ? 'Agendamento Confirmado! ✅' : 'Agendamento Cancelado ❌';
    const corpo = status === 'confirmado'
        ? "Seu agendamento foi aceito pelo profissional. Nos vemos em breve!"
        : "Lamentamos, mas o profissional não pôde aceitar seu pedido no momento.";

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: corpo,
        data: { screen: 'MeusAgendamentos' }, // Nome da tela do cliente
    };

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
    } catch (error) {
        console.log("Erro ao enviar push ao cliente:", error);
    }
}

export default function AgendaProfissional({ navigation }) {
    const [agendamentos, setAgendamentos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "agendamentos"),
            where("clinicaId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            const ordenados = dados.sort((a, b) => {
                const dataA = a.dataCriacao?.seconds || 0;
                const dataB = b.dataCriacao?.seconds || 0;
                return dataB - dataA;
            });

            const temNovo = dados.some(item => item.vistoPeloPro === false);
            if (temNovo) {
                Vibration.vibrate(500);
            }

            setAgendamentos(ordenados);
            setLoading(false);
        }, (error) => {
            if (error.code !== 'permission-denied') {
                console.error("Erro no Firestore:", error);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const marcarComoVisto = async (item) => {
        if (item.vistoPeloPro === false) {
            try {
                await updateDoc(doc(db, "agendamentos", item.id), { vistoPeloPro: true });
            } catch (e) {
                console.log("Erro ao atualizar visto:", e);
            }
        }
        navigation.navigate("DetalhesAgendamentoPro", { agendamento: item });
    };

    // ATUALIZADO: Agora recebe o item completo para pegar o clienteId
    const alterarStatus = async (item, novoStatus) => {
        try {
            // 1. Atualiza o banco
            await updateDoc(doc(db, "agendamentos", item.id), { status: novoStatus });

            // 2. Busca o token do cliente para enviar notificação externa
            const clienteRef = doc(db, "usuarios", item.clienteId);
            const clienteSnap = await getDoc(clienteRef);

            if (clienteSnap.exists()) {
                const clienteDados = clienteSnap.data();
                if (clienteDados.pushToken) {
                    await enviarPushAoCliente(clienteDados.pushToken, novoStatus);
                }
            }

            Alert.alert("Sucesso", `Agendamento ${novoStatus === 'confirmado' ? 'aceito' : 'cancelado'}!`);
        } catch (e) {
            Alert.alert("Erro", "Não foi possível atualizar o status.");
        }
    };

    const imprimirOS = async (item) => {
        const listaServicosHtml = item.servicos?.map(s =>
            `<li>${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}</li>`
        ).join('') || `<li>${item.servicoNome} - R$ ${item.preco}</li>`;

        const valorTotal = item.servicos
            ? item.servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0).toFixed(2)
            : parseFloat(item.preco || 0).toFixed(2);

        const html = `
            <html>
                <body style="font-family: sans-serif; padding: 20px;">
                    <h1 style="text-align: center; color: ${colors.primary};">ORDEM DE SERVIÇO</h1>
                    <hr/>
                    <p><strong>Nº do Pedido:</strong> ${item.id}</p>
                    <p><strong>Cliente:</strong> ${item.clienteNome || 'Não informado'}</p>
                    <hr/>
                    <h3>Serviços Realizados</h3>
                    <ul>${listaServicosHtml}</ul>
                    <p style="font-size: 18px;"><strong>Total: R$ ${valorTotal}</strong></p>
                    <hr/>
                </body>
            </html>
        `;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (error) {
            Alert.alert("Erro", "Falha ao gerar arquivo.");
        }
    };

    const renderCard = ({ item }) => {
        const totalCard = item.servicos
            ? item.servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0)
            : parseFloat(item.preco || 0);

        const ehNovo = item.vistoPeloPro === false;

        return (
            <View style={[styles.card, ehNovo && styles.cardNovoPedido]}>
                <TouchableOpacity onPress={() => marcarComoVisto(item)}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.clienteNome}>{item.clienteNome || "Cliente Particular"}</Text>
                            {ehNovo && (
                                <View style={styles.badgeNovo}>
                                    <Ionicons name="flash" size={12} color="#FFF" />
                                    <Text style={styles.badgeText}> NOVO PEDIDO</Text>
                                </View>
                            )}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: item.status === 'pendente' ? '#FFCC00' : (item.status === 'confirmado' ? '#28a745' : '#dc3545') }]}>
                            <Text style={styles.statusText}>{item.status?.toUpperCase()}</Text>
                        </View>
                    </View>

                    <Text style={styles.info} numberOfLines={1}>
                        <Ionicons name="cut" size={14} /> {item.servicos ? item.servicos.map(s => s.nome).join(', ') : item.servicoNome}
                    </Text>

                    <Text style={styles.info}><Ionicons name="calendar" size={14} /> {item.data} às {item.horario}</Text>
                    <Text style={[styles.info, { fontWeight: 'bold', color: '#333' }]}>
                        <Ionicons name="cash" size={14} /> Total: R$ {totalCard.toFixed(2)}
                    </Text>

                    <Text style={styles.clickHint}>Clique para ver detalhes</Text>
                </TouchableOpacity>

                <View style={styles.actions}>
                    {item.status === 'pendente' && (
                        <>
                            <TouchableOpacity style={styles.btnAceitar} onPress={() => alterarStatus(item, 'confirmado')}>
                                <Text style={styles.btnText}>Aceitar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnRecusar} onPress={() => alterarStatus(item, 'cancelado')}>
                                <Text style={styles.btnText}>Recusar</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {item.status === 'confirmado' && (
                        <TouchableOpacity style={styles.btnImprimir} onPress={() => imprimirOS(item)}>
                            <Ionicons name="print" size={18} color="#FFF" />
                            <Text style={styles.btnText}> Imprimir OS</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gerenciar Pedidos</Text>
            <FlatList
                data={agendamentos}
                keyExtractor={item => item.id}
                renderItem={renderCard}
                ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento encontrado.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 30 },
    card: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3 },
    cardNovoPedido: {
        borderLeftWidth: 8,
        borderLeftColor: '#E74C3C',
        backgroundColor: '#FFF5F5',
        shadowColor: "#E74C3C",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    badgeNovo: { backgroundColor: '#E74C3C', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 5, marginBottom: 5 },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    clienteNome: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, alignSelf: 'flex-start' },
    statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    info: { fontSize: 14, color: '#666', marginBottom: 5 },
    actions: { flexDirection: 'row', marginTop: 15, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 },
    btnAceitar: { backgroundColor: '#28a745', padding: 10, borderRadius: 8, flex: 1, marginRight: 5, alignItems: 'center' },
    btnRecusar: { backgroundColor: '#dc3545', padding: 10, borderRadius: 8, flex: 1, marginLeft: 5, alignItems: 'center' },
    btnImprimir: { backgroundColor: colors.primary || '#000', padding: 12, borderRadius: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 50, color: '#999' },
    clickHint: { fontSize: 10, color: colors.primary, textAlign: 'right', fontStyle: 'italic', marginTop: 5 }
});