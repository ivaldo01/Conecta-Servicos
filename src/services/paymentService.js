
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';

import { db, auth } from './firebaseConfig';
import { getTaxaServico, getTaxaSaque } from '../constants/plans';

const BACKEND_URL = 'https://backend-vercel-nu-topaz.vercel.app';

export const STATUS_PAGAMENTO = {
    AGUARDANDO_COBRANCA: 'aguardando_cobranca',
    GERADA: 'gerada',
    PAGO: 'pago',
    CANCELADO: 'cancelado',
    VENCIDO: 'vencido',
    EM_DISPUTA: 'em_disputa',
};

export const FORMAS_PAGAMENTO_LABEL = {
    pix: 'Pix',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
    especie: 'Dinheiro (Espécie)',
};

export function getFormaPagamentoLabel(formaPagamento) {
    return FORMAS_PAGAMENTO_LABEL[formaPagamento] || 'Pix';
}

export function calcularValorTotalAgendamento(agendamento) {
    if (agendamento?.valorTotal !== undefined && agendamento?.valorTotal !== null) {
        return Number(agendamento.valorTotal || 0);
    }

    const totalServicos = Array.isArray(agendamento?.servicos)
        ? agendamento.servicos.reduce((acc, servico) => {
            return acc + Number(servico?.preco || 0);
        }, 0)
        : 0;

    if (totalServicos > 0) {
        return totalServicos;
    }

    return Number(agendamento?.preco || 0);
}

export async function buscarCobrancaPorAgendamento(agendamentoId) {
    if (!agendamentoId) return null;

    const pagamentoRef = doc(db, 'pagamentos', agendamentoId);
    const snap = await getDoc(pagamentoRef);

    if (!snap.exists()) {
        return null;
    }

    return {
        id: snap.id,
        ...snap.data(),
    };
}

export function ouvirCobrancaPorAgendamento(agendamentoId, onData, onError) {
    if (!agendamentoId) {
        return () => { };
    }

    return onSnapshot(
        doc(db, 'pagamentos', agendamentoId),
        (snap) => {
            if (!snap.exists()) {
                onData?.(null);
                return;
            }

            onData?.({
                id: snap.id,
                ...snap.data(),
            });
        },
        (error) => {
            onError?.(error);
        }
    );
}

export function getStatusPagamentoLabel(status) {
    switch (status) {
        case STATUS_PAGAMENTO.GERADA:
            return 'Cobrança gerada';
        case STATUS_PAGAMENTO.PAGO:
            return 'Pagamento confirmado';
        case STATUS_PAGAMENTO.CANCELADO:
            return 'Cobrança cancelada';
        case STATUS_PAGAMENTO.VENCIDO:
            return 'Cobrança vencida';
        case STATUS_PAGAMENTO.EM_DISPUTA:
            return 'Pagamento em disputa';
        case STATUS_PAGAMENTO.AGUARDANDO_COBRANCA:
        default:
            return 'Aguardando cobrança';
    }
}

export function getStatusPagamentoMensagem(status, formaPagamento = 'pix') {
    if (status === STATUS_PAGAMENTO.PAGO) {
        return 'Seu pagamento já foi confirmado e registrado na plataforma.';
    }

    if (status === STATUS_PAGAMENTO.GERADA) {
        if (formaPagamento === 'pix') {
            return 'Seu Pix foi gerado. Você já pode copiar o código ou pagar pelo QR Code.';
        }

        if (formaPagamento === 'boleto') {
            return 'Sua cobrança por boleto foi gerada.';
        }

        return 'Sua cobrança foi gerada e está pronta para pagamento.';
    }

    if (status === STATUS_PAGAMENTO.CANCELADO) {
        return 'Esta cobrança foi cancelada.';
    }

    if (status === STATUS_PAGAMENTO.VENCIDO) {
        return 'Esta cobrança venceu. Gere uma nova cobrança para continuar.';
    }

    if (status === STATUS_PAGAMENTO.EM_DISPUTA) {
        return 'Este pagamento está em análise ou disputa.';
    }

    return 'A cobrança ainda não foi gerada para este agendamento.';
}

