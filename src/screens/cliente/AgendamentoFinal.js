import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    serverTimestamp,
    query,
    where,
    runTransaction,
} from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import {
    enviarPushAoProfissional,
    salvarNotificacaoProfissional,
} from "../../utils/notificationUtils";

async function enviarPushNotificacao(expoPushToken, clienteNome, data, horario) {
    await enviarPushAoProfissional(expoPushToken, {
        titulo: '🚀 Novo Agendamento!',
        mensagem: `${clienteNome} agendou para o dia ${data} às ${horario}`,
        screen: 'AgendaProfissional',
        root: 'Main',
        params: {},
    });
}

export default function AgendamentoFinal({ route, navigation }) {
    const { clinicaId, servicos } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [horarioSelecionado, setHorarioSelecionado] = useState(null);
    const [colaboradorEscolhido, setColaboradorEscolhido] = useState(null);
    const [perfilCliente, setPerfilCliente] = useState(null);
    const [clinicaData, setClinicaData] = useState(null);

    const [equipe, setEquipe] = useState([]);
    const [agendaClinica, setAgendaClinica] = useState({
        horarios: [],
        dias: [],
        agendaAtiva: true,
    });
    const [ocupacaoGeral, setOcupacaoGeral] = useState([]);

    useEffect(() => {
        inicializarTela();
    }, []);

    useEffect(() => {
        if (!loadingInicial) {
            buscarOcupacaoNoBanco();
            setHorarioSelecionado(null);
            setColaboradorEscolhido(null);
        }
    }, [date, loadingInicial]);

    const inicializarTela = async () => {
        setLoadingInicial(true);
        try {
            await Promise.all([
                carregarDadosIniciais(),
                carregarPerfilCliente(),
            ]);
        } catch (e) {
            console.log("Erro ao inicializar tela:", e);
        } finally {
            setLoadingInicial(false);
        }
    };

    const formatarDataFiltro = (dataObj) => {
        const d = dataObj.getDate().toString().padStart(2, '0');
        const m = (dataObj.getMonth() + 1).toString().padStart(2, '0');
        const y = dataObj.getFullYear();
        return `${y}-${m}-${d}`;
    };

    const formatarDataExibicao = (dataObj) => {
        return dataObj.toLocaleDateString('pt-BR');
    };

    const getNomeClinica = (dados) => {
        return (
            dados?.nome ||
            dados?.nomeCompleto ||
            dados?.nomeNegocio ||
            "Profissional"
        );
    };

    const carregarPerfilCliente = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const docSnap = await getDoc(doc(db, "usuarios", user.uid));
                if (docSnap.exists()) {
                    setPerfilCliente(docSnap.data());
                }
            }
        } catch (e) {
            console.log("Erro ao carregar perfil:", e);
        }
    };

    const carregarDadosIniciais = async () => {
        try {
            const clinicaUserRef = doc(db, "usuarios", clinicaId);
            const clinicaUserSnap = await getDoc(clinicaUserRef);
            const dadosClinica = clinicaUserSnap.exists() ? clinicaUserSnap.data() : {};

            setClinicaData(dadosClinica);

            const clinicaAgendaRef = doc(db, "usuarios", clinicaId, "configuracoes", "agenda");
            const clinicaAgendaSnap = await getDoc(clinicaAgendaRef);

            const agendaDono = clinicaAgendaSnap.exists()
                ? {
                    horarios: clinicaAgendaSnap.data().horarios || [],
                    dias: clinicaAgendaSnap.data().dias || [],
                    agendaAtiva: clinicaAgendaSnap.data().agendaAtiva !== false,
                }
                : {
                    horarios: [],
                    dias: [],
                    agendaAtiva: true,
                };

            setAgendaClinica(agendaDono);

            const servicosSnap = await getDocs(collection(db, "usuarios", clinicaId, "servicos"));
            const servicosDoDonoIds = servicosSnap.docs.map((d) => d.id);

            const donoComoProfissional = {
                id: clinicaId,
                nome: getNomeClinica(dadosClinica),
                email: dadosClinica.email || "",
                telefone: dadosClinica.telefone || "",
                whatsapp: dadosClinica.whatsapp || dadosClinica.telefone || "",
                perfil: dadosClinica.perfil || "profissional",
                tipo: dadosClinica.tipo || "profissional",
                servicosHabilitados: servicosDoDonoIds,
                agenda: agendaDono,
                ehDono: true,
            };

            const colabSnap = await getDocs(collection(db, "usuarios", clinicaId, "colaboradores"));
            const listaColabs = [];

            for (const d of colabSnap.docs) {
                const dados = d.data();

                const agendaRef = doc(
                    db,
                    "usuarios",
                    clinicaId,
                    "colaboradores",
                    d.id,
                    "configuracoes",
                    "agenda"
                );
                const aSnap = await getDoc(agendaRef);

                listaColabs.push({
                    id: d.id,
                    ...dados,
                    nome: dados.nome || dados.nomeCompleto || "Profissional",
                    telefone: dados.telefone || "",
                    whatsapp: dados.whatsapp || dados.telefone || "",
                    agenda: aSnap.exists()
                        ? {
                            horarios: aSnap.data().horarios || [],
                            dias: aSnap.data().dias || [],
                            agendaAtiva: aSnap.data().agendaAtiva !== false,
                        }
                        : null,
                    ehDono: false,
                });
            }

            setEquipe([donoComoProfissional, ...listaColabs]);
        } catch (e) {
            console.log("Erro ao carregar dados iniciais:", e);
            Alert.alert("Erro", "Não foi possível carregar os dados do agendamento.");
        }
    };

    const buscarOcupacaoNoBanco = async () => {
        const dataFiltro = formatarDataFiltro(date);

        try {
            const q = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", clinicaId),
                where("dataFiltro", "==", dataFiltro)
            );

            const snap = await getDocs(q);
            const ocupados = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((item) => item.status !== "cancelado")
                .map((item) => ({
                    horario: item.horario,
                    colabId: item.colaboradorId,
                }));

            setOcupacaoGeral(ocupados);
        } catch (e) {
            console.log("Erro ocupação:", e);
        }
    };

    const diaSemanaSelecionado = useMemo(() => date.getDay(), [date]);

    const agendaDoColaborador = (colab) => {
        return colab.agenda && colab.agenda.agendaAtiva !== false
            ? colab.agenda
            : agendaClinica;
    };

    const colaboradorPodeAtenderNoHorario = (colab, horario) => {
        const agenda = agendaDoColaborador(colab);

        const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
        const trabalhaHora = agenda?.horarios?.includes(horario);
        const fazServicos = servicos.every((s) =>
            colab.servicosHabilitados?.includes(s.id)
        );
        const jaOcupado = ocupacaoGeral.some(
            (o) => o.horario === horario && o.colabId === colab.id
        );

        return Boolean(trabalhaDia && trabalhaHora && fazServicos && !jaOcupado);
    };

    const existeAlgumProfissionalDisponivelNoDia = useMemo(() => {
        return equipe.some((colab) => {
            const agenda = agendaDoColaborador(colab);
            const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
            const temHorarios = (agenda?.horarios || []).length > 0;
            const fazServicos = servicos.every((s) =>
                colab.servicosHabilitados?.includes(s.id)
            );

            return Boolean(trabalhaDia && temHorarios && fazServicos);
        });
    }, [equipe, agendaClinica, diaSemanaSelecionado, servicos]);

    const horariosDisponiveisGerais = useMemo(() => {
        const horariosBase = agendaClinica?.horarios || [];

        return horariosBase.filter((horario) =>
            equipe.some((colab) => colaboradorPodeAtenderNoHorario(colab, horario))
        );
    }, [agendaClinica, equipe, ocupacaoGeral, diaSemanaSelecionado, servicos]);

    const verificarDisponibilidadeColab = (colab) => {
        if (!horarioSelecionado) {
            return { ok: false, msg: "Escolha um horário" };
        }

        const agenda = agendaDoColaborador(colab);
        const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
        const trabalhaHora = agenda?.horarios?.includes(horarioSelecionado);
        const fazServicos = servicos.every((s) =>
            colab.servicosHabilitados?.includes(s.id)
        );
        const jaOcupado = ocupacaoGeral.some(
            (o) => o.horario === horarioSelecionado && o.colabId === colab.id
        );

        if (jaOcupado) return { ok: false, msg: "Já ocupado" };
        if (!trabalhaDia) return { ok: false, msg: "Não atende neste dia" };
        if (!trabalhaHora) return { ok: false, msg: "Horário indisponível" };
        if (!fazServicos) return { ok: false, msg: "Não realiza este serviço" };

        return { ok: true };
    };

    const dataSelecionadaEhHoje = () => {
        const agora = new Date();
        return (
            agora.getDate() === date.getDate() &&
            agora.getMonth() === date.getMonth() &&
            agora.getFullYear() === date.getFullYear()
        );
    };

    const horarioJaPassouHoje = (horario) => {
        if (!dataSelecionadaEhHoje()) return false;

        const [h, m] = horario.split(':').map(Number);
        const agora = new Date();
        const minutosHorario = h * 60 + m;
        const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

        return minutosHorario <= minutosAgora;
    };

    const salvarNotificacaoInternaProfissional = async ({
        profissionalId,
        clienteId,
        clienteNome,
        dataExibicao,
        horarioSelecionadoAtual,
        agendamentoId,
    }) => {
        await salvarNotificacaoProfissional({
            profissionalId,
            tipo: 'novo_agendamento',
            titulo: '🚀 Novo agendamento recebido',
            mensagem: `${clienteNome} agendou para o dia ${dataExibicao} às ${horarioSelecionadoAtual}.`,
            agendamentoId,
            clienteId,
            clienteNome,
            screen: 'AgendaProfissional',
            root: 'Main',
            params: {},
        });
    };

    const enviarPushProfissionalSeTiverToken = async ({
        profissionalId,
        clienteNome,
        dataExibicao,
        horarioSelecionadoAtual,
    }) => {
        try {
            const profissionalSnap = await getDoc(doc(db, "usuarios", profissionalId));

            if (!profissionalSnap.exists()) return;

            const dadosProfissional = profissionalSnap.data();
            const token =
                dadosProfissional?.expoPushToken ||
                dadosProfissional?.pushToken ||
                '';

            if (!token) return;

            await enviarPushNotificacao(
                token,
                clienteNome,
                dataExibicao,
                horarioSelecionadoAtual
            );
        } catch (error) {
            console.log("Erro ao enviar push para profissional:", error);
        }
    };

    const finalizar = async () => {
        if (!colaboradorEscolhido || !horarioSelecionado) {
            return Alert.alert("Atenção", "Selecione data, hora e profissional.");
        }

        if (!auth.currentUser) {
            return Alert.alert("Erro", "Usuário não autenticado.");
        }

        setLoading(true);

        try {
            const dataFiltro = formatarDataFiltro(date);
            const dataExibicao = formatarDataExibicao(date);

            const nomeCliente =
                perfilCliente?.nome ||
                perfilCliente?.nomeCompleto ||
                "Cliente";

            const clientePushToken =
                perfilCliente?.expoPushToken ||
                perfilCliente?.pushToken ||
                '';

            const novoAgendamentoRef = doc(collection(db, "agendamentos"));

            await runTransaction(db, async (transaction) => {
                const slotQuery = query(
                    collection(db, "agendamentos"),
                    where("clinicaId", "==", clinicaId),
                    where("dataFiltro", "==", dataFiltro),
                    where("colaboradorId", "==", colaboradorEscolhido.id),
                    where("horario", "==", horarioSelecionado)
                );

                const slotSnap = await getDocs(slotQuery);
                const slotOcupado = slotSnap.docs.some(
                    (d) => d.data().status !== "cancelado"
                );

                if (slotOcupado) {
                    throw new Error("HORARIO_OCUPADO");
                }

                transaction.set(novoAgendamentoRef, {
                    clinicaId,
                    clinicaNome: getNomeClinica(clinicaData),

                    clinicaWhatsapp: clinicaData?.whatsapp || clinicaData?.telefone || "",
                    profissionalWhatsapp:
                        colaboradorEscolhido?.whatsapp ||
                        colaboradorEscolhido?.telefone ||
                        clinicaData?.whatsapp ||
                        clinicaData?.telefone ||
                        "",

                    colaboradorWhatsapp:
                        colaboradorEscolhido?.whatsapp ||
                        colaboradorEscolhido?.telefone ||
                        "",

                    servicos: servicos.map((s) => ({
                        id: s.id,
                        nome: s.nome,
                        preco: s.preco,
                    })),

                    colaboradorId: colaboradorEscolhido.id,
                    colaboradorNome: colaboradorEscolhido.nome || "Profissional",

                    clienteId: auth.currentUser.uid,
                    clienteNome: nomeCliente,
                    clienteWhatsapp:
                        perfilCliente?.whatsapp ||
                        perfilCliente?.telefone ||
                        "Não informado",
                    clientePushToken,

                    data: dataExibicao,
                    dataFiltro,
                    horario: horarioSelecionado,
                    status: "pendente",
                    dataCriacao: serverTimestamp(),
                });
            });

            await salvarNotificacaoInternaProfissional({
                profissionalId: colaboradorEscolhido.id,
                clienteId: auth.currentUser.uid,
                clienteNome: nomeCliente,
                dataExibicao,
                horarioSelecionadoAtual: horarioSelecionado,
                agendamentoId: novoAgendamentoRef.id,
            });

            await enviarPushProfissionalSeTiverToken({
                profissionalId: colaboradorEscolhido.id,
                clienteNome: nomeCliente,
                dataExibicao,
                horarioSelecionadoAtual: horarioSelecionado,
            });

            if (clinicaId !== colaboradorEscolhido.id) {
                await salvarNotificacaoInternaProfissional({
                    profissionalId: clinicaId,
                    clienteId: auth.currentUser.uid,
                    clienteNome: nomeCliente,
                    dataExibicao,
                    horarioSelecionadoAtual: horarioSelecionado,
                    agendamentoId: novoAgendamentoRef.id,
                });

                await enviarPushProfissionalSeTiverToken({
                    profissionalId: clinicaId,
                    clienteNome: nomeCliente,
                    dataExibicao,
                    horarioSelecionadoAtual: horarioSelecionado,
                });
            }

            Alert.alert("Sucesso!", "Agendamento realizado com sucesso!");
            navigation.navigate("Main", {
                screen: "MeusAgendamentosCliente",
            });
        } catch (e) {
            console.log("Erro ao finalizar agendamento:", e);

            if (e.message === "HORARIO_OCUPADO") {
                await buscarOcupacaoNoBanco();
                Alert.alert("Horário Ocupado", "Alguém acabou de reservar este horário.");
            } else {
                Alert.alert("Erro", "Falha ao agendar.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loadingInicial) {
        return (
            <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando horários...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            <ScrollView style={styles.container}>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Finalizar Agendamento</Text>
                    <Text style={styles.subtitle}>
                        {servicos.length} serviço(s) selecionado(s)
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>Selecione a Data</Text>
                <TouchableOpacity
                    style={styles.dateSelector}
                    onPress={() => setShowPicker(true)}
                >
                    <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                    <Text style={styles.dateSelectorText}>
                        {date.toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                        })}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>

                {showPicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        minimumDate={new Date()}
                        onChange={(event, selectedDate) => {
                            setShowPicker(false);
                            if (selectedDate) {
                                setDate(selectedDate);
                            }
                        }}
                    />
                )}

                <Text style={styles.sectionLabel}>Horários Disponíveis</Text>

                {!existeAlgumProfissionalDisponivelNoDia ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Nenhum profissional disponível para este serviço nesta data.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.horariosGrid}>
                        {horariosDisponiveisGerais.length > 0 ? (
                            horariosDisponiveisGerais.map((h) => {
                                const selecionado = horarioSelecionado === h;
                                const horarioPassado = horarioJaPassouHoje(h);
                                const disponivel = !horarioPassado;

                                return (
                                    <TouchableOpacity
                                        key={h}
                                        disabled={!disponivel}
                                        style={[
                                            styles.horaChip,
                                            disponivel ? styles.horaChipLivre : styles.horaChipIndisponivel,
                                            selecionado && styles.horaChipSelected,
                                        ]}
                                        onPress={() => {
                                            setHorarioSelecionado(h);
                                            setColaboradorEscolhido(null);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.horaChipText,
                                                selecionado
                                                    ? styles.horaChipTextSelected
                                                    : disponivel
                                                        ? styles.horaChipTextLivre
                                                        : styles.horaChipTextIndisponivel,
                                            ]}
                                        >
                                            {h}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyBoxText}>
                                    Não há horários livres nessa data.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {horarioSelecionado && (
                    <View style={styles.colabSection}>
                        <Text style={styles.sectionLabel}>Escolha o Profissional</Text>

                        {equipe.filter((colab) => verificarDisponibilidadeColab(colab).ok).length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyBoxText}>
                                    Nenhum profissional disponível para este horário.
                                </Text>
                            </View>
                        ) : (
                            equipe.map((colab) => {
                                const status = verificarDisponibilidadeColab(colab);
                                const selecionado = colaboradorEscolhido?.id === colab.id;

                                return (
                                    <TouchableOpacity
                                        key={colab.id}
                                        disabled={!status.ok}
                                        style={[
                                            styles.colabCard,
                                            selecionado && styles.colabSelected,
                                            !status.ok && styles.colabDisabled,
                                        ]}
                                        onPress={() => setColaboradorEscolhido(colab)}
                                    >
                                        <View
                                            style={[
                                                styles.colabAvatar,
                                                !status.ok && { backgroundColor: '#EEE' },
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.colabAvatarText,
                                                    !status.ok && { color: '#999' },
                                                ]}
                                            >
                                                {colab.nome?.charAt(0) || "P"}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 15 }}>
                                            <Text
                                                style={[
                                                    styles.nomeColab,
                                                    !status.ok && { color: '#999' },
                                                ]}
                                            >
                                                {colab.nome}
                                            </Text>
                                            {!status.ok && (
                                                <Text style={styles.txtErro}>{status.msg}</Text>
                                            )}
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
                            })
                        )}
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.btnFinal,
                        (!colaboradorEscolhido || loading) && styles.btnDisabled,
                    ]}
                    onPress={finalizar}
                    disabled={!colaboradorEscolhido || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.btnText}>CONFIRMAR AGENDAMENTO</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 20 },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background
    },
    loadingText: { marginTop: 12, color: colors.secondary, fontSize: 14 },
    headerInfo: { marginBottom: 25, marginTop: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.textDark,
        marginTop: 10
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 18,
        borderRadius: 15,
        elevation: 2,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border
    },
    dateSelectorText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textDark,
        textTransform: 'capitalize'
    },
    horariosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start'
    },
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
    colabCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.border
    },
    colabSelected: { borderColor: colors.primary, backgroundColor: '#F0F7FF' },
    colabDisabled: { opacity: 0.5, backgroundColor: '#F8F8F8' },
    colabAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: colors.inputFill,
        justifyContent: 'center',
        alignItems: 'center'
    },
    colabAvatarText: { fontWeight: 'bold', color: colors.primary },
    nomeColab: { fontWeight: 'bold', fontSize: 16, color: colors.textDark },
    txtErro: { fontSize: 12, color: colors.danger, fontWeight: '500' },
    emptyBox: {
        width: '100%',
        backgroundColor: '#FFF4E5',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FFE0B2',
        marginBottom: 12
    },
    emptyBoxText: { color: '#8A6D3B', fontSize: 14, textAlign: 'center' },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'transparent'
    },
    btnFinal: {
        backgroundColor: colors.success,
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        elevation: 5
    },
    btnDisabled: { backgroundColor: '#CCC', elevation: 0 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
});