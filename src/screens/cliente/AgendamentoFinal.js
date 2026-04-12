import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { auth, db } from "../../services/firebaseConfig";
import {
    doc,
    getDoc,
    getDocs,
    collection,
    addDoc,
    serverTimestamp,
    query,
    runTransaction,
    where,
} from "firebase/firestore";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import {
    enviarPushAoProfissional,
    salvarNotificacaoProfissional,
} from "../../utils/notificationUtils";
import { travarHorario, liberarHorario } from '../../utils/agendaDisponibilidade';
import Sidebar from '../../components/Sidebar';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    {
        id: 'especie',
        titulo: 'Dinheiro',
        descricao: 'Pagar no local (Espécie)',
        icon: 'cash-outline',
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

    const [tipoAtendimento, setTipoAtendimento] = useState('cliente');
    const [menores, setMenores] = useState([]);
    const [menorSelecionado, setMenorSelecionado] = useState(null);
    const [observacoesMenor, setObservacoesMenor] = useState('');

    const [clinicaData, setClinicaData] = useState(
        origemAgendamento === 'perfil_publico' && profissionalRoute
            ? profissionalRoute
            : null
    );

    const [formaPagamento, setFormaPagamento] = useState('pix');

    const [equipe, setEquipe] = useState([]);
    const [agendamentosExistentes, setAgendamentosExistentes] = useState([]);
    const [agendaClinica, setAgendaClinica] = useState({
        horarios: [],
        dias: [],
        agendaAtiva: true,
    });

    useEffect(() => {
        inicializarTela();
    }, []);

    useEffect(() => {
        if (!loadingInicial && clinicaId) {
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
                carregarMenores(),
                carregarAgendamentosDoDia(),
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

    const carregarMenores = async () => {
        try {
            const user = auth.currentUser;
            if (!user?.uid) return;

            const snap = await getDocs(collection(db, "usuarios", user.uid, "menores"));
            const lista = snap.docs.map((item) => ({
                id: item.id,
                ...item.data(),
            }));

            setMenores(lista);
        } catch (e) {
            console.log("Erro ao carregar menores:", e);
            setMenores([]);
        }
    };

    const carregarAgendamentosDoDia = async () => {
        if (!clinicaId) return;
        try {
            const dataFiltro = formatarDataFiltro(date);
            const q = query(
                collection(db, "agendamentos"),
                where("clinicaId", "==", clinicaId),
                where("dataFiltro", "==", dataFiltro),
                where("status", "in", ["pendente", "confirmado"])
            );
            const snap = await getDocs(q);
            const agendados = snap.docs.map(d => ({
                horario: d.data().horario,
                colaboradorId: d.data().colaboradorId
            }));
            setAgendamentosExistentes(agendados);
        } catch (e) {
            console.log("Erro ao carregar agendamentos do dia:", e);
        }
    };

    useEffect(() => {
        if (!loadingInicial) {
            carregarAgendamentosDoDia();
        }
    }, [date]);

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
        const fazServicos = servicos.length === 0 || colab.ehDono || servicos.every((s) =>
            colab.servicosHabilitados?.includes(s.id)
        );

        const jaAgendado = agendamentosExistentes.some(
            a => a.horario === horario && a.colaboradorId === colab.id
        );

        return Boolean(trabalhaDia && trabalhaHora && fazServicos && !jaAgendado);
    };

    const existeAlgumProfissionalDisponivelNoDia = useMemo(() => {
        return equipe.some((colab) => {
            const agenda = agendaDoColaborador(colab);
            const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
            const temHorarios = (agenda?.horarios || []).length > 0;
            const fazServicos = servicos.length === 0 || colab.ehDono || servicos.every((s) =>
                colab.servicosHabilitados?.includes(s.id)
            );

            const temHorarioLivre = (agenda?.horarios || []).some(h => {
                const jaAgendado = agendamentosExistentes.some(
                    a => a.horario === h && a.colaboradorId === colab.id
                );
                return !jaAgendado;
            });

            return trabalhaDia && temHorarios && fazServicos && temHorarioLivre;
        });
    }, [equipe, agendaClinica, diaSemanaSelecionado, servicos, agendamentosExistentes]);

    const horariosDisponiveisGerais = useMemo(() => {
        const todosHorarios = new Set();

        equipe.forEach((colab) => {
            const agenda = agendaDoColaborador(colab);
            const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
            const fazServicos = servicos.length === 0 || colab.ehDono || servicos.every((s) =>
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
    }, [equipe, agendaClinica, diaSemanaSelecionado, servicos, agendamentosExistentes]);

    // Horários configurados do profissional selecionado naquele dia
    const todosHorariosDodia = useMemo(() => {
        if (!colaboradorEscolhido) return [];

        const agenda = agendaDoColaborador(colaboradorEscolhido);
        const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);

        if (!trabalhaDia) return [];

        return [...(agenda?.horarios || [])].sort((a, b) => a.localeCompare(b));
    }, [colaboradorEscolhido, agendaClinica, diaSemanaSelecionado]);

    // Estado de cada horário baseado EXCLUSIVAMENTE no profissional selecionado
    const getEstadoHorario = (h) => {
        if (horarioJaPassouHoje(h)) return 'passado';

        if (!colaboradorEscolhido) return 'passado';

        const livre = colaboradorPodeAtenderNoHorario(colaboradorEscolhido, h);
        return livre ? 'livre' : 'ocupado';
    };

    // Profissionais que atendem os serviços selecionados neste dia (sem filtro de horário)
    const colaboradoresDisponivelNoDia = useMemo(() => {
        return equipe.filter((colab) => {
            const agenda = agendaDoColaborador(colab);
            const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
            const fazServicos = servicos.length === 0 || colab.ehDono || servicos.every((s) =>
                colab.servicosHabilitados?.includes(s.id)
            );
            return trabalhaDia && fazServicos;
        });
    }, [equipe, agendaClinica, diaSemanaSelecionado, servicos]);

    const verificarDisponibilidadeColab = (colab) => {
        if (!horarioSelecionado) {
            return { ok: false, msg: "Selecione um horário" };
        }

        const agenda = agendaDoColaborador(colab);
        const trabalhaDia = agenda?.dias?.includes(diaSemanaSelecionado);
        const trabalhaHora = agenda?.horarios?.includes(horarioSelecionado);
        const fazServicos = servicos.length === 0 || colab.ehDono || servicos.every((s) =>
            colab.servicosHabilitados?.includes(s.id)
        );

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
            params: {
                agendamentoId,
            },
        });
    };

    const salvarNotificacaoInternaCliente = async ({
        clienteId,
        clienteNome,
        dataExibicao,
        horarioSelecionadoAtual,
        agendamentoId,
        profissionalNome,
    }) => {
        try {
            await addDoc(collection(db, 'usuarios', clienteId, 'notificacoes'), {
                tipo: 'novo_agendamento',
                titulo: '✅ Agendamento solicitado!',
                mensagem: `Sua solicitação para ${profissionalNome} no dia ${dataExibicao} às ${horarioSelecionadoAtual} foi enviada. Aguarde a confirmação.`,
                agendamentoId,
                profissionalNome,
                screen: 'MeusAgendamentosCliente',
                root: 'Main',
                params: { agendamentoId },
                createdAt: serverTimestamp(),
                lida: false,
            });
        } catch (error) {
            console.log('Erro ao criar notificação para cliente:', error);
        }
    };

    const enviarPushClienteSeTiverToken = async ({
        token,
        profissionalNome,
        dataExibicao,
        horarioSelecionadoAtual,
    }) => {
        if (!token) return;
        try {
            await enviarPushAoProfissional(token, {
                titulo: '✅ Agendamento solicitado!',
                mensagem: `Sua solicitação para ${profissionalNome} no dia ${dataExibicao} às ${horarioSelecionadoAtual} foi enviada.`,
                screen: 'MeusAgendamentosCliente',
                root: 'Main',
                params: {},
            });
        } catch (error) {
            console.log("Erro ao enviar push para cliente:", error);
        }
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

        if (tipoAtendimento === 'menor' && !menorSelecionado) {
            return Alert.alert("Atenção", "Selecione o dependente para este agendamento.");
        }

        setLoading(true);

        const dataFiltro = formatarDataFiltro(date);
        const dataExibicao = formatarDataExibicao(date);
        const novoAgendamentoRef = doc(collection(db, "agendamentos"));

        let horarioTravado = false;

        try {
            const nomeCliente =
                perfilCliente?.nome ||
                perfilCliente?.nomeCompleto ||
                "Cliente";

            const clientePushToken =
                perfilCliente?.expoPushToken ||
                perfilCliente?.pushToken ||
                '';

            // 1. Trava o horário atomicamente ANTES de salvar o agendamento.
            //    travarHorario usa runTransaction internamente na coleção
            //    'agenda_ocupada', garantindo que apenas um cliente consiga
            //    reservar o slot mesmo em requisições simultâneas.
            await travarHorario({
                clinicaId,
                data: dataFiltro,
                horario: horarioSelecionado,
                colaboradorId: colaboradorEscolhido.id,
                agendamentoId: novoAgendamentoRef.id,
            });
            horarioTravado = true;

            // 2. Salva o agendamento no Firestore
            await runTransaction(db, async (transaction) => {
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

                    profissionalId: colaboradorEscolhido?.id || clinicaId || null,
                    tipoAtendimento,
                    menorId: tipoAtendimento === 'menor' ? menorSelecionado?.id || null : null,
                    menorNome: tipoAtendimento === 'menor' ? menorSelecionado?.nome || null : null,
                    menorIdade: tipoAtendimento === 'menor' ? menorSelecionado?.idade || null : null,
                    menorParentesco: tipoAtendimento === 'menor' ? menorSelecionado?.parentesco || null : null,
                    observacoesMenor: tipoAtendimento === 'menor' ? observacoesMenor.trim() || null : null,

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

            await salvarNotificacaoInternaCliente({
                clienteId: auth.currentUser.uid,
                clienteNome: nomeCliente,
                dataExibicao,
                horarioSelecionadoAtual: horarioSelecionado,
                agendamentoId: novoAgendamentoRef.id,
                profissionalNome: colaboradorEscolhido.nome || "Profissional",
            });

            await enviarPushClienteSeTiverToken({
                token: clientePushToken,
                profissionalNome: colaboradorEscolhido.nome || "Profissional",
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

            Alert.alert(
                "Sucesso!",
                "Agendamento enviado com sucesso. O profissional irá confirmar a disponibilidade."
            );

            navigation.navigate("Main", {
                screen: "MeusAgendamentosCliente",
            });
        } catch (e) {
            console.log("Erro ao finalizar agendamento:", e);

            if (e.message === "HORARIO_OCUPADO") {
                Alert.alert(
                    "Horário Indisponível",
                    "Este horário acabou de ser preenchido por outra pessoa. Por favor, escolha outro horário."
                );
                carregarAgendamentosDoDia();
            } else {
                // Se o horário foi travado mas o agendamento falhou, libera o slot
                if (horarioTravado) {
                    try {
                        await liberarHorario({
                            clinicaId,
                            data: dataFiltro,
                            horario: horarioSelecionado,
                            colaboradorId: colaboradorEscolhido.id,
                        });
                    } catch (erroLiberar) {
                        console.log('Aviso: erro ao liberar horário após falha:', erroLiberar);
                    }
                }
                Alert.alert(
                    "Erro",
                    "Não foi possível concluir o agendamento. Verifique as regras do Firestore e tente novamente."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    const { width: windowWidth } = useWindowDimensions();
    const isLargeScreen = Platform.OS === 'web' && windowWidth > 768;

    const MainContent = (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[
                styles.contentPadding,
                isLargeScreen && styles.contentLarge,
            ]}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.headerInfo, isLargeScreen && styles.headerInfoLarge]}>
                <View style={styles.headerCircle} />
                <View style={styles.headerCircleTwo} />
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Finalizar Agendamento</Text>
                    <Text style={styles.subtitle}>
                        Confirme os detalhes e reserve seu horário
                    </Text>
                    {clinicaData && (
                        <Text style={styles.subtitleClinic}>
                            Profissional: {getNomePessoa(clinicaData)}
                        </Text>
                    )}
                </View>
            </View>

            <View style={[styles.resumeCard, isLargeScreen && styles.resumeCardLarge]}>
                <Text style={styles.resumeLabel}>TOTAL DO AGENDAMENTO</Text>
                <Text style={styles.resumeValue}>{formatarMoeda(valorTotalAgendamento)}</Text>
            </View>

            <View style={[styles.formGrid, isLargeScreen && styles.formGridLarge]}>
                <View style={styles.formColumn}>
                    <Text style={styles.sectionLabel}>Para quem é o atendimento?</Text>
                    <View style={styles.tipoAtendimentoRow}>
                        <TouchableOpacity
                            style={[styles.tipoAtendimentoCard, tipoAtendimento === 'cliente' && styles.tipoAtendimentoCardSelected]}
                            onPress={() => setTipoAtendimento('cliente')}
                        >
                            <Ionicons name="person-outline" size={20} color={tipoAtendimento === 'cliente' ? colors.primary : '#64748B'} />
                            <Text style={[styles.tipoAtendimentoText, tipoAtendimento === 'cliente' && styles.tipoAtendimentoTextSelected]}>Para mim</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tipoAtendimentoCard, tipoAtendimento === 'menor' && styles.tipoAtendimentoCardSelected]}
                            onPress={() => setTipoAtendimento('menor')}
                        >
                            <Ionicons name="people-outline" size={20} color={tipoAtendimento === 'menor' ? colors.primary : '#64748B'} />
                            <Text style={[styles.tipoAtendimentoText, tipoAtendimento === 'menor' && styles.tipoAtendimentoTextSelected]}>Dependente</Text>
                        </TouchableOpacity>
                    </View>

                    {tipoAtendimento === 'menor' && (
                        <View style={{ marginTop: 16 }}>
                            {menores.length === 0 ? (
                                <View style={styles.emptyBox}>
                                    <Text style={styles.emptyBoxText}>Você ainda não cadastrou nenhum dependente.</Text>
                                    <TouchableOpacity
                                        style={styles.linkButton}
                                        onPress={() => navigation.navigate('CadastroMenor')}
                                    >
                                        <Text style={styles.linkButtonText}>Cadastrar Dependente</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                menores.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.menorCard, menorSelecionado?.id === item.id && styles.menorCardSelected]}
                                        onPress={() => setMenorSelecionado(item)}
                                    >
                                        <View style={styles.menorAvatar}>
                                            <Text style={styles.menorAvatarText}>{item.nome?.charAt(0)}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.menorNome}>{item.nome}</Text>
                                            <Text style={styles.menorInfo}>{item.parentesco} • {item.idade} anos</Text>
                                        </View>
                                        {menorSelecionado?.id === item.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}

                    <Text style={styles.sectionLabel}>Data e Horário</Text>
                    <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                        <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                        <Text style={styles.dateSelectorText}>{formatarDataExibicao(date)}</Text>
                        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                    </TouchableOpacity>

                    {showPicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            minimumDate={new Date()}
                            onChange={(event, selectedDate) => {
                                setShowPicker(false);
                                if (selectedDate) setDate(selectedDate);
                            }}
                        />
                    )}

                    <Text style={styles.sectionLabel}>Profissional</Text>
                    <View style={styles.colabSection}>
                        {colaboradoresDisponivelNoDia.map((colab) => (
                            <TouchableOpacity
                                key={colab.id}
                                style={[styles.colabCard, colaboradorEscolhido?.id === colab.id && styles.colabSelected]}
                                onPress={() => setColaboradorEscolhido(colab)}
                            >
                                <View style={[styles.colabAvatar, colaboradorEscolhido?.id === colab.id && styles.colabAvatarSelected]}>
                                    <Text style={[styles.colabAvatarText, colaboradorEscolhido?.id === colab.id && { color: '#FFF' }]}>
                                        {colab.nome?.charAt(0)}
                                    </Text>
                                </View>
                                <View style={styles.colabInfo}>
                                    <Text style={styles.colabNome}>{colab.nome}</Text>
                                </View>
                                {colaboradorEscolhido?.id === colab.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.formColumn}>
                    <Text style={styles.sectionLabel}>Horários Disponíveis</Text>
                    <View style={styles.horariosLegenda}>
                        <View style={styles.legendaItem}>
                            <View style={[styles.legendaDot, { backgroundColor: colors.primary }]} />
                            <Text style={styles.legendaText}>Livre</Text>
                        </View>
                        <View style={styles.legendaItem}>
                            <View style={[styles.legendaDot, { backgroundColor: '#E2E8F0' }]} />
                            <Text style={styles.legendaText}>Ocupado</Text>
                        </View>
                    </View>

                    <View style={styles.horariosGrid}>
                        {todosHorariosDodia.map((h) => {
                            const estado = getEstadoHorario(h);
                            const isSelected = horarioSelecionado === h;

                            return (
                                <TouchableOpacity
                                    key={h}
                                    disabled={estado !== 'livre'}
                                    style={[
                                        styles.horaChip,
                                        estado === 'livre' && styles.horaChipLivre,
                                        estado === 'ocupado' && styles.horaChipOcupado,
                                        estado === 'passado' && styles.horaChipIndisponivel,
                                        isSelected && styles.horaChipSelected,
                                    ]}
                                    onPress={() => setHorarioSelecionado(h)}
                                >
                                    <Text style={[
                                        styles.horaChipText,
                                        estado === 'livre' && styles.horaChipTextLivre,
                                        estado === 'ocupado' && styles.horaChipTextOcupado,
                                        isSelected && styles.horaChipTextSelected,
                                    ]}>{h}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        {todosHorariosDodia.length === 0 && (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyBoxText}>Nenhum horário disponível para este profissional neste dia.</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.sectionLabel}>Forma de Pagamento</Text>
                    <View style={styles.paymentList}>
                        {FORMAS_PAGAMENTO.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.paymentCard, formaPagamento === item.id && styles.paymentCardSelected]}
                                onPress={() => setFormaPagamento(item.id)}
                            >
                                <View style={styles.paymentIconArea}>
                                    <Ionicons name={item.icon} size={22} color={formaPagamento === item.id ? colors.primary : '#64748B'} />
                                </View>
                                <View style={styles.paymentTextArea}>
                                    <Text style={[styles.paymentTitle, formaPagamento === item.id && styles.paymentTitleSelected]}>{item.titulo}</Text>
                                    <Text style={[styles.paymentDescription, formaPagamento === item.id && styles.paymentDescriptionSelected]}>{item.descricao}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmButton, (loading || !horarioSelecionado || !colaboradorEscolhido) && styles.confirmButtonDisabled]}
                        disabled={loading || !horarioSelecionado || !colaboradorEscolhido}
                        onPress={finalizar}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-circle" size={24} color="#FFF" />
                                <Text style={styles.confirmButtonText}>CONFIRMAR AGENDAMENTO</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );

    if (loadingInicial) {
        return (
            <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando horários...</Text>
            </View>
        );
    }

    return (
        <View style={styles.screenContainer}>
            {isLargeScreen ? (
                <View style={styles.webLayout}>
                    <Sidebar navigation={navigation} activeRoute="BuscaProfissionais" />
                    <View style={styles.webContentArea}>
                        {MainContent}
                    </View>
                </View>
            ) : (
                <SafeAreaView style={styles.mainContainer}>
                    {MainContent}
                </SafeAreaView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    webLayout: {
        flex: 1,
        flexDirection: 'row',
        height: '100vh',
        overflow: 'hidden',
    },
    webContentArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        height: '100%',
        display: 'flex',
        overflow: Platform.OS === 'web' ? 'auto' : 'hidden',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        flex: 1,
        height: Platform.OS === 'web' ? '100%' : 'auto',
    },
    contentPadding: {
        paddingBottom: 40,
    },
    contentLarge: {
        maxWidth: 1200,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 40,
        paddingTop: 32,
    },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
    },
    headerInfo: {
        padding: 24,
        backgroundColor: colors.primary,
        borderRadius: 24,
        marginHorizontal: 16,
        marginTop: 16,
        elevation: 6,
        shadowColor: colors.primary,
        shadowOpacity: 0.15,
        shadowRadius: 12,
        overflow: 'hidden',
    },
    headerInfoLarge: {
        marginHorizontal: 0,
        padding: 32,
    },
    headerCircle: {
        position: 'absolute',
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.08)',
        top: -34,
        right: -18,
    },
    headerCircleTwo: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.06)',
        bottom: -18,
        left: -10,
    },
    headerContent: {
        zIndex: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
    },
    subtitle: {
        marginTop: 4,
        fontSize: 14,
        color: 'rgba(255,255,255,0.84)',
    },
    subtitleClinic: {
        marginTop: 4,
        fontSize: 14,
        color: '#FFF',
        fontWeight: '700',
    },
    resumeCard: {
        marginHorizontal: 16,
        marginTop: 16,
        backgroundColor: colors.primary,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    resumeCardLarge: {
        marginHorizontal: 0,
    },
    resumeLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    resumeValue: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
        marginTop: 4,
    },
    formGrid: {
        paddingHorizontal: 16,
    },
    formGridLarge: {
        flexDirection: 'row',
        paddingHorizontal: 0,
        gap: 24,
        marginTop: 24,
    },
    formColumn: {
        flex: 1,
    },
    sectionLabel: {
        marginTop: 24,
        marginBottom: 12,
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginLeft: 4,
    },
    tipoAtendimentoRow: {
        flexDirection: 'row',
        gap: 12,
    },
    tipoAtendimentoCard: {
        flex: 1,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#FFF',
    },
    tipoAtendimentoCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },
    tipoAtendimentoText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
    },
    tipoAtendimentoTextSelected: {
        color: colors.primary,
    },
    emptyBox: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
    },
    emptyBoxText: {
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    linkButton: {
        marginTop: 16,
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    linkButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },
    menorCard: {
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    menorCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}05`,
    },
    menorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menorAvatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.primary,
    },
    menorNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    menorInfo: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    obsContainer: {
        marginBottom: 12,
    },
    obsInput: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        fontSize: 15,
        color: '#1E293B',
    },
    obsHint: {
        marginTop: 8,
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 4,
    },
    dateSelector: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    dateSelectorText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    paymentList: {
        gap: 12,
    },
    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    paymentCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}05`,
    },
    paymentIconArea: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    paymentTextArea: {
        flex: 1,
    },
    paymentTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    paymentTitleSelected: {
        color: colors.primary,
    },
    paymentDescription: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    paymentDescriptionSelected: {
        color: '#64748B',
    },
    paymentInfoBox: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFBEB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },
    paymentInfoText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 20,
    },
    colabSection: {
        gap: 12,
    },
    colabCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    colabSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}05`,
    },
    colabAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    colabAvatarSelected: {
        backgroundColor: colors.primary,
    },
    colabAvatarText: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.primary,
    },
    colabInfo: {
        flex: 1,
    },
    colabNome: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    horariosLegenda: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
        marginLeft: 4,
    },
    legendaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendaDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendaText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    horariosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    horaChip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFF',
        minWidth: 80,
        alignItems: 'center',
    },
    horaChipLivre: {
        borderColor: colors.primary,
    },
    horaChipOcupado: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
        opacity: 0.6,
    },
    horaChipIndisponivel: {
        backgroundColor: '#F1F5F9',
        borderColor: '#E2E8F0',
        opacity: 0.4,
    },
    horaChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    horaChipText: {
        fontWeight: '700',
        fontSize: 14,
        color: '#64748B',
    },
    horaChipTextLivre: {
        color: colors.primary,
    },
    horaChipTextOcupado: {
        textDecorationLine: 'line-through',
    },
    horaChipTextSelected: {
        color: '#FFF',
    },
    confirmButton: {
        marginTop: 32,
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    confirmButtonDisabled: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
        elevation: 0,
    },
    confirmButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 16,
        marginLeft: 10,
    },
});
