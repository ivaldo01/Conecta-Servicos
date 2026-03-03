import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { db } from "./firebaseConfig";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function AvaliarServico({ route, navigation }) {
    const { agendamento } = route.params;
    const [nota, setNota] = useState(0);
    const [comentario, setComentario] = useState('');
    const [enviando, setEnviando] = useState(false);

    const enviarAvaliacao = async () => {
        if (nota === 0) return Alert.alert("Ops", "Por favor, escolha uma nota de 1 a 5 estrelas.");
        setEnviando(true);
        try {
            await addDoc(collection(db, "avaliacoes"), {
                agendamentoId: agendamento.id,
                clinicaId: agendamento.clinicaId,
                colaboradorId: agendamento.colaboradorId,
                clienteNome: agendamento.clienteNome,
                nota,
                comentario,
                data: new Date()
            });
            await updateDoc(doc(db, "agendamentos", agendamento.id), { avaliado: true });
            Alert.alert("Obrigado!", "Sua avaliação ajuda muito!");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Erro", "Falha ao enviar avaliação.");
        } finally { setEnviando(false); }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Avalie o atendimento de {agendamento.colaboradorNome}</Text>
            <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setNota(s)}>
                        <Ionicons name={nota >= s ? "star" : "star-outline"} size={45} color={nota >= s ? "#FFD700" : "#CCC"} />
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput style={styles.input} placeholder="Comentário opcional" multiline value={comentario} onChangeText={setComentario} />
            <TouchableOpacity style={styles.btnEnviar} onPress={enviarAvaliacao} disabled={enviando}>
                {enviando ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>ENVIAR</Text>}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF', padding: 25, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
    starsRow: { flexDirection: 'row', marginBottom: 30 },
    input: { width: '100%', borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 15, height: 100, backgroundColor: '#F9F9F9' },
    btnEnviar: { backgroundColor: colors.primary, width: '100%', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: 'bold' }
});