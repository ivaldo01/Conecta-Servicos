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
                where("status", "in", ["pendente", "confirmado", "concluido"])
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
        const fazServicos = servicos.every((s) =>
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
            const fazServicos = servicos.every((s) =>
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
            const fazServicos = servicos.every((s) =>
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
        const fazServicos = servicos.every((s) =>
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

                <Text style={styles.sectionLabel}>Quem será atendido?</Text>

                <View style={styles.tipoAtendimentoRow}>
                    <TouchableOpacity
                        style={[
                            styles.tipoAtendimentoCard,
                            tipoAtendimento === 'cliente' && styles.tipoAtendimentoCardSelected,
                        ]}
                        onPress={() => {
                            setTipoAtendimento('cliente');
                            setMenorSelecionado(null);
                        }}
                    >
                        <Ionicons
                            name="person-outline"
                            size={20}
                            color={tipoAtendimento === 'cliente' ? '#FFF' : colors.primary}
                        />
                        <Text
                            style={[
                                styles.tipoAtendimentoText,
                                tipoAtendimento === 'cliente' && styles.tipoAtendimentoTextSelected,
                            ]}
                        >
                            Para mim
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.tipoAtendimentoCard,
                            tipoAtendimento === 'menor' && styles.tipoAtendimentoCardSelected,
                        ]}
                        onPress={() => setTipoAtendimento('menor')}
                    >
                        <Ionicons
                            name="people-outline"
                            size={20}
                            color={tipoAtendimento === 'menor' ? '#FFF' : colors.primary}
                        />
                        <Text
                            style={[
                                styles.tipoAtendimentoText,
                                tipoAtendimento === 'menor' && styles.tipoAtendimentoTextSelected,
                            ]}
                        >
                            Para menor
                        </Text>
                    </TouchableOpacity>
                </View>

                {tipoAtendimento === 'menor' && (
                    <>
                        <Text style={styles.sectionLabel}>Selecione o dependente</Text>

                        {menores.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Text style={styles.emptyBoxText}>
                                    Você ainda não tem dependentes cadastrados.
                                </Text>

                                <TouchableOpacity
                                    style={styles.linkButton}
                                    onPress={() => navigation.navigate('CadastroMenor')}
                                >
                                    <Text style={styles.linkButtonText}>Cadastrar dependente</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            menores.map((menor) => {
                                const selecionado = menorSelecionado?.id === menor.id;

                                return (
                                    <TouchableOpacity
                                        key={menor.id}
                                        style={[
                                            styles.menorCard,
                                            selecionado && styles.menorCardSelected,
                                        ]}
                                        onPress={() => setMenorSelecionado(menor)}
                                        activeOpacity={0.88}
                                    >
                                        <View style={styles.menorAvatar}>
                                            <Text style={styles.menorAvatarText}>
                                                {menor?.nome?.charAt(0)?.toUpperCase() || 'M'}
                                            </Text>
                                        </View>

                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.menorNome}>
                                                {menor.nome || 'Dependente'}
                                            </Text>
                                            <Text style={styles.menorInfo}>
                                                Idade: {menor.idade || '-'}
                                            </Text>
                                        </View>

                                        <Ionicons
                                            name={selecionado ? 'radio-button-on' : 'radio-button-off'}
                                            size={22}
                                            color={selecionado ? colors.primary : colors.border}
                                        />
                                    </TouchableOpacity>
                                );
                            })
                        )}

                        <Text style={styles.sectionLabel}>Necessidades Especiais / Observações</Text>
                        <View style={styles.obsContainer}>
                            <TextInput
                                style={styles.obsInput}
                                placeholder="Ex: Possui autismo, alergia a algum produto, dificuldade de locomoção, etc."
                                placeholderTextColor="#A0A0A0"
                                multiline
                                numberOfLines={4}
                                value={observacoesMenor}
                                onChangeText={setObservacoesMenor}
                                textAlignVertical="top"
                            />
                            <Text style={styles.obsHint}>
                                Informe detalhes que ajudem o profissional a oferecer o melhor atendimento.
                            </Text>
                        </View>
                    </>
                )}

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

                {/* ── 1. ESCOLHA DO PROFISSIONAL ── */}
                <Text style={styles.sectionLabel}>Escolha o Profissional</Text>

                {!servicos.length ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Nenhum serviço foi enviado para o agendamento.
                        </Text>
                    </View>
                ) : colaboradoresDisponivelNoDia.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Nenhum profissional disponível para este serviço nesta data.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.colabSection}>
                        {colaboradoresDisponivelNoDia.map((colab) => {
                            const selecionado = colaboradorEscolhido?.id === colab.id;

                            return (
                                <TouchableOpacity
                                    key={colab.id}
                                    style={[
                                        styles.colabCard,
                                        selecionado && styles.colabSelected,
                                    ]}
                                    onPress={() => {
                                        setColaboradorEscolhido(colab);
                                        setHorarioSelecionado(null);
                                    }}
                                >
                                    <View
                                        style={[
                                            styles.colabAvatar,
                                            selecionado && styles.colabAvatarSelected,
                                        ]}
                                    >
                                        <Text style={styles.colabAvatarText}>
                                            {(colab.nome || 'P').charAt(0).toUpperCase()}
                                        </Text>
                                    </View>

                                    <View style={styles.colabInfo}>
                                        <Text style={styles.colabNome}>{colab.nome}</Text>
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
                )}

                {/* ── 2. HORÁRIOS DO PROFISSIONAL SELECIONADO ── */}
                <Text style={styles.sectionLabel}>Horários</Text>

                {!colaboradorEscolhido ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Selecione um profissional acima para ver os horários disponíveis.
                        </Text>
                    </View>
                ) : todosHorariosDodia.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyBoxText}>
                            Este profissional não possui horários configurados para esta data.
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.horariosLegenda}>
                            <View style={styles.legendaItem}>
                                <View style={[styles.legendaDot, { backgroundColor: '#E8F5E9' }]} />
                                <Text style={styles.legendaText}>Disponível</Text>
                            </View>
                            <View style={styles.legendaItem}>
                                <View style={[styles.legendaDot, { backgroundColor: '#FFEBEE' }]} />
                                <Text style={styles.legendaText}>Ocupado</Text>
                            </View>
                            <View style={styles.legendaItem}>
                                <View style={[styles.legendaDot, { backgroundColor: '#F5F5F5' }]} />
                                <Text style={styles.legendaText}>Passado</Text>
                            </View>
                        </View>

                        <View style={styles.horariosGrid}>
                            {todosHorariosDodia.map((h) => {
                                const estado = getEstadoHorario(h);
                                const selecionado = horarioSelecionado === h;
                                const clicavel = estado === 'livre';

                                return (
                                    <TouchableOpacity
                                        key={h}
                                        disabled={!clicavel}
                                        activeOpacity={clicavel ? 0.7 : 1}
                                        style={[
                                            styles.horaChip,
                                            estado === 'livre' && styles.horaChipLivre,
                                            estado === 'ocupado' && styles.horaChipOcupado,
                                            estado === 'passado' && styles.horaChipIndisponivel,
                                            selecionado && styles.horaChipSelected,
                                        ]}
                                        onPress={() => setHorarioSelecionado(h)}
                                    >
                                        <Text
                                            style={[
                                                styles.horaChipText,
                                                estado === 'livre' && styles.horaChipTextLivre,
                                                estado === 'ocupado' && styles.horaChipTextOcupado,
                                                estado === 'passado' && styles.horaChipTextIndisponivel,
                                                selecionado && styles.horaChipTextSelected,
                                            ]}
                                        >
                                            {h}
                                        </Text>
                                        {estado === 'ocupado' && (
                                            <Text style={styles.horaChipOcupadoLabel}>Ocupado</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}

                <TouchableOpacity
                    style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
                    onPress={finalizar}
                    disabled={loading}
                    activeOpacity={0.9}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#FFF" />
                            <Text style={styles.confirmButtonText}>CONFIRMAR AGENDAMENTO</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    container: {
        flex: 1,
    },

    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F8FA',
    },

    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 14,
    },

    headerInfo: {
        padding: 24,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderColor: '#EEE',
    },

    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1A1A2E',
    },

    subtitle: {
        marginTop: 4,
        fontSize: 14,
        color: '#666',
    },

    subtitleClinic: {
        marginTop: 2,
        fontSize: 13,
        color: colors.primary,
        fontWeight: '700',
    },

    resumeCard: {
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: colors.primary,
        borderRadius: 18,
        padding: 20,
        alignItems: 'center',
    },

    resumeLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },

    resumeValue: {
        color: '#FFF',
        fontSize: 30,
        fontWeight: '800',
        marginTop: 4,
    },

    sectionLabel: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 10,
        fontSize: 15,
        fontWeight: '800',
        color: '#333',
    },

    tipoAtendimentoRow: {
        flexDirection: 'row',
        marginHorizontal: 20,
        gap: 12,
    },

    tipoAtendimentoCard: {
        flex: 1,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },

    tipoAtendimentoCardSelected: {
        backgroundColor: colors.primary,
    },

    tipoAtendimentoText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },

    tipoAtendimentoTextSelected: {
        color: '#FFF',
    },

    emptyBox: {
        marginHorizontal: 20,
        backgroundColor: '#F0F4FF',
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
    },

    emptyBoxText: {
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },

    linkButton: {
        marginTop: 12,
        backgroundColor: colors.primary,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
    },

    linkButtonText: {
        color: '#FFF',
        fontWeight: '700',
    },

    menorCard: {
        marginHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 2,
        borderColor: '#EEF1F4',
        elevation: 1,
    },

    menorCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },

    menorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    menorAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },

    menorNome: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A2E',
    },

    menorInfo: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },

    obsContainer: {
        marginHorizontal: 20,
    },

    obsInput: {
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#E4EAF1',
        fontSize: 14,
        color: '#333',
    },

    obsHint: {
        marginTop: 6,
        fontSize: 12,
        color: '#999',
        lineHeight: 16,
    },

    dateSelector: {
        marginHorizontal: 20,
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E4EAF1',
        elevation: 1,
    },

    dateSelectorText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
        textTransform: 'capitalize',
    },

    paymentList: {
        marginHorizontal: 20,
    },

    paymentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#EEF1F4',
        elevation: 1,
    },

    paymentCardSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },

    paymentIconArea: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}15`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    paymentTextArea: {
        flex: 1,
    },

    paymentTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A2E',
    },

    paymentTitleSelected: {
        color: colors.primary,
    },

    paymentDescription: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },

    paymentDescriptionSelected: {
        color: `${colors.primary}AA`,
    },

    paymentInfoBox: {
        marginHorizontal: 20,
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },

    paymentInfoText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: '#8A6D3B',
        lineHeight: 18,
    },

    horariosGrid: {
        marginHorizontal: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },

    horaChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
    },

    horaChipLivre: {
        borderColor: colors.primary,
        backgroundColor: '#FFF',
    },

    horaChipIndisponivel: {
        borderColor: '#DDD',
        backgroundColor: '#F5F5F5',
        opacity: 0.6,
    },

    horaChipOcupado: {
        borderColor: '#FFCDD2',
        backgroundColor: '#FFEBEE',
    },

    horaChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },

    horaChipText: {
        fontWeight: '700',
        fontSize: 14,
    },

    horaChipTextLivre: {
        color: colors.primary,
    },

    horaChipTextIndisponivel: {
        color: '#BBB',
    },

    horaChipTextOcupado: {
        color: '#E57373',
        textDecorationLine: 'line-through',
    },

    horaChipTextSelected: {
        color: '#FFF',
    },

    horaChipOcupadoLabel: {
        fontSize: 9,
        color: '#E57373',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 2,
        letterSpacing: 0.3,
    },

    horariosLegenda: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginHorizontal: 20,
        marginBottom: 10,
    },

    legendaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },

    legendaDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DDD',
    },

    legendaText: {
        fontSize: 11,
        color: '#888',
        fontWeight: '500',
    },

    colabSection: {
        marginTop: 4,
    },

    colabCard: {
        marginHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 14,
        borderWidth: 2,
        borderColor: '#EEF1F4',
        elevation: 1,
    },

    colabSelected: {
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}08`,
    },

    colabDisabled: {
        borderColor: '#EEE',
        backgroundColor: '#FAFAFA',
        opacity: 0.6,
    },

    colabAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: `${colors.primary}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    colabAvatarSelected: {
        backgroundColor: `${colors.primary}30`,
    },

    colabAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.primary,
    },

    colabInfo: {
        flex: 1,
    },

    colabNome: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1A1A2E',
    },

    colabNomeDisabled: {
        color: '#999',
    },

    colabMsg: {
        fontSize: 12,
        color: '#E67E22',
        marginTop: 2,
    },

    confirmButton: {
        marginHorizontal: 20,
        marginTop: 24,
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },

    confirmButtonDisabled: {
        opacity: 0.7,
    },

    confirmButtonText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15,
        marginLeft: 8,
    },
});
