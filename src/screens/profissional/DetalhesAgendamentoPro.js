import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from "../../services/firebaseConfig";
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Ionicons } from '@expo/vector-icons';
import colors from "../../constants/colors";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useUsuario } from '../../hooks/useUsuario';
import {
    enviarPushAoCliente,
    salvarNotificacaoCliente,
    salvarNotificacaoSistema,
} from "../../utils/notificationUtils";
import {
    buscarCobrancaPorAgendamento,
    calcularValorTotalAgendamento,
    gerarCobrancaAgendamento,
} from '../../services/paymentService';
import { liberarHorario } from '../../utils/agendaDisponibilidade';

function getStatusConfig(status) {
    switch (status) {
        case 'confirmado':
            return {
                cor: '#27AE60',
                bg: '#EAF7ED',
                label: 'CONFIRMADO',
                icon: 'checkmark-circle-outline',
            };
        case 'cancelado':
            return {
                cor: '#6c757d',
                bg: '#F1F3F5',
                label: 'CANCELADO',
                icon: 'close-circle-outline',
            };
        case 'recusado':
            return {
                cor: '#C62828',
                bg: '#FDECEC',
                label: 'RECUSADO',
                icon: 'ban-outline',
            };
        case 'concluido':
            return {
                cor: '#1565C0',
                bg: '#EAF2FE',
                label: 'CONCLUÍDO',
                icon: 'checkmark-done-outline',
            };
        default:
            return {
                cor: '#E67E22',
                bg: '#FFF4E5',
                label: 'PENDENTE',
                icon: 'time-outline',
            };
    }
}

