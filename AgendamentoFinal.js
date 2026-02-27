import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from './colors';

// Removemos o 'export default' daqui
function AgendamentoFinal({ route }) {
    const { profissionalId, agenda } = route.params || {};

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Finalizar Agendamento</Text>
            <Text>ID do Profissional: {profissionalId}</Text>
            <Text>Duração: {agenda?.duracaoAtendimento} min</Text>
            <View style={styles.card}>
                <Text style={{ color: '#666' }}>Aqui vamos listar os horários disponíveis...</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    card: { padding: 20, backgroundColor: '#f9f9f9', borderRadius: 10, marginTop: 20 }
});

// Mantemos apenas este aqui embaixo
export default AgendamentoFinal;