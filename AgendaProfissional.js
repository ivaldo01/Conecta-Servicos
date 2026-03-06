import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Vibration } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { collection, query, where, doc, updateDoc, onSnapshot, getDoc } from "firebase/firestore";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

async function enviarPushAoCliente(expoPushToken, status) {
    const titulo = status === 'confirmado' ? 'Agendamento Confirmado! ✅' : 'Agendamento Cancelado ❌';
    const corpo = status === 'confirmado'
        ? "Seu agendamento foi aceito. Nos vemos em breve!"
        : "O profissional não pôde aceitar seu pedido no momento.";

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: corpo,
        data: { screen: 'MeusAgendamentos' },
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
        console.log("Erro ao enviar push:", error);
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

            if (dados.some(item => item.vistoPeloPro === false)) {
                Vibration.vibrate(500);
            }

            setAgendamentos(ordenados);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const alterarStatus = async (item, novoStatus) => {
        try {
            await updateDoc(doc(db, "agendamentos", item.id), { status: novoStatus, vistoPeloPro: true });
            const clienteSnap = await getDoc(doc(db, "usuarios", item.clienteId));

            if (clienteSnap.exists() && clienteSnap.data().pushToken) {
                await enviarPushAoCliente(clienteSnap.data().pushToken, novoStatus);
            }
            Alert.alert("Sucesso", `Pedido ${novoStatus === 'confirmado' ? 'confirmado' : 'cancelado'}.`);
        } catch (e) {
            Alert.alert("Erro", "Falha ao atualizar status.");
        }
    };

    const imprimirOS = async (item) => {
        const listaServicosHtml = item.servicos?.map(s =>
            `<li>${s.nome} - R$ ${parseFloat(s.preco).toFixed(2)}</li>`
        ).join('') || `<li>${item.servicoNome} - R$ ${item.preco}</li>`;

        const valorTotal = item.servicos
            ? item.servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0).toFixed(2)
            : parseFloat(item.preco || 0).toFixed(2);

        const html = `<html><body style="padding:40px; font-family:sans-serif;">
            <h1 style="color:${colors.primary}">ORDEM DE SERVIÇO</h1>
            <p><strong>Cliente:</strong> ${item.clienteNome}</p>
            <p><strong>Data:</strong> ${item.data} às ${item.horario}</p>
            <hr/><h3>Serviços:</h3><ul>${listaServicosHtml}</ul>
            <h2>Total: R$ ${valorTotal}</h2>
        </body></html>`;

        try {
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (error) { Alert.alert("Erro", "Falha ao gerar PDF."); }
    };

    const renderCard = ({ item }) => {
        const totalCard = item.servicos
            ? item.servicos.reduce((acc, s) => acc + parseFloat(s.preco), 0)
            : parseFloat(item.preco || 0);

        const statusColors = {
            pendente: colors.warning || '#FFCC00',
            confirmado: colors.success || '#28a745',
            cancelado: colors.danger || '#dc3545'
        };

        const ehNovo = item.vistoPeloPro === false;

        return (
            <View style={[styles.card, ehNovo && styles.cardNovo]}>
                <View style={styles.cardHeader}>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clienteNome}>{item.clienteNome || "Cliente"}</Text>
                        <Text style={styles.servicoResumo}>
                            {item.servicos ? item.servicos.map(s => s.nome).join(', ') : item.servicoNome}
                        </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColors[item.status] + '20' }]}>
                        <Text style={[styles.badgeText, { color: statusColors[item.status] }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
                        <Text style={styles.detailText}>{item.data}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={16} color={colors.secondary} />
                        <Text style={styles.detailText}>{item.horario}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Ionicons name="cash-outline" size={16} color={colors.success} />
                        <Text style={[styles.detailText, { fontWeight: 'bold' }]}>R$ {totalCard.toFixed(2)}</Text>
                    </View>
                </View>

                <View style={styles.footerActions}>
                    {item.status === 'pendente' ? (
                        <>
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => alterarStatus(item, 'cancelado')}>
                                <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Recusar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnSolid} onPress={() => alterarStatus(item, 'confirmado')}>
                                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                                <Text style={styles.actionBtnTextSolid}>Aceitar</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.btnFullWidth} onPress={() => imprimirOS(item)}>
                            <Ionicons name="print-outline" size={20} color={colors.primary} />
                            <Text style={styles.btnFullWidthText}>Gerar Ordem de Serviço (PDF)</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Minha Agenda</Text>
                <Text style={styles.subtitle}>{agendamentos.length} solicitações no total</Text>
            </View>

            <FlatList
                data={agendamentos}
                keyExtractor={item => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ paddingBottom: 30 }}
                ListEmptyComponent={<View style={styles.empty}><Text>Nenhum pedido hoje.</Text></View>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background || '#F8F9FA' },
    header: { padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
    title: { fontSize: 26, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary, marginTop: 4 },
    card: { backgroundColor: '#FFF', marginHorizontal: 20, marginTop: 15, borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    cardNovo: { borderLeftWidth: 6, borderLeftColor: colors.primary },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    clientInfo: { flex: 1 },
    clienteNome: { fontSize: 18, fontWeight: 'bold', color: colors.textDark },
    servicoResumo: { fontSize: 13, color: colors.secondary, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0' },
    detailItem: { flexDirection: 'row', alignItems: 'center' },
    detailText: { fontSize: 13, marginLeft: 5, color: colors.textDark },
    footerActions: { flexDirection: 'row', marginTop: 15, justifyContent: 'space-between' },
    actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, marginRight: 8 },
    actionBtnSolid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.success },
    actionBtnText: { fontWeight: 'bold', marginLeft: 5 },
    actionBtnTextSolid: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
    btnFullWidth: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: colors.primary + '10', borderRadius: 12 },
    btnFullWidthText: { color: colors.primary, fontWeight: 'bold', marginLeft: 8 },
    empty: { alignItems: 'center', marginTop: 50 }
});