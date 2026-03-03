import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { db } from "./firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function DetalhesAgendamento({ route, navigation }) {
    const { agendamento } = route.params || {};
    const [loadingAcao, setLoadingAcao] = useState(false);

    const abrirWhatsApp = () => {
        const tel = agendamento?.clienteWhatsapp?.replace(/\D/g, "");
        if (!tel || tel === "") {
            Alert.alert("Erro", "Número de contato não disponível.");
            return;
        }
        Linking.openURL(`https://wa.me/55${tel}`);
    };

    // Função para atualizar o status (Aceitar/Recusar)
    const atualizarStatus = async (novoStatus) => {
        setLoadingAcao(true);
        try {
            const docRef = doc(db, "agendamentos", agendamento.id);
            await updateDoc(docRef, { status: novoStatus });
            Alert.alert("Sucesso", `O agendamento foi ${novoStatus === 'confirmado' ? 'aceito' : 'cancelado'}.`);
            navigation.goBack();
        } catch (error) {
            console.log(error);
            Alert.alert("Erro", "Não foi possível atualizar o status.");
        } finally {
            setLoadingAcao(false);
        }
    };

    // Calcula o total dos serviços
    const totalAgendamento = agendamento?.servicos?.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0) || 0;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Detalhes do Pedido</Text>
                <View style={[styles.statusBadge, { backgroundColor: agendamento?.status === 'pendente' ? '#E67E22' : '#27AE60' }]}>
                    <Text style={styles.statusText}>{agendamento?.status?.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>CLIENTE</Text>
                <Text style={styles.value}>{agendamento?.clienteNome || "Nome não disponível"}</Text>

                <Text style={[styles.label, { marginTop: 15 }]}>SERVIÇOS CONTRATADOS</Text>
                {agendamento?.servicos && agendamento.servicos.length > 0 ? (
                    agendamento.servicos.map((s, index) => (
                        <View key={index} style={styles.itemServico}>
                            <Text style={styles.servicoNome}>• {s.nome}</Text>
                            <Text style={styles.servicoPreco}>R$ {parseFloat(s.preco).toFixed(2)}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.value}>Nenhum serviço listado</Text>
                )}

                <View style={styles.linhaTotal}>
                    <Text style={styles.labelTotal}>VALOR TOTAL</Text>
                    <Text style={styles.valorTotal}>R$ {totalAgendamento.toFixed(2)}</Text>
                </View>

                <Text style={[styles.label, { marginTop: 15 }]}>DATA E HORÁRIO</Text>
                <Text style={styles.value}>{agendamento?.data} às {agendamento?.horario}</Text>

                <Text style={[styles.label, { marginTop: 15 }]}>PROFISSIONAL</Text>
                <Text style={styles.value}>{agendamento?.colaboradorNome}</Text>

                <Text style={[styles.label, { marginTop: 15 }]}>CONTATO</Text>
                <TouchableOpacity onPress={abrirWhatsApp} style={styles.zapRow}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                    <Text style={styles.link}> {agendamento?.clienteWhatsapp || "Sem número"} (Chamar)</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 15 }]}>ENDEREÇO DE ATENDIMENTO</Text>
                <Text style={styles.value}>{agendamento?.enderecoCliente || "Não informado"}</Text>
            </View>

            {/* Ações de Aceitar/Recusar - Só aparecem se estiver pendente */}
            {agendamento?.status === 'pendente' && (
                <View style={styles.areaAcoes}>
                    {loadingAcao ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <>
                            <TouchableOpacity
                                style={[styles.btnAcao, { backgroundColor: '#E74C3C' }]}
                                onPress={() => atualizarStatus('cancelado')}
                            >
                                <Text style={styles.btnText}>RECUSAR</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btnAcao, { backgroundColor: '#27AE60' }]}
                                onPress={() => atualizarStatus('confirmado')}
                            >
                                <Text style={styles.btnText}>ACEITAR</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
                <Text style={styles.btnVoltarTxt}>VOLTAR</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 30, backgroundColor: '#FFF', alignItems: 'center', borderBottomWidth: 1, borderColor: '#EEE' },
    title: { fontSize: 20, fontWeight: 'bold' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, marginTop: 8 },
    statusText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
    card: { backgroundColor: '#FFF', margin: 20, padding: 20, borderRadius: 15, elevation: 2 },
    label: { fontSize: 11, color: '#999', fontWeight: 'bold', letterSpacing: 1 },
    value: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: '500' },
    itemServico: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    servicoNome: { fontSize: 14, color: '#444' },
    servicoPreco: { fontSize: 14, fontWeight: 'bold' },
    linhaTotal: { borderTopWidth: 1, borderColor: '#EEE', marginTop: 10, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
    labelTotal: { fontWeight: 'bold', color: '#333' },
    valorTotal: { fontWeight: 'bold', color: colors.primary, fontSize: 18 },
    zapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#F0FFF4', padding: 10, borderRadius: 8 },
    link: { fontSize: 16, color: '#25D366', fontWeight: 'bold' },
    areaAcoes: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 10 },
    btnAcao: { flex: 0.48, padding: 15, borderRadius: 10, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    btnVoltar: { margin: 20, padding: 15, alignItems: 'center' },
    btnVoltarTxt: { color: '#999', fontWeight: 'bold' }
});