function toMoney(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function limparDocumento(documento = '') {
    return String(documento).replace(/\D/g, '');
}

function requerCpfCnpj(formaPagamento) {
    return formaPagamento === 'pix' || formaPagamento === 'boleto';
}

async function getDadosClienteAtual(formaPagamento = 'pix') {
    const user = auth.currentUser;

    if (!user?.uid) {
        throw new Error('USUARIO_NAO_AUTENTICADO');
    }

    const userRef = doc(db, 'usuarios', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error('CLIENTE_NAO_ENCONTRADO');
    }

    const userData = userSnap.data();

    const nome =
        userData?.nome ||
        userData?.name ||
        user?.displayName ||
        'Cliente';

    const cpfCnpj = limparDocumento(
        userData?.cpf ||
        userData?.cpfCnpj ||
        userData?.cnpj ||
        ''
    );

    if (!cpfCnpj && requerCpfCnpj(formaPagamento)) {
        console.warn('[paymentService] CPF/CNPJ não encontrado para método', formaPagamento, '— prosseguindo sem ele.');
    }

    return {
        uid: user.uid,
        nome,
        cpfCnpj: cpfCnpj || null,
        email: userData?.email || user?.email || '',
        telefone:
            userData?.telefone ||
            userData?.celular ||
            userData?.whatsapp ||
            '',
    };
}

async function salvarPagamentoFirestore({ agendamento, pagamentoGateway }) {
    const valorBruto = toMoney(
        agendamento?.valorTotal ||
        agendamento?.valor ||
        (Array.isArray(agendamento?.servicos)
            ? agendamento.servicos.reduce(
                (acc, item) => acc + Number(item?.preco || 0),
                0
            )
            : 0)
    );

    // Buscar plano do profissional para calcular taxa correta
    let planoId = 'pro_iniciante'; // Padrão: plano gratuito (10%)
    try {
        const profissionalId = agendamento?.profissionalId || agendamento?.colaboradorId;
        if (profissionalId) {
            const profRef = doc(db, 'usuarios', profissionalId);
            const profSnap = await getDoc(profRef);
            if (profSnap.exists()) {
                planoId = profSnap.data()?.planoAtivo || 'pro_iniciante';
            }
        }
    } catch (e) {
        console.warn('[salvarPagamentoFirestore] Erro ao buscar plano do profissional:', e.message);
    }

    const taxaServico = getTaxaServico(planoId);
    const taxaPlataforma = toMoney(valorBruto * taxaServico);
    const valorLiquidoProfissional = toMoney(valorBruto - taxaPlataforma);

    const formaPagamento = agendamento?.formaPagamento || 'pix';
    const formaPagamentoLabel =
        agendamento?.formaPagamentoLabel ||
        getFormaPagamentoLabel(formaPagamento);

    const pagamento = {
        agendamentoId: agendamento.id,
        clienteId: agendamento?.clienteId || auth.currentUser?.uid || null,
        profissionalId:
            agendamento?.profissionalId ||
            agendamento?.colaboradorId ||
            agendamento?.clinicaId ||
            null,
        clinicaId: agendamento?.clinicaId || null,
        colaboradorId: agendamento?.colaboradorId || null,

        formaPagamento,
        formaPagamentoLabel,

        gateway: 'asaas',
        gatewayPaymentId: pagamentoGateway?.paymentId || null,

        gatewayStatus: pagamentoGateway?.status || 'PENDING',
        status: STATUS_PAGAMENTO.GERADA,

        valorCobrado: valorBruto,
        valorBruto,
        taxaPlataforma,
        valorLiquidoProfissional,

        qrCodePix: pagamentoGateway?.qrCode || null,
        copiaEColaPix: pagamentoGateway?.copiaECola || null,
        invoiceUrl: pagamentoGateway?.invoiceUrl || null,

        integracao: 'asaas_vercel',

        criadoEm: serverTimestamp(),
        geradaEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    };

    try {
        await setDoc(doc(db, 'pagamentos', agendamento.id), pagamento, { merge: true });
    } catch (err) {
        console.error('[salvarPagamentoFirestore] Erro ao salvar pagamento:', err.message);
    }

    try {
        await setDoc(
            doc(db, 'agendamentos', agendamento.id),
            {
                pagamentoId: agendamento.id,
                cobrancaGerada: true,
                cobrancaGeradaEm: serverTimestamp(),
                formaPagamento,
                formaPagamentoLabel,
                statusPagamento: STATUS_PAGAMENTO.GERADA,
                gatewayPagamento: 'asaas',
                atualizadoEm: serverTimestamp(),
            },
            { merge: true }
        );
    } catch (err) {
        console.error('[salvarPagamentoFirestore] Erro ao atualizar agendamento:', err.message);
    }

    return pagamento;
}

// ✅ Função auxiliar: lê a resposta do fetch de forma segura.
// Se o servidor retornar HTML ou texto puro (ex: erro do Vercel),
// evita o crash "JSON Parse error: Unexpected character: T"
async function lerRespostaSegura(response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return response.json();
    }

    // Resposta não é JSON (HTML de erro, texto puro, etc.)
    const texto = await response.text();
    console.error('[paymentService] Resposta não-JSON do servidor:', texto.slice(0, 300));

    // Tenta extrair uma mensagem legível do texto
    throw new Error('Servidor retornou resposta inválida. Tente novamente mais tarde.');
}

