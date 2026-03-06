import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { auth, db } from "./firebaseConfig";
import { doc, getDoc, getDocs, setDoc, collection, serverTimestamp, query, where } from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from "./colors";

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
    const [ocupacaoGeral, setOcupacaoGeral] = useState([]);

    useEffect(() => {
        carregarDadosIniciais();
        carregarPerfilCliente();
    }, []);

    useEffect(() => {
        buscarOcupacaoNoBanco();
    }, [date]);

    const formatarDataFiltro = (dataObj) => {
        const d = dataObj.getDate().toString().padStart(2, '0');
        const m = (dataObj.getMonth() + 1).toString().padStart(2, '0');
        const y = dataObj.getFullYear();
        return `${y}-${m}-${d}`;
    };

    const carregarPerfilCliente = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const docSnap = await getDoc(doc(db, "usuarios", user.uid));
                if (docSnap.exists()) setPerfilCliente(docSnap.data());
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

    const buscarOcupacaoNoBanco = async () => {
        const dataFiltro = formatarDataFiltro(date);
        try {
            const q = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", clinicaId),
                where("dataFiltro", "==", dataFiltro),
                where("status", "!=", "cancelado")
            );
            const snap = await getDocs(q);
            const ocupados = snap.docs.map(d => ({
                horario: d.data().horario,
                colabId: d.data().colaboradorId
            }));
            setOcupacaoGeral(ocupados);
        } catch (e) { console.log("Erro ocupação:", e); }
    };

    const isHorarioDisponivelGeral = (h) => {
        const diaSemana = date.getDay();
        return equipe.some(colab => {
            const agenda = colab.agenda || agendaClinica;
            const trabalhaDia = agenda.dias?.includes(diaSemana);
            const trabalhaHora = agenda.horarios?.includes(h);
            const fazServicos = servicos.every(s => colab.servicosHabilitados?.includes(s.id));
            const jaOcupado = ocupacaoGeral.some(o => o.horario === h && o.colabId === colab.id);
            return trabalhaDia && trabalhaHora && fazServicos && !jaOcupado;
        });
    };

    const verificarDisponibilidadeColab = (colab) => {
        if (!horarioSelecionado) return { ok: false, msg: "Escolha um horário" };
        const diaSemana = date.getDay();
        const agenda = colab.agenda || agendaClinica;
        const jaOcupado = ocupacaoGeral.some(o => o.horario === horarioSelecionado && o.colabId === colab.id);
        if (jaOcupado) return { ok: false, msg: "Já ocupado" };
        const trabalhaDia = agenda.dias?.includes(diaSemana);
        const trabalhaHora = agenda.horarios?.includes(horarioSelecionado);
        const fazServicos = servicos.every(s => colab.servicosHabilitados?.includes(s.id));
        if (trabalhaDia && trabalhaHora && fazServicos) return { ok: true };
        if (!fazServicos) return { ok: false, msg: "Não realiza este serviço" };
        return { ok: false, msg: "Indisponível" };
    };

    const finalizar = async () => {
        if (!colaboradorEscolhido || !horarioSelecionado) return Alert.alert("Atenção", "Selecione data, hora e profissional.");
        setLoading(true);
        try {
            const dataFiltro = formatarDataFiltro(date);
            const dataExibicao = date.toLocaleDateString('pt-BR');
            const agendamentoID = `${dataFiltro}_${horarioSelecionado.replace(':', '')}_${colaboradorEscolhido.id}`;
            const agendamentoRef = doc(db, "agendamentos", agendamentoID);
            const checkSnap = await getDoc(agendamentoRef);

            if (checkSnap.exists() && checkSnap.data().status !== "cancelado") {
                setLoading(false);
                buscarOcupacaoNoBanco();
                return Alert.alert("Horário Ocupado", "Alguém acabou de reservar.");
            }

            const nomeCliente = perfilCliente?.nome || "Cliente";
            await setDoc(agendamentoRef, {
                clinicaId,
                servicos: servicos.map(s => ({ id: s.id, nome: s.nome, preco: s.preco })),
                colaboradorId: colaboradorEscolhido.id,
                colaboradorNome: colaboradorEscolhido.nome,
                clienteId: auth.currentUser.uid,
                clienteNome: nomeCliente,
                clienteWhatsapp: perfilCliente?.whatsapp || "Não informado",
                data: dataExibicao,
                dataFiltro: dataFiltro,
                horario: horarioSelecionado,
                status: "pendente",
                dataCriacao: serverTimestamp()
            });

            const proSnap = await getDoc(doc(db, "usuarios", clinicaId));
            if (proSnap.exists() && proSnap.data().pushToken) {
                await enviarPushNotificacao(proSnap.data().pushToken, nomeCliente, dataExibicao, horarioSelecionado);
            }

            Alert.alert("Sucesso!", "Agendamento realizado!");
            navigation.navigate("Main");
        } catch (e) {
            console.error(e);
            Alert.alert("Erro", "Falha ao agendar.");
        } finally { setLoading(false); }
    };

    return (
        <View style={styles.mainContainer}>
            <ScrollView style={styles.container}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Finalizar Agendamento</Text>
                    <Text style={styles.subtitle}>{servicos.length} serviço(s) selecionado(s)</Text>
                </View>

                <Text style={styles.sectionLabel}>Selecione a Data</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    <Text style={styles.dateSelectorText}>{date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                    <Ionicons name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>

                {showPicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        minimumDate={new Date()}
                        onChange={(e, d) => { setShowPicker(false); setDate(d || date); setHorarioSelecionado(null); setColaboradorEscolhido(null); }}
                    />
                )}

                <Text style={styles.sectionLabel}>Horários Disponíveis</Text>
                <View style={styles.horariosGrid}>
                    {agendaClinica.horarios.map(h => {
                        const disponivel = isHorarioDisponivelGeral(h);
                        const selecionado = horarioSelecionado === h;
                        return (
                            <TouchableOpacity
                                key={h}
                                disabled={!disponivel}
                                style={[
                                    styles.horaChip,
                                    disponivel ? styles.horaChipLivre : styles.horaChipIndisponivel,
                                    selecionado && styles.horaChipSelected
                                ]}
                                onPress={() => { setHorarioSelecionado(h); setColaboradorEscolhido(null); }}
                            >
                                <Text style={[
                                    styles.horaChipText,
                                    selecionado ? styles.horaChipTextSelected : (disponivel ? styles.horaChipTextLivre : styles.horaChipTextIndisponivel)
                                ]}>
                                    {h}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {horarioSelecionado && (
                    <View style={styles.colabSection}>
                        <Text style={styles.sectionLabel}>Escolha o Profissional</Text>
                        {equipe.map(colab => {
                            const status = verificarDisponibilidadeColab(colab);
                            const selecionado = colaboradorEscolhido?.id === colab.id;
                            return (
                                <TouchableOpacity
                                    key={colab.id}
                                    disabled={!status.ok}
                                    style={[
                                        styles.colabCard,
                                        selecionado && styles.colabSelected,
                                        !status.ok && styles.colabDisabled
                                    ]}
                                    onPress={() => setColaboradorEscolhido(colab)}
                                >
                                    <View style={[styles.colabAvatar, !status.ok && { backgroundColor: '#EEE' }]}>
                                        <Text style={[styles.colabAvatarText, !status.ok && { color: '#999' }]}>{colab.nome.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                        <Text style={[styles.nomeColab, !status.ok && { color: '#999' }]}>{colab.nome}</Text>
                                        {!status.ok && <Text style={styles.txtErro}>{status.msg}</Text>}
                                    </View>
                                    {status.ok && (
                                        <Ionicons
                                            name={selecionado ? "radio-button-on" : "radio-button-off"}
                                            size={24}
                                            color={selecionado ? colors.primary : colors.border}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.btnFinal, (!colaboradorEscolhido || loading) && styles.btnDisabled]}
                    onPress={finalizar}
                    disabled={!colaboradorEscolhido || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>CONFIRMAR AGENDAMENTO</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 20 },
    headerInfo: { marginBottom: 25, marginTop: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary },
    sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.textDark, marginTop: 10 },
    dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 18, borderRadius: 15, elevation: 2, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    dateSelectorText: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: colors.textDark, textTransform: 'capitalize' },

    horariosGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    horaChip: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        minWidth: 80
    },
    horaChipLivre: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
    horaChipTextLivre: { color: '#2E7D32', fontWeight: 'bold' },
    horaChipIndisponivel: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', opacity: 0.6 },
    horaChipTextIndisponivel: { color: '#C62828' },
    horaChipSelected: { backgroundColor: '#918a8a', borderColor: '#212121', elevation: 4 },
    horaChipTextSelected: { color: '#FFF', fontWeight: 'bold' },

    colabSection: { marginTop: 10 },
    colabCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: colors.border },
    colabSelected: { borderColor: colors.primary, backgroundColor: '#F0F7FF' },
    colabDisabled: { opacity: 0.5, backgroundColor: '#F8F8F8' },
    colabAvatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: colors.inputFill, justifyContent: 'center', alignItems: 'center' },
    colabAvatarText: { fontWeight: 'bold', color: colors.primary },
    nomeColab: { fontWeight: 'bold', fontSize: 16, color: colors.textDark },
    txtErro: { fontSize: 12, color: colors.danger, fontWeight: '500' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'transparent' },
    btnFinal: { backgroundColor: colors.success, padding: 18, borderRadius: 15, alignItems: 'center', elevation: 5 },
    btnDisabled: { backgroundColor: '#CCC', elevation: 0 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }
});