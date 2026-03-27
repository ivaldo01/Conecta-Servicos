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

const FORMAS_PAGAMENTO = [
    {
        id: 'pix',
        titulo: 'Pix',
        descricao: 'Pagamento instantâneo',
        icon: 'qr-code-outline',
    },
    {
        id: 'boleto',
        titulo: 'Boleto',
        descricao: 'Cobrança bancária',
        icon: 'document-text-outline',
    },
    {
        id: 'cartao_credito',
        titulo: 'Cartão de crédito',
        descricao: 'Cobrança no crédito',
        icon: 'card-outline',
    },
    {
        id: 'cartao_debito',
        titulo: 'Cartão de débito',
        descricao: 'Cobrança no débito',
        icon: 'card-outline',
    },
];

const STATUS_PAGAMENTO_INICIAL = 'aguardando_cobranca';

function parseNumero(valor, fallback = 0) {
    if (valor === null || valor === undefined || valor === '') return fallback;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
}

function normalizarServico(servico, index = 0) {
    const id =
        servico?.id ||
        servico?.servicoId ||
        servico?.uid ||
        `servico_${index}`;

    const nome =
        servico?.nome ||
        servico?.titulo ||
        servico?.name ||
        'Serviço';

    const preco = parseNumero(
        servico?.preco ??
        servico?.valor ??
        servico?.price,
        0
    );

    const descricao =
        servico?.descricao ||
        servico?.description ||
        '';

    return {
        ...servico,
        id,
        nome,
        preco,
        descricao,
    };
}

function normalizarListaServicos(servicos) {
    if (!Array.isArray(servicos)) return [];
    return servicos
        .map((item, index) => normalizarServico(item, index))
        .filter((item) => !!item?.id);
}

function getNomePessoa(dados) {
    return (
        dados?.nome ||
        dados?.nomeCompleto ||
        dados?.nomeNegocio ||
        dados?.nomeFantasia ||
        'Profissional'
    );
}

function getWhatsappPessoa(dados) {
    return (
        dados?.whatsapp ||
        dados?.telefone ||
        ''
    );
}

