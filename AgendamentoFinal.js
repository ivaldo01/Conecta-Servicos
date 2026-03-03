import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, getDocs, addDoc, collection, serverTimestamp } from "firebase/firestore"; // Adicionado serverTimestamp
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

// --- FUNÇÃO PARA ENVIAR A NOTIFICAÇÃO EXTERNA ---
async function enviarPushNotificacao(expoPushToken, clienteNome, data, horario) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: '🚀 Novo Agendamento!',
        body: `${clienteNome} agendou para o dia ${data} às ${horario}`,
        data: { screen: 'AgendaProfissional' },
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

export default function AgendamentoFinal({ route, navigation }) {
    const { clinicaId, servicos } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [horarioSelecionado, setHorarioSelecionado] = useState(null);
    const [colaboradorEscolhido, setColaboradorEscolhido] = useState(null);
    const [perfilCliente, setPerfilCliente] = useState(null);

    const [equipe, setEquipe] = useState([]);
    const [agendaClinica, setAgendaClinica] = useState({ horarios: [], dias: [] });

    useEffect(() => {
        carregarDadosIniciais();
        carregarPerfilCliente();
    }, []);

    const carregarPerfilCliente = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const docSnap = await getDoc(doc(db, "usuarios", user.uid));
                if (docSnap.exists()) {
                    setPerfilCliente(docSnap.data());
                }
            }
        } catch (e) { console.log("Erro ao carregar perfil:", e); }
    };

    const carregarDadosIniciais = async () => {
        try {
            const clinicaRef = doc(db, "usuarios", clinicaId, "configuracoes", "agenda");
            const snapC = await getDoc(clinicaRef);
            if (snapC.exists()) setAgendaClinica(snapC.data());

            const colabSnap = await getDocs(collection(db, "usuarios", clinicaId, "colaboradores"));
            const listaColabs = [];

            for (const d of colabSnap.docs) {
                const dados = d.data();
                const agendaRef = doc(db, "usuarios", clinicaId, "colaboradores", d.id, "configuracoes", "agenda");
                const aSnap = await getDoc(agendaRef);
                listaColabs.push({
                    id: d.id,
                    ...dados,
                    agenda: aSnap.exists() ? aSnap.data() : null
                });
            }
            setEquipe(listaColabs);
        } catch (e) { console.log(e); }
    };

    const verificarDisponibilidade = (colab) => {
        if (!horarioSelecionado) return { ok: false, msg: "Escolha um horário" };
        const diaSemana = date.getDay();
        const agenda = colab.agenda || agendaClinica;
        const trabalhaDia = agenda.dias?.includes(diaSemana);
        const trabalhaHora = agenda.horarios?.includes(horarioSelecionado);
        const fazServicos = servicos.every(s => colab.servicosHabilitados?.includes(s.id));

        if (trabalhaDia && trabalhaHora && fazServicos) return { ok: true };
        if (!fazServicos) return { ok: false, msg: "Não faz estes serviços" };
        return { ok: false, msg: "Fora de escala" };
    };

    const finalizar = async () => {
        if (!colaboradorEscolhido) return Alert.alert("Atenção", "Selecione um profissional disponível.");
        setLoading(true);
        try {
            const dataFormatada = date.toLocaleDateString('pt-BR');
            const nomeCliente = perfilCliente?.nome || "Cliente Particular";

            // 1. SALVAR NO FIRESTORE
            await addDoc(collection(db, "agendamentos"), {
                clinicaId,
                servicos: servicos.map(s => ({ id: s.id, nome: s.nome, preco: s.preco })),
                colaboradorId: colaboradorEscolhido.id,
                colaboradorNome: colaboradorEscolhido.nome,
                clienteId: auth.currentUser.uid,
                clienteNome: nomeCliente,
                clienteWhatsapp: perfilCliente?.whatsapp || "Não informado",
                enderecoCliente: perfilCliente?.enderecoResidencial || perfilCliente?.endereco || "Não informado",
                data: dataFormatada,
                horario: horarioSelecionado,
                status: "pendente",
                notificado: false,
                vistoPeloPro: false,
                avaliado: false,
                dataCriacao: serverTimestamp() // Usando o tempo do servidor
            });

            // 2. BUSCAR TOKEN DO PROFISSIONAL PARA NOTIFICAÇÃO EXTERNA
            const proRef = doc(db, "usuarios", clinicaId);
            const proSnap = await getDoc(proRef);

            if (proSnap.exists()) {
                const proDados = proSnap.data();
                if (proDados.pushToken) {
                    // DISPARA O ALERTA PARA O CELULAR DELE
                    await enviarPushNotificacao(
                        proDados.pushToken,
                        nomeCliente,
                        dataFormatada,
                        horarioSelecionado
                    );
                }
            }

            Alert.alert("Sucesso!", "Agendamento enviado e profissional notificado!");
            navigation.navigate("Main");

        } catch (e) {
            console.log(e);
            Alert.alert("Erro", "Falha ao agendar");
        } finally {
            setLoading(false);
        }
    };

    // ... O restante do seu código (return e styles) permanece o mesmo
    return (
        <ScrollView style={styles.container}>
            <Text style={styles.sectionTitle}>1. Quando deseja ser atendido?</Text>
            <View style={styles.row}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker(true)}>
                    <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR')}</Text>
                </TouchableOpacity>
            </View>

            {showPicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(e, d) => { setShowPicker(false); setDate(d || date); setHorarioSelecionado(null); }}
                />
            )}

            <View style={styles.horariosGrid}>
                {agendaClinica.horarios.map(h => (
                    <TouchableOpacity
                        key={h}
                        style={[styles.horaItem, horarioSelecionado === h && styles.horaSelected]}
                        onPress={() => { setHorarioSelecionado(h); setColaboradorEscolhido(null); }}
                    >
                        <Text style={{ color: horarioSelecionado === h ? '#fff' : '#333' }}>{h}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {horarioSelecionado && (
                <>
                    <Text style={styles.sectionTitle}>2. Quem pode atender-lhe?</Text>
                    {equipe.map(colab => {
                        const status = verificarDisponibilidade(colab);
                        const selecionado = colaboradorEscolhido?.id === colab.id;
                        return (
                            <TouchableOpacity
                                key={colab.id}
                                disabled={!status.ok}
                                style={[styles.colabCard, selecionado && styles.colabSelected, !status.ok && { opacity: 0.4 }]}
                                onPress={() => setColaboradorEscolhido(colab)}
                            >
                                <View>
                                    <Text style={styles.nomeColab}>{colab.nome}</Text>
                                    {!status.ok && <Text style={styles.txtErro}>{status.msg}</Text>}
                                </View>
                                {status.ok && <Ionicons name={selecionado ? "checkmark-circle" : "person-add"} size={24} color={colors.primary} />}
                            </TouchableOpacity>
                        );
                    })}
                </>
            )}

            <TouchableOpacity
                style={[styles.btnFinal, (!colaboradorEscolhido || loading) && { backgroundColor: '#ccc' }]}
                onPress={finalizar}
                disabled={!colaboradorEscolhido || loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>FINALIZAR AGENDAMENTO</Text>}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 15, color: '#444' },
    row: { flexDirection: 'row', marginBottom: 10 },
    dateBtn: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', flex: 1, alignItems: 'center' },
    dateText: { fontSize: 16, fontWeight: '500' },
    horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    horaItem: { backgroundColor: '#fff', width: '23%', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    horaSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    colabCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
    colabSelected: { borderColor: colors.primary, borderWidth: 2 },
    nomeColab: { fontWeight: 'bold', fontSize: 16 },
    txtErro: { fontSize: 11, color: 'red' },
    btnFinal: { backgroundColor: '#28a745', padding: 20, borderRadius: 12, alignItems: 'center', marginTop: 30 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});