function getStatusPagamentoConfig(statusPagamento) {
    switch (statusPagamento) {
        case 'gerada':
            return {
                cor: '#FF9800',
                bg: '#FFF4E5',
                label: 'COBRANÇA GERADA',
                icon: 'receipt-outline',
            };
        case 'pago':
            return {
                cor: '#27AE60',
                bg: '#EAF7ED',
                label: 'PAGO',
                icon: 'checkmark-circle-outline',
            };
        case 'cancelado':
            return {
                cor: '#6c757d',
                bg: '#F1F3F5',
                label: 'CANCELADO',
                icon: 'close-circle-outline',
            };
        case 'vencido':
            return {
                cor: '#C62828',
                bg: '#FDECEC',
                label: 'VENCIDO',
                icon: 'alert-circle-outline',
            };
        case 'aguardando_cobranca':
        default:
            return {
                cor: '#5D6D7E',
                bg: '#EEF2F6',
                label: 'AGUARDANDO COBRANÇA',
                icon: 'time-outline',
            };
    }
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

function getNomeProfissional(agendamento) {
    return (
        agendamento?.colaboradorNome ||
        agendamento?.clinicaNome ||
        'Profissional'
    );
}

function getFormaPagamentoLabel(agendamento) {
    if (agendamento?.formaPagamentoLabel) {
        return agendamento.formaPagamentoLabel;
    }

    switch (agendamento?.formaPagamento) {
        case 'boleto':
            return 'Boleto';
        case 'cartao_credito':
            return 'Cartão de crédito';
        case 'cartao_debito':
            return 'Cartão de débito';
        case 'pix':
        default:
            return 'Pix';
    }
}

function formatarDataHora(timestamp) {
    if (!timestamp) return 'Ainda não gerada';

    try {
        if (typeof timestamp?.toDate === 'function') {
            return timestamp.toDate().toLocaleString('pt-BR');
        }

        if (timestamp instanceof Date) {
            return timestamp.toLocaleString('pt-BR');
        }

        if (typeof timestamp === 'string') {
            return timestamp;
        }

        return 'Data indisponível';
    } catch (error) {
        return 'Data indisponível';
    }
}

function getMensagemStatusPagamento(status) {
    switch (status) {
        case 'pago':
            return 'Pagamento confirmado com sucesso.';
        case 'cancelado':
            return 'Cobrança cancelada.';
        case 'vencido':
            return 'Cobrança marcada como vencida.';
        case 'gerada':
            return 'Cobrança gerada e aguardando pagamento.';
        case 'aguardando_cobranca':
        default:
            return 'Aguardando geração da cobrança.';
    }
}

function getResumoServicos(agendamento) {
    if (!agendamento?.servicos || agendamento.servicos.length === 0) {
        return 'Nenhum serviço informado';
    }

    if (agendamento.servicos.length === 1) {
        return agendamento.servicos[0]?.nome || 'Serviço';
    }

    return `${agendamento.servicos[0]?.nome || 'Serviço'} +${agendamento.servicos.length - 1}`;
}

export default function DetalhesAgendamentoPro({ route, navigation }) {
    const [agendamentoAtual, setAgendamentoAtual] = useState(route?.params?.agendamento || null);
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    const [loadingAcao, setLoadingAcao] = useState(false);
    const [loadingCobranca, setLoadingCobranca] = useState(false);
    const [pagamentoGerado, setPagamentoGerado] = useState(null);

    const statusConfig = useMemo(
        () => getStatusConfig(agendamentoAtual?.status),
        [agendamentoAtual?.status]
    );

    const statusPagamentoConfig = useMemo(
        () => getStatusPagamentoConfig(agendamentoAtual?.statusPagamento),
        [agendamentoAtual?.statusPagamento]
    );

    const totalAgendamento = useMemo(() => {
        return calcularValorTotalAgendamento(agendamentoAtual);
    }, [agendamentoAtual]);

    useEffect(() => {
        const carregarPerfil = async () => {
            const user = auth.currentUser;
            if (user) {
                const snap = await getDoc(doc(db, 'usuarios', user.uid));
                if (snap.exists()) {
                    setPerfilUsuario(snap.data());
                }
            }
        };
        carregarPerfil();
    }, []);

    const resumoServicos = useMemo(() => {
        return getResumoServicos(agendamentoAtual);
    }, [agendamentoAtual]);

    const ehChefe = perfilUsuario?.perfil !== 'colaborador';

    const podeConfirmar = agendamentoAtual?.status === 'pendente';
    const podeRecusar = agendamentoAtual?.status === 'pendente';
    const podeConcluir = agendamentoAtual?.status === 'confirmado';
    const cobrancaJaGerada = !!agendamentoAtual?.cobrancaGerada || !!agendamentoAtual?.pagamentoId;
    const podeControlarCobranca = cobrancaJaGerada && ehChefe;
    const pagamentoJaConfirmado = agendamentoAtual?.statusPagamento === 'pago';
    const pagamentoCancelado = agendamentoAtual?.statusPagamento === 'cancelado';

    const abrirWhatsAppCliente = async () => {
        const tel =
            agendamentoAtual?.clienteWhatsapp?.replace(/\D/g, "") ||
            agendamentoAtual?.telefoneCliente?.replace(/\D/g, "") ||
            "";

        if (!tel) {
            Alert.alert("Aviso", "Número do cliente não disponível.");
            return;
        }

        const nomeCliente = agendamentoAtual?.clienteNome || 'Cliente';
        const mensagem = encodeURIComponent(
            `Olá, ${nomeCliente}! Estou entrando em contato sobre o seu agendamento de ${agendamentoAtual?.data || 'data não informada'} às ${agendamentoAtual?.horario || '--:--'}.`
        );

        const url = `https://wa.me/55${tel}?text=${mensagem}`;

        try {
            const supported = await Linking.canOpenURL(url);

            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
            }
        } catch (error) {
            console.log("Erro ao abrir WhatsApp:", error);
            Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
        }
    };

    const enviarNotificacaoCompletaParaCliente = async (novoStatus) => {
        if (!agendamentoAtual?.clienteId) return;

        const profissionalNome = getNomeProfissional(agendamentoAtual);

        await salvarNotificacaoCliente({
            clienteId: agendamentoAtual.clienteId,
            status: novoStatus,
            agendamentoId: agendamentoAtual?.id || null,
            profissionalId: agendamentoAtual?.colaboradorId || agendamentoAtual?.clinicaId || null,
            profissionalNome,
        });

        const pushTokenCliente =
            agendamentoAtual?.clientePushToken ||
            '';

        if (!pushTokenCliente) return;

        if (novoStatus === 'concluido') {
            await enviarPushAoCliente(pushTokenCliente, novoStatus, {
                screen: 'AvaliarAtendimento',
                root: '',
                params: { agendamento: agendamentoAtual },
            });
            return;
        }

        await enviarPushAoCliente(pushTokenCliente, novoStatus, {
            screen: 'MeusAgendamentosCliente',
            root: 'Main',
            params: {},
        });
    };

    const tentarLiberarHorario = async () => {
        try {
            await liberarHorario({
                clinicaId: agendamentoAtual?.clinicaId,
                data: agendamentoAtual?.dataFiltro,
                horario: agendamentoAtual?.horario,
                colaboradorId: agendamentoAtual?.colaboradorId,
            });
        } catch (erroLiberar) {
            console.log('Aviso: erro ao liberar horário (pode já estar liberado):', erroLiberar);
        }
    };

    const atualizarStatus = async (novoStatus) => {
        if (!agendamentoAtual?.id) {
            Alert.alert("Erro", "Agendamento inválido.");
            return;
        }

        try {
            setLoadingAcao(true);

            const dadosUpdate = {
                status: novoStatus,
                atualizadoEm: serverTimestamp(),
                atualizadoPor: auth.currentUser?.uid || null,
            };

            if (novoStatus === 'confirmado') {
                dadosUpdate.confirmadoEm = serverTimestamp();
            }

            if (novoStatus === 'recusado') {
                dadosUpdate.recusadoEm = serverTimestamp();
            }

            if (novoStatus === 'cancelado') {
                dadosUpdate.canceladoEm = serverTimestamp();
            }

            if (novoStatus === 'concluido') {
                dadosUpdate.concluidoEm = serverTimestamp();
            }

            await updateDoc(doc(db, "agendamentos", agendamentoAtual.id), dadosUpdate);
            setAgendamentoAtual((prev) => ({ ...prev, ...dadosUpdate, status: novoStatus }));

            if (novoStatus === 'cancelado' || novoStatus === 'recusado') {
                await tentarLiberarHorario();
            }

            await enviarNotificacaoCompletaParaCliente(novoStatus);

            Alert.alert("Sucesso", "Status atualizado com sucesso.");
        } catch (error) {
            console.log("Erro ao atualizar status:", error);
            Alert.alert("Erro", "Não foi possível atualizar o status.");
        } finally {
            setLoadingAcao(false);
        }
    };

    const confirmarAgendamento = () => {
        Alert.alert(
            "Confirmar agendamento",
            "Deseja confirmar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, confirmar",
                    onPress: () => atualizarStatus('confirmado'),
                },
            ]
        );
    };

    const gerarPDFOrdemServico = async () => {
        try {
            setLoadingAcao(true);
            const status = getStatusConfig(agendamentoAtual?.status);
            const statusPg = getStatusPagamentoConfig(agendamentoAtual?.statusPagamento);

            const numeroOS = agendamentoAtual?.id
                ? parseInt(agendamentoAtual.id.replace(/\D/g, '').substring(0, 10) || Date.now().toString().substring(5, 15))
                : '000000';

            const servicosHTML = agendamentoAtual?.servicos?.map(s => `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <span>${s.nome}</span>
                    <span style="font-weight: bold;">R$ ${Number(s.preco || 0).toFixed(2)}</span>
                </div>
            `).join('') || '';

            const html = `
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid ${colors.primary}; padding-bottom: 20px; margin-bottom: 30px; }
                        .title { font-size: 24px; font-weight: bold; color: ${colors.primary}; margin-bottom: 5px; }
                        .subtitle { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
                        .section { margin-bottom: 25px; }
                        .section-title { font-size: 16px; font-weight: bold; background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px; border-left: 4px solid ${colors.primary}; }
                        .info-row { display: flex; margin-bottom: 8px; }
                        .info-label { width: 140px; font-weight: bold; color: #666; }
                        .info-value { flex: 1; color: #333; }
                        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                        .status-badge { display: inline-block; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                        .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
                        .sig-box { width: 45%; text-align: center; }
                        .sig-line { border-top: 1px solid #333; padding-top: 10px; font-size: 11px; font-weight: bold; }
                        .sig-name { font-size: 10px; color: #666; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">ORDEM DE SERVIÇO</div>
                        <div class="subtitle">Nº OS: ${numeroOS}</div>
                    </div>

                    <div class="section">
                        <div class="section-title">DADOS DO CLIENTE</div>
                        <div class="info-row"><div class="info-label">Nome:</div><div class="info-value">${agendamentoAtual?.clienteNome || 'Não informado'}</div></div>
                        <div class="info-row"><div class="info-label">WhatsApp:</div><div class="info-value">${agendamentoAtual?.clienteWhatsapp || 'Não informado'}</div></div>
                        ${agendamentoAtual?.tipoAtendimento === 'menor' ? `
                            <div class="info-row"><div class="info-label">Dependente:</div><div class="info-value">${agendamentoAtual?.menorNome || 'Não informado'}</div></div>
                            <div class="info-row"><div class="info-label">Idade:</div><div class="info-value">${agendamentoAtual?.menorIdade || '-'}</div></div>
                            <div class="info-row"><div class="info-label">Parentesco:</div><div class="info-value">${agendamentoAtual?.menorParentesco || '-'}</div></div>
                            ${agendamentoAtual?.observacoesMenor ? `
                                <div style="margin-top: 10px; padding: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 5px;">
                                    <div style="font-size: 10px; font-weight: bold; color: #92400e; margin-bottom: 5px;">NECESSIDADES / OBSERVAÇÕES:</div>
                                    <div style="font-size: 11px; color: #78350f; line-height: 1.4;">${agendamentoAtual.observacoesMenor}</div>
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">DETALHES DO ATENDIMENTO</div>
                        <div class="info-row"><div class="info-label">Data:</div><div class="info-value">${agendamentoAtual?.data || '--/--/----'}</div></div>
                        <div class="info-row"><div class="info-label">Horário:</div><div class="info-value">${agendamentoAtual?.horario || '--:--'}</div></div>
                        <div class="info-row">
                            <div class="info-label">Status:</div>
                            <div class="info-value">
                                <span class="status-badge" style="background: ${status.bg}; color: ${status.color};">${status.label}</span>
                            </div>
                        </div>
                        <div class="info-row"><div class="info-label">Profissional:</div><div class="info-value">${agendamentoAtual?.colaboradorNome || 'Não atribuído'}</div></div>
                    </div>

                    <div class="section">
                        <div class="section-title">SERVIÇOS REALIZADOS</div>
                        ${servicosHTML}
                        <div style="display: flex; justify-content: space-between; padding: 15px 0; margin-top: 10px; font-size: 18px; font-weight: bold; color: ${colors.primary};">
                            <span>TOTAL</span>
                            <span>R$ ${totalAgendamento.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMAÇÕES DE PAGAMENTO</div>
                        <div class="info-row"><div class="info-label">Método:</div><div class="info-value">${getFormaPagamentoLabel(agendamentoAtual)}</div></div>
                        <div class="info-row">
                            <div class="info-label">Status:</div>
                            <div class="info-value">
                                <span class="status-badge" style="background: ${statusPg.bg}; color: ${statusPg.cor};">${statusPg.label}</span>
                            </div>
                        </div>
                    </div>

                    <div class="signatures">
                        <div class="sig-box">
                            <div class="sig-line">ASSINATURA DO PROFISSIONAL</div>
                            <div class="sig-name">${agendamentoAtual?.colaboradorNome || 'Responsável Técnico'}</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-line">ASSINATURA DO CLIENTE</div>
                            <div class="sig-name">${agendamentoAtual?.clienteNome || 'Contratante'}</div>
                        </div>
                    </div>

                    <div class="footer">
                        Documento gerado em ${new Date().toLocaleString('pt-BR')}<br/>
                        ${getNomeProfissional(agendamentoAtual)} - Sistema de Gestão Conecta Serviços
                    </div>
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ordem de Serviço' });
        } catch (error) {
            console.log("Erro ao gerar PDF:", error);
            Alert.alert("Erro", "Não foi possível gerar a Ordem de Serviço.");
        } finally {
            setLoadingAcao(false);
        }
    };

    const recusarAgendamento = () => {
        Alert.alert(
            "Recusar agendamento",
            "Deseja recusar este agendamento?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, recusar",
                    style: "destructive",
                    onPress: () => atualizarStatus('recusado'),
                },
            ]
        );
    };

    const concluirAgendamento = () => {
        Alert.alert(
            "Concluir atendimento",
            "Deseja marcar este atendimento como concluído?",
            [
                { text: "Não", style: "cancel" },
                {
                    text: "Sim, concluir",
                    onPress: () => atualizarStatus('concluido'),
                },
            ]
        );
    };

    const notificarClienteSobreCobranca = async (dadosPagamento) => {
        if (!agendamentoAtual?.clienteId) return;

        await salvarNotificacaoSistema({
            userId: agendamentoAtual.clienteId,
            titulo: 'Cobrança gerada 💳',
            mensagem: `O profissional gerou a cobrança de ${formatarMoeda(dadosPagamento?.valorCobrado || totalAgendamento)} para o seu agendamento. Forma escolhida: ${getFormaPagamentoLabel(agendamentoAtual)}.`,
            screen: 'MeusAgendamentosCliente',
            root: 'Main',
            params: {},
        });
    };

    const carregarCobrancaExistente = async () => {
        if (!agendamentoAtual?.id) return;

        try {
            setLoadingCobranca(true);
            const cobranca = await buscarCobrancaPorAgendamento(agendamentoAtual.id);

            if (cobranca) {
                setPagamentoGerado(cobranca);
                setAgendamentoAtual((prev) => ({
                    ...prev,
                    pagamentoId: cobranca.id,
                    cobrancaGerada: true,
                    statusPagamento: cobranca.status || 'gerada',
                }));

                Alert.alert(
                    'Cobrança existente',
                    `Esta cobrança já foi criada.\n\nMétodo: ${cobranca.formaPagamentoLabel || 'Pix'}\nValor: ${formatarMoeda(cobranca.valorCobrado)}\nStatus: ${getStatusPagamentoConfig(cobranca.status).label}`
                );
            }
        } catch (error) {
            console.log('Erro ao buscar cobrança existente:', error);
        } finally {
            setLoadingCobranca(false);
        }
    };

    const confirmarGeracaoCobranca = async () => {
        if (!agendamentoAtual?.id) {
            Alert.alert('Erro', 'Agendamento inválido.');
            return;
        }

        try {
            setLoadingCobranca(true);

            const { pagamento, agendamentoAtualizado, jaExistia } = await gerarCobrancaAgendamento({
                agendamento: agendamentoAtual,
                profissionalId: auth.currentUser?.uid || null,
            });

            setPagamentoGerado(pagamento);
            setAgendamentoAtual(agendamentoAtualizado);

            if (!jaExistia) {
                await notificarClienteSobreCobranca(pagamento);
            }

            Alert.alert(
                jaExistia ? 'Cobrança já existia' : 'Cobrança gerada com sucesso',
                `Método: ${pagamento?.formaPagamentoLabel || getFormaPagamentoLabel(agendamentoAtualizado)}\nValor: ${formatarMoeda(pagamento?.valorCobrado || totalAgendamento)}\nStatus: ${getStatusPagamentoConfig(pagamento?.status || 'gerada').label}`
            );
        } catch (error) {
            console.log('Erro ao gerar cobrança:', error);
            Alert.alert('Erro', 'Não foi possível gerar a cobrança deste agendamento.');
        } finally {
            setLoadingCobranca(false);
        }
    };

    const gerarCobranca = async () => {
        if (cobrancaJaGerada) {
            await carregarCobrancaExistente();
            return;
        }

        if (agendamentoAtual?.status !== 'concluido') {
            Alert.alert(
                'Atenção',
                'Você só pode gerar a cobrança após marcar o serviço como concluído.'
            );
            return;
        }

        Alert.alert(
            'Gerar cobrança',
            `Deseja gerar a cobrança de ${formatarMoeda(totalAgendamento)} em ${getFormaPagamentoLabel(agendamentoAtual)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Gerar agora',
                    onPress: confirmarGeracaoCobranca,
                },
            ]
        );
    };

    const atualizarStatusCobranca = async (novoStatus) => {
        if (!agendamentoAtual?.id) {
            Alert.alert('Erro', 'Agendamento inválido.');
            return;
        }

        try {
            setLoadingCobranca(true);

            const pagamentoRef = doc(db, 'pagamentos', agendamentoAtual.id);
            const agendamentoRef = doc(db, 'agendamentos', agendamentoAtual.id);

            const dadosPagamento = {
                status: novoStatus,
                atualizadoEm: serverTimestamp(),
                atualizadoPor: auth.currentUser?.uid || null,
            };

            const dadosAgendamento = {
                statusPagamento: novoStatus,
                atualizadoEm: serverTimestamp(),
            };

            if (novoStatus === 'pago') {
                dadosPagamento.pagoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = true;
                dadosAgendamento.pagamentoConfirmadoEm = serverTimestamp();
            }

            if (novoStatus === 'cancelado') {
                dadosPagamento.canceladoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = false;
            }

            if (novoStatus === 'vencido') {
                dadosPagamento.vencimentoEm = serverTimestamp();
                dadosAgendamento.pagamentoConfirmado = false;
            }

            await updateDoc(pagamentoRef, dadosPagamento);
            await updateDoc(agendamentoRef, dadosAgendamento);

            const pagamentoAtualizado = {
                ...(pagamentoGerado || {}),
                ...dadosPagamento,
                status: novoStatus,
            };

            setPagamentoGerado(pagamentoAtualizado);
            setAgendamentoAtual((prev) => ({
                ...prev,
                ...dadosAgendamento,
                statusPagamento: novoStatus,
            }));

            if (agendamentoAtual?.clienteId) {
                await salvarNotificacaoSistema({
                    userId: agendamentoAtual.clienteId,
                    titulo: 'Atualização da cobrança 💳',
                    mensagem: `O status da sua cobrança foi atualizado para: ${getStatusPagamentoConfig(novoStatus).label}.`,
                    screen: 'PagamentoAgendamento',
                    root: 'Main',
                    params: {
                        agendamentoId: agendamentoAtual.id,
                    },
                });
            }

            Alert.alert('Sucesso', getMensagemStatusPagamento(novoStatus));
        } catch (error) {
            console.log('Erro ao atualizar status da cobrança:', error);
            Alert.alert('Erro', 'Não foi possível atualizar o status da cobrança.');
        } finally {
            setLoadingCobranca(false);
        }
    };

    const confirmarPagamento = () => {
        Alert.alert(
            'Confirmar pagamento',
            'Deseja marcar esta cobrança como paga?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, confirmar',
                    onPress: () => atualizarStatusCobranca('pago'),
                },
            ]
        );
    };

    const cancelarCobranca = () => {
        Alert.alert(
            'Cancelar cobrança',
            'Deseja cancelar esta cobrança?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: () => atualizarStatusCobranca('cancelado'),
                },
            ]
        );
    };

    const marcarCobrancaVencida = () => {
        Alert.alert(
            'Marcar como vencida',
            'Deseja marcar esta cobrança como vencida?',
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, marcar',
                    style: 'destructive',
                    onPress: () => atualizarStatusCobranca('vencido'),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="arrow-back" size={20} color={colors.textDark} />
                    </TouchableOpacity>

                    <View style={styles.headerTextArea}>
                        <Text style={styles.title}>Detalhes do Agendamento</Text>
                        <Text style={styles.subtitle}>Painel do profissional</Text>
                    </View>
                </View>

                <View style={styles.topSummaryCard}>
                    <View style={styles.topSummaryHeader}>
                        <View style={styles.clientAvatar}>
                            <Text style={styles.clientAvatarText}>
                                {(agendamentoAtual?.clienteNome || 'C').charAt(0).toUpperCase()}
                            </Text>
                        </View>

                        <View style={styles.topSummaryInfo}>
                            <Text style={styles.clientName}>
                                {agendamentoAtual?.clienteNome || "Cliente"}
                            </Text>
                            <Text style={styles.clientServiceResume}>
                                {resumoServicos}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.osButton}
                            onPress={gerarPDFOrdemServico}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                            <Text style={styles.osButtonText}>OS PDF</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.badgesRow}>
                        <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
                            <Ionicons
                                name={statusConfig.icon}
                                size={14}
                                color={statusConfig.cor}
                            />
                            <Text style={[styles.statusChipText, { color: statusConfig.cor }]}>
                                {statusConfig.label}
                            </Text>
                        </View>

                        <View style={[styles.statusChip, { backgroundColor: statusPagamentoConfig.bg }]}>
                            <Ionicons
                                name={statusPagamentoConfig.icon}
                                size={14}
                                color={statusPagamentoConfig.cor}
                            />
                            <Text style={[styles.statusChipText, { color: statusPagamentoConfig.cor }]}>
                                {statusPagamentoConfig.label}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Informações do agendamento</Text>

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>CLIENTE</Text>
                        <Text style={styles.value}>
                            {agendamentoAtual?.clienteNome || "Cliente"}
                        </Text>
                    </View>

                    {agendamentoAtual?.tipoAtendimento === 'menor' && (
                        <View style={styles.menorInfoCard}>
                            <View style={styles.menorInfoHeader}>
                                <Ionicons name="people-outline" size={18} color={colors.primary} />
                                <Text style={styles.menorInfoTitle}>DADOS DO DEPENDENTE</Text>
                            </View>
                            <View style={styles.menorInfoBody}>
                                <View style={styles.menorInfoRow}>
                                    <Text style={styles.menorLabel}>Nome:</Text>
                                    <Text style={styles.menorValue}>{agendamentoAtual?.menorNome || 'Não informado'}</Text>
                                </View>
                                <View style={styles.menorInfoRow}>
                                    <Text style={styles.menorLabel}>Idade:</Text>
                                    <Text style={styles.menorValue}>{agendamentoAtual?.menorIdade || '-'}</Text>
                                </View>
                                <View style={styles.menorInfoRow}>
                                    <Text style={styles.menorLabel}>Parentesco:</Text>
                                    <Text style={styles.menorValue}>{agendamentoAtual?.menorParentesco || '-'}</Text>
                                </View>
                                {agendamentoAtual?.observacoesMenor && (
                                    <View style={styles.menorObsBox}>
                                        <Text style={styles.menorObsLabel}>NECESSIDADES / OBSERVAÇÕES:</Text>
                                        <Text style={styles.menorObsValue}>{agendamentoAtual.observacoesMenor}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>DATA E HORÁRIO</Text>
                        <Text style={styles.value}>
                            {agendamentoAtual?.data || 'Data não informada'} às {agendamentoAtual?.horario || '--:--'}
                        </Text>
                    </View>

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>SERVIÇOS</Text>
                        {agendamentoAtual?.servicos && agendamentoAtual.servicos.length > 0 ? (
                            agendamentoAtual.servicos.map((s, index) => (
                                <View key={index} style={styles.itemServico}>
                                    <Text style={styles.servicoNome}>• {s.nome}</Text>
                                    <Text style={styles.servicoPreco}>{formatarMoeda(s.preco)}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.value}>Nenhum serviço informado</Text>
                        )}
                    </View>

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>VALOR TOTAL</Text>
                        <Text style={styles.totalValue}>{formatarMoeda(totalAgendamento)}</Text>
                    </View>

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>FORMA DE PAGAMENTO ESCOLHIDA</Text>
                        <Text style={styles.value}>{getFormaPagamentoLabel(agendamentoAtual)}</Text>
                    </View>

                    {agendamentoAtual?.pagamentoId ? (
                        <View style={styles.infoBlock}>
                            <Text style={styles.label}>ID DA COBRANÇA</Text>
                            <Text style={styles.value}>{agendamentoAtual.pagamentoId}</Text>
                        </View>
                    ) : null}

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>WHATSAPP DO CLIENTE</Text>
                        <TouchableOpacity
                            style={styles.whatsButton}
                            onPress={abrirWhatsAppCliente}
                            activeOpacity={0.88}
                        >
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                            <Text style={styles.whatsButtonText}>Chamar no WhatsApp</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.billingCard}>
                    <View style={styles.billingHeader}>
                        <Ionicons name="cash-outline" size={20} color={colors.primary} />
                        <Text style={styles.billingTitle}>Cobrança do agendamento</Text>
                    </View>

                    <Text style={styles.billingText}>
                        Você poderá gerar a cobrança assim que o serviço for marcado como concluído.
                    </Text>

                    <View style={styles.billingInfoBox}>
                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Método</Text>
                            <Text style={styles.billingInfoValue}>{getFormaPagamentoLabel(agendamentoAtual)}</Text>
                        </View>

                        <View style={styles.billingInfoDivider} />

                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Valor</Text>
                            <Text style={styles.billingInfoValue}>{formatarMoeda(totalAgendamento)}</Text>
                        </View>

                        <View style={styles.billingInfoDivider} />

                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Status</Text>
                            <Text style={[styles.billingInfoValue, { color: statusPagamentoConfig.cor }]}>
                                {statusPagamentoConfig.label}
                            </Text>
                        </View>

                        <View style={styles.billingInfoDivider} />

                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Gerada em</Text>
                            <Text style={styles.billingInfoValue}>
                                {formatarDataHora(
                                    pagamentoGerado?.createdAt ||
                                    pagamentoGerado?.geradaEm ||
                                    agendamentoAtual?.cobrancaGeradaEm
                                )}
                            </Text>
                        </View>

                        <View style={styles.billingInfoDivider} />

                        <View style={styles.billingInfoRow}>
                            <Text style={styles.billingInfoLabel}>Observação</Text>
                            <Text style={styles.billingInfoValue}>
                                {getMensagemStatusPagamento(agendamentoAtual?.statusPagamento)}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.billingButton,
                            (loadingCobranca || (!ehChefe && !cobrancaJaGerada)) && styles.buttonDisabled
                        ]}
                        onPress={gerarCobranca}
                        activeOpacity={0.9}
                        disabled={loadingCobranca || (!ehChefe && !cobrancaJaGerada)}
                    >
                        {loadingCobranca ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name={cobrancaJaGerada ? 'eye-outline' : 'receipt-outline'}
                                    size={20}
                                    color="#FFF"
                                />
                                <Text style={styles.billingButtonText}>
                                    {cobrancaJaGerada ? 'VER COBRANÇA' : 'GERAR COBRANÇA'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {!ehChefe && !cobrancaJaGerada && (
                        <Text style={styles.billingRestrictionNote}>
                            A geração de cobrança é restrita ao gestor.
                        </Text>
                    )}

                    {podeControlarCobranca && (
                        <View style={styles.billingControls}>
                            {!pagamentoJaConfirmado && !pagamentoCancelado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.confirmPaymentButton]}
                                    onPress={confirmarPagamento}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="checkmark-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Confirmar pagamento</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Marque esta cobrança como recebida e confirme para o cliente.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}

                            {!pagamentoCancelado && !pagamentoJaConfirmado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.expirePaymentButton]}
                                    onPress={marcarCobrancaVencida}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="alert-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Marcar como vencida</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Informe que a cobrança venceu e precisa ser gerada novamente.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}

                            {!pagamentoCancelado && !pagamentoJaConfirmado && (
                                <TouchableOpacity
                                    style={[styles.billingControlCard, styles.cancelPaymentButton]}
                                    onPress={cancelarCobranca}
                                    activeOpacity={0.9}
                                    disabled={loadingCobranca}
                                >
                                    <View style={styles.billingControlIconWrap}>
                                        <Ionicons name="close-circle" size={28} color="#FFF" />
                                    </View>
                                    <View style={styles.billingControlTextBox}>
                                        <Text style={styles.billingControlTitle}>Cancelar cobrança</Text>
                                        <Text style={styles.billingControlDescription}>
                                            Cancele esta cobrança e avise o cliente em tempo real.
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    <Text style={styles.billingFootnote}>
                        Nesta etapa a cobrança já fica registrada no Firestore. Depois vamos ligar isso à API real do banco.
                    </Text>
                </View>

                {loadingAcao ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Atualizando status...</Text>
                    </View>
                ) : (
                    <View style={styles.actionsArea}>
                        {podeConfirmar && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.confirmButton]}
                                onPress={confirmarAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>ACEITAR AGENDAMENTO</Text>
                            </TouchableOpacity>
                        )}

                        {podeRecusar && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={recusarAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="close-circle-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>RECUSAR AGENDAMENTO</Text>
                            </TouchableOpacity>
                        )}

                        {podeConcluir && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.finishButton]}
                                onPress={concluirAgendamento}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="checkmark-done-outline" size={20} color="#FFF" />
                                <Text style={styles.actionButtonText}>MARCAR COMO CONCLUÍDO</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
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
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
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

    topSummaryCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#EEF1F4',
        elevation: 2,
        marginBottom: 12,
    },

    topSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    clientAvatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: colors.inputFill,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },

    clientAvatarText: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },

    topSummaryInfo: {
        flex: 1,
    },

    clientName: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },

    clientServiceResume: {
        marginTop: 4,
        fontSize: 13,
        color: colors.secondary,
    },

    osButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: '#F0F7FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1E9FF',
    },

    osButtonText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        marginTop: 2,
    },

    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 14,
    },

    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginRight: 8,
        marginBottom: 8,
    },

    statusChipText: {
        fontSize: 11,
        fontWeight: '800',
        marginLeft: 5,
    },

    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        padding: 18,
        borderRadius: 18,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: colors.textDark,
        marginBottom: 14,
    },

    infoBlock: {
        marginBottom: 16,
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

    itemServico: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },

    servicoNome: {
        fontSize: 14,
        color: '#444',
        flex: 1,
        paddingRight: 10,
    },

    servicoPreco: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.textDark,
    },

    totalRow: {
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        marginBottom: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    totalLabel: {
        fontWeight: 'bold',
        color: '#333',
    },

    totalValue: {
        fontWeight: 'bold',
        color: colors.primary,
        fontSize: 17,
    },

    whatsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3FFF7',
        borderWidth: 1,
        borderColor: '#D2F5DE',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        alignSelf: 'flex-start',
    },

    whatsButtonText: {
        marginLeft: 8,
        color: '#1E8E54',
        fontWeight: '700',
    },

    billingCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 18,
        padding: 18,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#EEF1F4',
    },

    billingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    billingTitle: {
        marginLeft: 8,
        fontSize: 18,
        fontWeight: '800',
        color: colors.textDark,
    },

    billingText: {
        color: '#555',
        lineHeight: 20,
        marginBottom: 14,
    },

    billingInfoBox: {
        backgroundColor: '#F8FAFD',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E6ECF3',
        marginBottom: 14,
    },

    billingInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },

    billingInfoDivider: {
        height: 1,
        backgroundColor: '#E6ECF3',
        marginVertical: 10,
    },

    billingInfoLabel: {
        color: '#6C7A89',
        fontWeight: '700',
        flex: 1,
        paddingRight: 10,
    },

    billingInfoValue: {
        color: '#263238',
        fontWeight: '800',
        flex: 1,
        textAlign: 'right',
    },

    billingButton: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    billingButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },

    buttonDisabled: {
        opacity: 0.7,
    },

    billingControls: {
        marginTop: 14,
    },

    billingControlCard: {
        borderRadius: 18,
        paddingVertical: 15,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },

    billingControlIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },

    billingControlTextBox: {
        flex: 1,
        paddingRight: 10,
    },

    billingControlTitle: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 15,
    },

    billingControlDescription: {
        color: 'rgba(255,255,255,0.92)',
        marginTop: 4,
        fontSize: 12,
        lineHeight: 17,
    },

    confirmPaymentButton: {
        backgroundColor: '#27AE60',
    },

    expirePaymentButton: {
        backgroundColor: '#E67E22',
    },

    cancelPaymentButton: {
        backgroundColor: '#C62828',
        marginBottom: 0,
    },

    billingFootnote: {
        marginTop: 12,
        color: '#6C7A89',
        lineHeight: 18,
        fontSize: 12,
        textAlign: 'center',
    },

    billingRestrictionNote: {
        marginTop: 12,
        color: '#EF4444',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: '#FEF2F2',
        padding: 8,
        borderRadius: 8,
    },

    menorInfoCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },

    menorInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        paddingBottom: 6,
    },

    menorInfoTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.primary,
        marginLeft: 6,
    },

    menorInfoBody: {
        gap: 4,
    },

    menorInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    menorLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#64748B',
        width: 80,
    },

    menorValue: {
        fontSize: 13,
        color: '#1E293B',
        fontWeight: '600',
        flex: 1,
    },

    menorObsBox: {
        marginTop: 10,
        padding: 8,
        backgroundColor: '#FFFBEB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7',
    },

    menorObsLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 4,
    },

    menorObsValue: {
        fontSize: 12,
        color: '#78350F',
        lineHeight: 16,
    },

    loadingBox: {
        marginTop: 18,
        alignItems: 'center',
    },

    loadingText: {
        marginTop: 8,
        color: '#666',
    },

    actionsArea: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },

    actionButton: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },

    actionButtonText: {
        color: '#FFF',
        fontWeight: '800',
        marginLeft: 8,
        fontSize: 14,
    },

    confirmButton: {
        backgroundColor: '#27AE60',
    },

    rejectButton: {
        backgroundColor: '#C62828',
    },

    finishButton: {
        backgroundColor: '#1565C0',
    },
});