export async function gerarCobrancaAgendamento({ agendamento, creditCard, creditCardHolderInfo }) {
    if (!agendamento?.id) {
        throw new Error('AGENDAMENTO_INVALIDO');
    }

    const pagamentoExistente = await buscarCobrancaPorAgendamento(agendamento.id);

    // Se já existe uma cobrança PAGA, não faz nada
    if (pagamentoExistente?.status === 'pago') {
        return {
            pagamento: pagamentoExistente,
            agendamentoAtualizado: {
                ...agendamento,
                statusPagamento: 'pago',
                pagamentoConfirmado: true,
            },
            jaExistia: true,
        };
    }

    // Se já existe uma cobrança e NÃO estamos enviando dados de cartão (ex: Pro apenas clicando em Gerar),
    // retorna a cobrança existente para evitar duplicidade no Asaas.
    if (
        pagamentoExistente &&
        !creditCard &&
        (pagamentoExistente?.gatewayPaymentId ||
            pagamentoExistente?.copiaEColaPix ||
            pagamentoExistente?.qrCodePix)
    ) {
        return {
            pagamento: pagamentoExistente,
            agendamentoAtualizado: {
                ...agendamento,
                pagamentoId: pagamentoExistente.id,
                cobrancaGerada: true,
                statusPagamento:
                    pagamentoExistente.status || STATUS_PAGAMENTO.GERADA,
            },
            jaExistia: true,
        };
    }

    // Se chegamos aqui, ou não existe cobrança, ou estamos tentando pagar via cartão agora.
    const formaPagamento = agendamento?.formaPagamento || 'pix';

    const cliente = await getDadosClienteAtual(formaPagamento);
    const valor = calcularValorTotalAgendamento(agendamento);

    const bodyRequest = {
        agendamentoId: agendamento.id,
        valor,
        formaPagamento,
        descricao: `Pagamento do agendamento ${agendamento.id}`,
        cliente: {
            nome: cliente.nome,
            email: cliente.email || undefined,
            telefone: cliente.telefone || undefined,
        },
        creditCard,
        creditCardHolderInfo
    };

    if (cliente.cpfCnpj) {
        bodyRequest.cliente.cpfCnpj = cliente.cpfCnpj;
    }

    console.log('[gerarCobrancaAgendamento] Enviando request:', {
        agendamentoId: agendamento.id,
        valor,
        formaPagamento,
        descricao: `Pagamento do agendamento ${agendamento.id}`,
        clienteEmail: cliente.email,
        temCpf: !!cliente.cpfCnpj,
        temCartao: !!creditCard
    });

    let response;

    try {
        response = await fetch(`${BACKEND_URL}/api/createPayment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyRequest),
        });
    } catch (networkError) {
        console.error('[gerarCobrancaAgendamento] Erro de rede:', networkError.message);
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }

    // ✅ Leitura segura: evita crash se servidor retornar HTML/texto
    const data = await lerRespostaSegura(response);

    if (!response.ok) {
        console.error('[gerarCobrancaAgendamento] Erro na resposta:', {
            status: response.status,
            error: data?.error,
        });
        throw new Error(
            data?.error?.errors?.[0]?.description ||
            data?.error?.message ||
            data?.error ||
            'Erro ao gerar cobrança'
        );
    }

    const pagamentoSalvo = await salvarPagamentoFirestore({
        agendamento,
        pagamentoGateway: data,
    });

    return {
        pagamento: pagamentoSalvo,
        agendamentoAtualizado: {
            ...agendamento,
            pagamentoId: agendamento.id,
            cobrancaGerada: true,
            statusPagamento: STATUS_PAGAMENTO.GERADA,
            gatewayPagamento: 'asaas',
        },
        jaExistia: false,
    };
}

export async function consultarStatusPagamento(agendamentoId) {
    if (!agendamentoId) return null;

    let response;

    try {
        response = await fetch(`${BACKEND_URL}/api/createPayment?agendamentoId=${agendamentoId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (networkError) {
        console.error('[consultarStatusPagamento] Erro de rede:', networkError.message);
        throw new Error('Não foi possível conectar ao servidor.');
    }

    const data = await lerRespostaSegura(response);

    if (!response.ok) {
        throw new Error(data?.error || 'Erro ao consultar status do pagamento');
    }

    if (data?.status) {
        try {
            await setDoc(
                doc(db, 'pagamentos', agendamentoId),
                {
                    gatewayStatus: data.status,
                    status:
                        data.status === 'RECEIVED' || data.status === 'CONFIRMED'
                            ? STATUS_PAGAMENTO.PAGO
                            : undefined,
                    atualizadoEm: serverTimestamp(),
                },
                { merge: true }
            );
        } catch (err) {
            console.error('[consultarStatusPagamento] Erro ao atualizar Firestore:', err.message);
        }
    }

    return data;
}

export async function criarAssinatura({ userId, planoId, valor, nomePlano, billingType = 'PIX', creditCard, creditCardHolderInfo, discount }) {
    if (!userId || !planoId || !valor) {
        throw new Error('Dados incompletos para processar assinatura.');
    }

    let response;
    try {
        response = await fetch(`${BACKEND_URL}/api/createSubscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                planoId,
                valor,
                nomePlano,
                billingType,
                creditCard,
                creditCardHolderInfo,
                discount
            }),
        });
    } catch (networkError) {
        console.error('[criarAssinatura] Erro de rede:', networkError.message);
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }

    const data = await lerRespostaSegura(response);

    if (!response.ok) {
        console.error('[criarAssinatura] Erro na resposta:', data);
        throw new Error(data?.error || data?.details || 'Erro ao processar assinatura.');
    }

    return data;
}

export async function solicitarSaqueProfissional({ valor, pixKey, pixKeyType, userId }) {
    if (!valor || !pixKey || !userId) {
        console.error('[paymentService] Erro: Dados incompletos para saque:', { valor, pixKey, userId });
        throw new Error('Dados incompletos para solicitação de saque.');
    }

    let response;

    try {
        response = await fetch(`${BACKEND_URL}/api/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                valor,
                pixKey,
                pixKeyType: pixKeyType || 'CPF', // Default para CPF se não informado
                userId,
            }),
        });
    } catch (networkError) {
        console.error('[solicitarSaqueProfissional] Erro de rede:', networkError.message);
        throw new Error('Não foi possível conectar ao servidor. Verifique sua internet.');
    }

    const data = await lerRespostaSegura(response);

    if (!response.ok) {
        console.error('[solicitarSaqueProfissional] Erro na resposta:', data);
        throw new Error(data?.error || 'Erro ao solicitar saque.');
    }

    return data;
}
