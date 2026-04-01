import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    collection,
    addDoc,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";

function getMensagemNota(nota) {
    switch (nota) {
        case 1:
            return 'Sentimos muito. Sua experiência foi ruim.';
        case 2:
            return 'Entendido. Vamos melhorar.';
        case 3:
            return 'Foi uma experiência mediana.';
        case 4:
            return 'Que bom. Ficamos felizes.';
        case 5:
            return 'Excelente. Obrigado pela confiança!';
        default:
            return 'Selecione uma nota de 1 a 5 estrelas.';
    }
}

export default function AvaliarAtendimento({ route, navigation }) {
    const { agendamento } = route.params || {};

    const [nota, setNota] = useState(0);
    const [comentario, setComentario] = useState('');
    const [loading, setLoading] = useState(false);

    const mensagemNota = useMemo(() => getMensagemNota(nota), [nota]);

    const selecionarNota = (valor) => {
        Keyboard.dismiss();
        setNota(valor);
    };

    const salvarNotificacaoAvaliacao = async () => {
        try {
            const profissionalId = agendamento?.colaboradorId || agendamento?.clinicaId;
            if (!profissionalId) return;

            await addDoc(collection(db, "usuarios", profissionalId, "notificacoes"), {
                tipo: "nova_avaliacao",
                titulo: "Nova avaliação recebida",
                mensagem: `Você recebeu uma avaliação ${nota}/5 de ${agendamento?.clienteNome || "Cliente"}.`,
                agendamentoId: agendamento?.id || null,
                clienteId: auth.currentUser?.uid || null,
                screen: "RelatoriosPro",
                params: {},
                createdAt: serverTimestamp(),
                lida: false,
            });
        } catch (error) {
            console.log("Erro ao salvar notificação de avaliação:", error);
        }
    };

    const salvarAvaliacao = async () => {
        Keyboard.dismiss();

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
            const profissionalId = agendamento.colaboradorId || agendamento.clinicaId;
            const avaliacaoRef = doc(db, "usuarios", profissionalId, "avaliacoes", agendamento.id);
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

            await salvarNotificacaoAvaliacao();

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
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name={preenchida ? "star" : "star-outline"}
                        size={38}
                        color={preenchida ? "#FFC107" : "#BBB"}
                    />
                </TouchableOpacity>
            );
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    navigation.goBack();
                                }}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                            </TouchableOpacity>

                            <View style={styles.headerTextArea}>
                                <Text style={styles.title}>Avaliar Atendimento</Text>
                                <Text style={styles.subtitle}>
                                    Conte como foi sua experiência
                                </Text>
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.label}>PROFISSIONAL</Text>
                            <Text style={styles.value}>
                                {agendamento?.colaboradorNome || "Profissional"}
                            </Text>

                            <Text style={[styles.label, styles.spacedLabel]}>DATA DO ATENDIMENTO</Text>
                            <Text style={styles.value}>
                                {agendamento?.data} às {agendamento?.horario}
                            </Text>

                            <Text style={[styles.label, styles.spacedLabel]}>SUA NOTA</Text>
                            <View style={styles.starsRow}>
                                {renderEstrelas()}
                            </View>

                            <View style={styles.ratingMessageBox}>
                                <Text style={styles.ratingMessageText}>{mensagemNota}</Text>
                            </View>

                            <Text style={[styles.label, styles.spacedLabel]}>COMENTÁRIO</Text>
                            <TextInput
                                style={styles.input}
                                multiline
                                numberOfLines={5}
                                placeholder="Escreva como foi seu atendimento..."
                                placeholderTextColor="#999"
                                value={comentario}
                                onChangeText={setComentario}
                                textAlignVertical="top"
                                returnKeyType="done"
                                onSubmitEditing={salvarAvaliacao}
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, loading && styles.disabledButton]}
                                onPress={salvarAvaliacao}
                                disabled={loading}
                                activeOpacity={0.9}
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
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },

    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
    },

    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        elevation: 2,
    },

    headerTextArea: {
        flex: 1,
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.textDark,
    },

    subtitle: {
        fontSize: 14,
        color: colors.secondary,
        marginTop: 4,
    },

    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 20,
        borderRadius: 18,
        elevation: 2,
    },

    label: {
        fontSize: 11,
        color: '#999',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 6,
    },

    spacedLabel: {
        marginTop: 18,
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

    ratingMessageBox: {
        marginTop: 12,
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 12,
    },

    ratingMessageText: {
        fontSize: 13,
        color: '#8A6D3B',
        fontWeight: '600',
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
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    disabledButton: {
        opacity: 0.7,
    },

    saveButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 8,
    },
});