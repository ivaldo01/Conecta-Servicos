import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { auth, db } from "./firebaseConfig";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function AvaliarAtendimento({ route, navigation }) {
    const { agendamento } = route.params || {};

    const [nota, setNota] = useState(0);
    const [comentario, setComentario] = useState('');
    const [loading, setLoading] = useState(false);

    const selecionarNota = (valor) => {
        setNota(valor);
    };

    const salvarAvaliacao = async () => {
        if (!agendamento?.id) {
            Alert.alert("Erro", "Agendamento inválido.");
            return;
        }

        if (nota < 1 || nota > 5) {
            Alert.alert("Atenção", "Selecione uma nota de 1 a 5 estrelas.");
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Erro", "Usuário não autenticado.");
            return;
        }

        setLoading(true);

        try {
            const avaliacaoRef = doc(db, "avaliacoes", agendamento.id);
            const avaliacaoSnap = await getDoc(avaliacaoRef);

            if (avaliacaoSnap.exists()) {
                Alert.alert("Aviso", "Este atendimento já foi avaliado.");
                navigation.goBack();
                return;
            }

            await setDoc(avaliacaoRef, {
                agendamentoId: agendamento.id,
                clienteId: user.uid,
                clienteNome: agendamento.clienteNome || "Cliente",
                profissionalId: agendamento.colaboradorId || agendamento.clinicaId,
                profissionalNome: agendamento.colaboradorNome || "Profissional",
                clinicaId: agendamento.clinicaId || null,
                nota,
                comentario: comentario.trim(),
                createdAt: serverTimestamp(),
            });

            Alert.alert("Sucesso", "Avaliação enviada com sucesso!");
            navigation.goBack();
        } catch (error) {
            console.log("Erro ao salvar avaliação:", error);
            Alert.alert("Erro", "Não foi possível enviar a avaliação.");
        } finally {
            setLoading(false);
        }
    };

    const renderEstrelas = () => {
        return [1, 2, 3, 4, 5].map((valor) => {
            const preenchida = valor <= nota;

            return (
                <TouchableOpacity
                    key={valor}
                    onPress={() => selecionarNota(valor)}
                    style={styles.starButton}
                >
                    <Ionicons
                        name={preenchida ? "star" : "star-outline"}
                        size={36}
                        color={preenchida ? "#FFC107" : "#BBB"}
                    />
                </TouchableOpacity>
            );
        });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Avaliar Atendimento</Text>
                <Text style={styles.subtitle}>
                    Conte como foi sua experiência
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>PROFISSIONAL</Text>
                <Text style={styles.value}>
                    {agendamento?.colaboradorNome || "Profissional"}
                </Text>

                <Text style={[styles.label, { marginTop: 20 }]}>DATA DO ATENDIMENTO</Text>
                <Text style={styles.value}>
                    {agendamento?.data} às {agendamento?.horario}
                </Text>

                <Text style={[styles.label, { marginTop: 20 }]}>SUA NOTA</Text>
                <View style={styles.starsRow}>
                    {renderEstrelas()}
                </View>

                <Text style={[styles.label, { marginTop: 20 }]}>COMENTÁRIO</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    numberOfLines={5}
                    placeholder="Escreva como foi seu atendimento..."
                    placeholderTextColor="#999"
                    value={comentario}
                    onChangeText={setComentario}
                />

                <TouchableOpacity
                    style={[styles.saveButton, loading && { opacity: 0.7 }]}
                    onPress={salvarAvaliacao}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="send-outline" size={20} color="#FFF" />
                            <Text style={styles.saveButtonText}>ENVIAR AVALIAÇÃO</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    header: {
        padding: 25,
        paddingTop: 60,
        backgroundColor: '#FFF',
    },

    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    card: {
        backgroundColor: '#FFF',
        margin: 20,
        padding: 20,
        borderRadius: 18,
        elevation: 3,
    },

    label: {
        fontSize: 11,
        color: '#999',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 6,
    },

    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },

    starsRow: {
        flexDirection: 'row',
        marginTop: 8,
    },

    starButton: {
        marginRight: 8,
    },

    input: {
        backgroundColor: '#F7F7F7',
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: '#333',
        textAlignVertical: 'top',
        minHeight: 120,
        marginTop: 8,
    },

    saveButton: {
        marginTop: 24,
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },
});