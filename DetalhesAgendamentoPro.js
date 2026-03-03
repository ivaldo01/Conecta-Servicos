import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function DetalhesAgendamentoPro({ route, navigation }) {
    // Recebe os dados do agendamento enviados pela tela AgendaProfissional
    const { agendamento } = route.params;

    // Função para abrir o WhatsApp do cliente
    const abrirWhatsapp = () => {
        if (!agendamento.clienteWhatsapp) {
            Alert.alert("Aviso", "Este cliente não possui WhatsApp cadastrado.");
            return;
        }
        // Remove caracteres não numéricos
        const tel = agendamento.clienteWhatsapp.replace(/\D/g, '');
        const url = `https://wa.me/55${tel}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
            }
        });
    };

    // Calcula o valor total dos serviços
    const valorTotal = agendamento.servicos
        ? agendamento.servicos.reduce((acc, s) => acc + parseFloat(s.preco || 0), 0)
        : parseFloat(agendamento.preco || 0);

    return (
        <ScrollView style={styles.container}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Detalhes do Pedido</Text>
            </View>

            {/* Card do Cliente */}
            <View style={styles.card}>
                <Text style={styles.label}>CLIENTE</Text>
                <Text style={styles.clienteNome}>{agendamento.clienteNome || "Cliente Particular"}</Text>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.whatsappBtn} onPress={abrirWhatsapp}>
                    <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                    <Text style={styles.whatsappBtnText}>Chamar no WhatsApp</Text>
                </TouchableOpacity>
            </View>

            {/* Card de Data e Hora */}
            <View style={styles.card}>
                <Text style={styles.label}>AGENDADO PARA</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>{agendamento.data}</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={styles.infoText}>{agendamento.horario}</Text>
                </View>
            </View>

            {/* Card de Serviços */}
            <View style={styles.card}>
                <Text style={styles.label}>SERVIÇOS E VALORES</Text>
                {agendamento.servicos ? (
                    agendamento.servicos.map((item, index) => (
                        <View key={index} style={styles.servicoItem}>
                            <Text style={styles.servicoNome}>{item.nome}</Text>
                            <Text style={styles.servicoPreco}>R$ {parseFloat(item.preco).toFixed(2)}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.servicoItem}>
                        <Text style={styles.servicoNome}>{agendamento.servicoNome}</Text>
                        <Text style={styles.servicoPreco}>R$ {parseFloat(agendamento.preco || 0).toFixed(2)}</Text>
                    </View>
                )}

                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>TOTAL A RECEBER</Text>
                    <Text style={styles.totalValor}>R$ {valorTotal.toFixed(2)}</Text>
                </View>
            </View>

            {/* Card de Localização */}
            <View style={styles.card}>
                <Text style={styles.label}>LOCAL DO ATENDIMENTO</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="location" size={20} color="#E74C3C" />
                    <Text style={styles.enderecoText}>
                        {agendamento.clienteEndereco || "Endereço não disponível"}
                    </Text>
                </View>
            </View>

            {/* Status Atual */}
            <View style={[styles.statusBanner, { backgroundColor: agendamento.status === 'confirmado' ? '#27AE60' : '#E67E22' }]}>
                <Text style={styles.statusBannerText}>STATUS: {agendamento.status?.toUpperCase()}</Text>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 20, paddingTop: 50, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', elevation: 2 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 15, color: '#333' },
    card: { backgroundColor: '#FFF', padding: 20, marginHorizontal: 20, marginTop: 15, borderRadius: 15, elevation: 2 },
    label: { fontSize: 11, color: '#AAA', fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
    clienteNome: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
    whatsappBtn: { backgroundColor: '#25D366', flexDirection: 'row', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    whatsappBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 10 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    infoText: { fontSize: 16, marginLeft: 10, color: '#444', fontWeight: '500' },
    servicoItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    servicoNome: { fontSize: 15, color: '#666' },
    servicoPreco: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    totalContainer: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EEE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontWeight: 'bold', color: '#333', fontSize: 12 },
    totalValor: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
    enderecoText: { fontSize: 14, color: '#666', marginLeft: 10, flex: 1, lineHeight: 20 },
    statusBanner: { margin: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
    statusBannerText: { color: '#FFF', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }
});