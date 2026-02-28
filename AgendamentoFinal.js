import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, addDoc, collection, getDocs } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

export default function AgendamentoFinal({ route, navigation }) {
    const { clinicaId, servico, colaborador } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [perfilCliente, setPerfilCliente] = useState(null);

    // ESTADOS PARA DATA E HORA
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [horarioSelecionado, setHorarioSelecionado] = useState(null);

    // Exemplo de horários (Isso pode vir do banco futuramente)
    const horariosDisponiveis = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

    const user = auth.currentUser;

    useEffect(() => {
        if (user) carregarPerfilCliente();
    }, []);

    const carregarPerfilCliente = async () => {
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (docSnap.exists()) setPerfilCliente(docSnap.data());
    };

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowPicker(Platform.OS === 'ios'); // No iOS o picker fica aberto
        setDate(currentDate);
    };

    const finalizarAgendamento = async () => {
        if (!horarioSelecionado) {
            return Alert.alert("Atenção", "Por favor, selecione um horário para o atendimento.");
        }

        setLoading(true);
        try {
            await addDoc(collection(db, "agendamentos"), {
                clinicaId,
                servicoNome: servico.nome,
                preco: servico.preco,
                colaboradorId: colaborador.id,
                colaboradorNome: colaborador.nome,
                clienteId: user.uid,
                clienteNome: perfilCliente.nome || "Não informado",
                clienteWhatsapp: perfilCliente.whatsapp || "Sem contato",
                enderecoCliente: perfilCliente.enderecoResidencial || "Não informado",

                // DATA FORMATADA PARA O BANCO
                data: date.toLocaleDateString('pt-BR'),
                horario: horarioSelecionado,

                status: "pendente",
                dataCriacao: new Date()
            });

            Alert.alert("Sucesso!", "Agendamento realizado!", [
                { text: "OK", onPress: () => navigation.navigate("Main") }
            ]);
        } catch (error) {
            Alert.alert("Erro", "Falha ao salvar.");
        } finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Resumo do Serviço</Text>
                <Text style={styles.label}>Serviço: <Text style={styles.val}>{servico?.nome}</Text></Text>
                <Text style={styles.label}>Profissional: <Text style={styles.val}>{colaborador?.nome}</Text></Text>
            </View>

            {/* SELETOR DE DATA */}
            <Text style={styles.sectionTitle}>1. Escolha a Data</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    minimumDate={new Date()} // Impede agendar no passado
                    onChange={onChangeDate}
                />
            )}

            {/* SELETOR DE HORÁRIO */}
            <Text style={styles.sectionTitle}>2. Escolha o Horário</Text>
            <View style={styles.horariosContainer}>
                {horariosDisponiveis.map((h) => (
                    <TouchableOpacity
                        key={h}
                        style={[styles.horaBadge, horarioSelecionado === h && styles.horaSelected]}
                        onPress={() => setHorarioSelecionado(h)}
                    >
                        <Text style={[styles.horaText, horarioSelecionado === h && styles.horaTextSelected]}>{h}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? <ActivityIndicator size="large" color={colors.primary} /> : (
                <TouchableOpacity style={styles.btnConfirmar} onPress={finalizarAgendamento}>
                    <Text style={styles.btnText}>FINALIZAR AGENDAMENTO</Text>
                </TouchableOpacity>
            )}
            <View style={{ height: 50 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
    card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, elevation: 3 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.primary },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
    label: { fontSize: 14, color: '#666', marginBottom: 5 },
    val: { fontWeight: 'bold', color: '#333' },

    dateButton: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD'
    },
    dateText: { marginLeft: 10, fontSize: 16, fontWeight: '500' },

    horariosContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    horaBadge: {
        backgroundColor: '#FFF',
        width: '23%',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#DDD'
    },
    horaSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    horaText: { fontWeight: 'bold', color: '#666' },
    horaTextSelected: { color: '#FFF' },

    btnConfirmar: { backgroundColor: colors.primary, padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});