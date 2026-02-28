import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function DetalhesAgendamento({ route, navigation }) {
    const { agendamento } = route.params || {};

    const abrirWhatsApp = () => {
        const tel = agendamento?.clienteWhatsapp?.replace(/\D/g, "");
        Linking.openURL(`https://wa.me/55${tel}`);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Detalhes do Pedido</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>CLIENTE</Text>
                <Text style={styles.value}>{agendamento?.clienteNome}</Text>

                {agendamento?.menorIdade && (
                    <View style={styles.boxMenor}>
                        <Text style={styles.labelMenor}>MENOR DE IDADE</Text>
                        <Text>Responsável: {agendamento?.nomeResponsavel}</Text>
                    </View>
                )}

                <Text style={[styles.label, { marginTop: 15 }]}>CONTATO</Text>
                <TouchableOpacity onPress={abrirWhatsApp}>
                    <Text style={styles.link}>{agendamento?.clienteWhatsapp} (Chamar no Zap)</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 15 }]}>ENDEREÇO DE ATENDIMENTO</Text>
                <Text style={styles.value}>{agendamento?.enderecoCliente || "Não informado"}</Text>
            </View>

            <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
                <Text style={styles.btnTxt}>VOLTAR</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { padding: 40, backgroundColor: '#FFF', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'bold' },
    card: { backgroundColor: '#FFF', margin: 20, padding: 20, borderRadius: 15, elevation: 2 },
    label: { fontSize: 12, color: '#999', fontWeight: 'bold' },
    value: { fontSize: 16, color: '#333', marginBottom: 10 },
    link: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
    boxMenor: { backgroundColor: '#FFF3F3', padding: 10, borderRadius: 8, marginTop: 5 },
    labelMenor: { color: 'red', fontWeight: 'bold', fontSize: 12 },
    btn: { margin: 20, padding: 15, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.primary },
    btnTxt: { color: colors.primary, fontWeight: 'bold' }
});