export default function AgendamentoFinal({ route, navigation }) {
    const params = route?.params || {};

    const profissionalRoute =
        params?.profissional && typeof params.profissional === 'object'
            ? params.profissional
            : null;

    const clinicaId =
        params?.clinicaId ||
        params?.profissionalId ||
        params?.proId ||
        profissionalRoute?.id ||
        null;

    const origemAgendamento =
        params?.origem ||
        (profissionalRoute ? 'perfil_publico' : 'fluxo_padrao');

    const servicos = useMemo(() => {
        return normalizarListaServicos(params?.servicos);
    }, [params?.servicos]);

    const [loading, setLoading] = useState(false);
    const [loadingInicial, setLoadingInicial] = useState(true);
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [horarioSelecionado, setHorarioSelecionado] = useState(null);
    const [colaboradorEscolhido, setColaboradorEscolhido] = useState(null);
    const [perfilCliente, setPerfilCliente] = useState(null);

    const [clinicaData, setClinicaData] = useState(
        origemAgendamento === 'perfil_publico' && profissionalRoute
            ? profissionalRoute
            : null
    );

    const [formaPagamento, setFormaPagamento] = useState('pix');

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
        if (!loadingInicial && clinicaId) {
            buscarOcupacaoNoBanco();
            setHorarioSelecionado(null);
            setColaboradorEscolhido(null);
        }
    }, [date, loadingInicial, clinicaId]);

    const valorTotalAgendamento = useMemo(() => {
        return servicos.reduce((acc, servico) => {
            return acc + parseNumero(servico?.preco, 0);
        }, 0);
    }, [servicos]);

    const formaPagamentoSelecionada = useMemo(() => {
        return FORMAS_PAGAMENTO.find((item) => item.id === formaPagamento) || FORMAS_PAGAMENTO[0];
    }, [formaPagamento]);

    const inicializarTela = async () => {
        setLoadingInicial(true);

        try {
            if (!clinicaId) {
                Alert.alert("Erro", "Profissional não encontrado.");
                navigation.goBack();
                return;
            }

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

    const formatarMoeda = (valor) => {
        return Number(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    const getNomeClinica = (dados) => {
        return (
            dados?.nome ||
            dados?.nomeCompleto ||
            dados?.nomeNegocio ||
            dados?.nomeFantasia ||
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
            let dadosClinica = clinicaData;

            if (!dadosClinica) {
                const clinicaUserRef = doc(db, "usuarios", clinicaId);
                const clinicaUserSnap = await getDoc(clinicaUserRef);
                dadosClinica = clinicaUserSnap.exists() ? clinicaUserSnap.data() : {};
            }

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
                fotoPerfil:
                    dadosClinica?.fotoPerfil ||
                    dadosClinica?.foto ||
                    dadosClinica?.avatar ||
                    "",
                bannerPerfil:
                    dadosClinica?.bannerPerfil ||
                    dadosClinica?.banner ||
                    "",
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
                    fotoPerfil:
                        dados?.fotoPerfil ||
                        dados?.foto ||
                        dados?.avatar ||
                        "",
                    bannerPerfil:
                        dados?.bannerPerfil ||
                        dados?.banner ||
                        "",
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

            return trabalhaDia && temHorarios && fazServicos;
        });
    }, [equipe, agendaClinica, diaSemanaSelecionado, servicos]);

    const horariosDisponiveisGerais = useMemo(() => {
        const todosHorarios = new Set();

        equipe.forEach((colab) => {
            const agenda = agendaDoColaborador(colab);
            const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
            const fazServicos = servicos.every((s) =>
                colab.servicosHabilitados?.includes(s.id)
            );

            if (trabalhaDia && fazServicos) {
                (agenda?.horarios || []).forEach((h) => {
                    if (colaboradorPodeAtenderNoHorario(colab, h)) {
                        todosHorarios.add(h);
                    }
                });
            }
        });

        return Array.from(todosHorarios).sort((a, b) => a.localeCompare(b));
    }, [equipe, agendaClinica, diaSemanaSelecionado, ocupacaoGeral, servicos]);

    const verificarDisponibilidadeColab = (colab) => {
        if (!horarioSelecionado) {
            return { ok: false, msg: "Selecione um horário" };
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
        if (!servicos.length) {
            return Alert.alert("Atenção", "Selecione pelo menos um serviço antes de continuar.");
        }

        if (!clinicaId) {
            return Alert.alert("Erro", "Profissional não encontrado.");
        }

        if (!colaboradorEscolhido || !horarioSelecionado) {
            return Alert.alert("Atenção", "Selecione data, hora e profissional.");
        }

        if (!formaPagamento) {
            return Alert.alert("Atenção", "Selecione a forma de pagamento.");
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

                    clinicaWhatsapp: getWhatsappPessoa(clinicaData),
                    profissionalWhatsapp:
                        colaboradorEscolhido?.whatsapp ||
                        colaboradorEscolhido?.telefone ||
                        getWhatsappPessoa(clinicaData) ||
                        "",

                    colaboradorWhatsapp:
                        colaboradorEscolhido?.whatsapp ||
                        colaboradorEscolhido?.telefone ||
                        "",

                    servicos: servicos.map((s) => ({
                        id: s.id,
                        nome: s.nome,
                        preco: parseNumero(s.preco, 0),
                        descricao: s.descricao || '',
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

                    valorTotal: valorTotalAgendamento,
                    formaPagamento,
                    formaPagamentoLabel: formaPagamentoSelecionada?.titulo || 'Pix',
                    statusPagamento: STATUS_PAGAMENTO_INICIAL,
                    cobrancaGerada: false,
                    pagamentoConfirmado: false,

                    origemAgendamento,
                    profissionalOrigemId:
                        profissionalRoute?.id ||
                        params?.profissionalId ||
                        params?.proId ||
                        clinicaId,
                    profissionalOrigemNome: getNomePessoa(
                        profissionalRoute || clinicaData
                    ),
                    profissionalOrigemFoto:
                        profissionalRoute?.fotoPerfil ||
                        profissionalRoute?.foto ||
                        profissionalRoute?.avatar ||
                        clinicaData?.fotoPerfil ||
                        clinicaData?.foto ||
                        "",
                    origemTela: origemAgendamento === 'perfil_publico'
                        ? 'PerfilPublicoProfissional'
                        : 'fluxo_padrao',

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
                    {!!clinicaData && (
                        <Text style={styles.subtitleClinic}>
                            Profissional: {getNomeClinica(clinicaData)}
                        </Text>
                    )}
                </View>

                <View style={styles.resumeCard}>
                    <Text style={styles.resumeLabel}>VALOR TOTAL</Text>
                    <Text style={styles.resumeValue}>{formatarMoeda(valorTotalAgendamento)}</Text>
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

                <Text style={styles.sectionLabel}>Forma de Pagamento</Text>
                <View style={styles.paymentList}>
                    {FORMAS_PAGAMENTO.map((item) => {
                        const selecionado = formaPagamento === item.id;

                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.paymentCard,
                                    selecionado && styles.paymentCardSelected,
                                ]}
                                onPress={() => setFormaPagamento(item.id)}
                                activeOpacity={0.88}
                            >
                                <View style={styles.paymentIconArea}>
                                    <Ionicons
                                        name={item.icon}
                                        size={22}
                                        color={selecionado ? '#FFF' : colors.primary}
                                    />
                                </View>

                                <View style={styles.paymentTextArea}>
                                    <Text
                                        style={[
                                            styles.paymentTitle,
                                            selecionado && styles.paymentTitleSelected,
                                        ]}
                                    >
                                        {item.titulo}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.paymentDescription,
                                            selecionado && styles.paymentDescriptionSelected,
                                        ]}
                                    >
                                        {item.descricao}
                                    </Text>
                                </View>

                                <Ionicons
                                    name={selecionado ? 'radio-button-on' : 'radio-button-off'}
                                    size={22}
                                    color={selecionado ? colors.primary : colors.border}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.paymentInfoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#8A6D3B" />
                    <Text style={styles.paymentInfoText}>
                        O profissional vai gerar a cobrança depois, com base no valor deste agendamento e na forma de pagamento escolhida por você.
                    </Text>
                </View>

                <Text style={styles.sectionLabel}>Horários Disponíveis</Text>

                {!servicos.length ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Nenhum serviço foi enviado para o agendamento.
                        </Text>
                    </View>
                ) : !existeAlgumProfissionalDisponivelNoDia ? (
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

                <View style={styles.bottomSummaryCard}>
                    <Text style={styles.bottomSummaryLabel}>Pagamento escolhido</Text>
                    <Text style={styles.bottomSummaryValue}>{formaPagamentoSelecionada?.titulo}</Text>
                    <Text style={styles.bottomSummarySubtext}>
                        Status inicial: aguardando cobrança do profissional
                    </Text>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.btnFinal,
                        (!colaboradorEscolhido || loading || !servicos.length) && styles.btnDisabled,
                    ]}
                    onPress={finalizar}
                    disabled={!colaboradorEscolhido || loading || !servicos.length}
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
        backgroundColor: colors.background,
    },
    loadingText: { marginTop: 12, color: colors.secondary, fontSize: 14 },
    headerInfo: { marginBottom: 20, marginTop: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.textDark },
    subtitle: { fontSize: 14, color: colors.secondary },
    subtitleClinic: { fontSize: 14, color: colors.primary, marginTop: 6, fontWeight: '600' },
    resumeCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
    },
    resumeLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.secondary,
        marginBottom: 6,
        letterSpacing: 0.8,
    },
    resumeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.primary,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: colors.textDark,
        marginTop: 10,
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
        borderColor: colors.border,
    },
    dateSelectorText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
        color: colors.textDark,
        textTransform: 'capitalize',
    },
    paymentList: {
        marginBottom: 12,
    },
    paymentCard: {
        backgroundColor: '#FFF',
        borderRadius: 15,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
    },
    paymentCardSelected: {
        borderColor: colors.primary,
        backgroundColor: '#F0F7FF',
    },
    paymentIconArea: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.inputFill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    paymentTextArea: {
        flex: 1,
    },
    paymentTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textDark,
    },
    paymentTitleSelected: {
        color: colors.primary,
    },
    paymentDescription: {
        fontSize: 13,
        color: colors.secondary,
        marginTop: 4,
    },
    paymentDescriptionSelected: {
        color: colors.primary,
    },
    paymentInfoBox: {
        backgroundColor: '#FFF4E5',
        borderWidth: 1,
        borderColor: '#FFE0B2',
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    paymentInfoText: {
        flex: 1,
        color: '#8A6D3B',
        fontSize: 13,
        marginLeft: 8,
        lineHeight: 18,
    },
    horariosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    horaChip: {
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 12,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        minWidth: 80,
    },
    horaChipLivre: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
    horaChipTextLivre: { color: '#2E7D32', fontWeight: 'bold' },
    horaChipIndisponivel: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2', opacity: 0.6 },
    horaChipTextIndisponivel: { color: '#C62828' },
    horaChipSelected: { backgroundColor: '#918a8a', borderColor: '#212121', elevation: 4 },
    horaChipTextSelected: { color: '#FFF', fontWeight: 'bold' },
    horaChipText: { fontSize: 14 },
    colabSection: { marginTop: 10 },
    colabCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        elevation: 2,
    },
    colabSelected: {
        borderColor: colors.primary,
        backgroundColor: '#F0F7FF',
    },
    colabDisabled: {
        opacity: 0.7,
    },
    colabAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colabAvatarText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    nomeColab: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textDark,
    },
    txtErro: {
        fontSize: 12,
        color: colors.danger,
        marginTop: 4,
    },
    emptyBox: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        padding: 18,
        marginBottom: 10,
    },
    emptyBoxText: {
        color: colors.secondary,
        fontSize: 14,
        textAlign: 'center',
    },
    bottomSummaryCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
    },
    bottomSummaryLabel: {
        fontSize: 13,
        color: colors.secondary,
        marginBottom: 6,
    },
    bottomSummaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    bottomSummarySubtext: {
        marginTop: 6,
        fontSize: 12,
        color: colors.secondary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    btnFinal: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDisabled: {
        opacity: 0.6,
    },
    btnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
});