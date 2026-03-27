import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp,
} from 'firebase/firestore';

import { db, auth } from './firebaseConfig';

const BACKEND_URL = 'https://conecta-backend.vercel.app';

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
    boleto: 'Boleto',
    cartao_credito: 'Cartão de crédito',
    cartao_debito: 'Cartão de débito',
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

async function getDadosClienteAtual() {
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

    if (!cpfCnpj) {
        throw new Error('CPF_CLIENTE_NAO_ENCONTRADO');
    }

    return {
        uid: user.uid,
        nome,
        cpfCnpj,
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

    const taxaPlataforma = toMoney(valorBruto * 0.1);
    const valorLiquidoProfissional = toMoney(valorBruto - taxaPlataforma);

    const pagamento = {
        agendamentoId: agendamento.id,
        clienteId: agendamento?.clienteId || auth.currentUser?.uid || null,
        profissionalId: agendamento?.profissionalId || null,
        clinicaId: agendamento?.clinicaId || null,
        colaboradorId: agendamento?.colaboradorId || null,

        formaPagamento: 'pix',
        formaPagamentoLabel: 'Pix',

        gateway: 'asaas',
        gatewayPaymentId: pagamentoGateway?.paymentId || null,

        gatewayStatus: pagamentoGateway?.status || 'PENDING',
        status: STATUS_PAGAMENTO.GERADA,

        valorBruto,
        taxaPlataforma,
        valorLiquidoProfissional,

        qrCodePix: pagamentoGateway?.qrCode || null,
        copiaEColaPix: pagamentoGateway?.copiaECola || null,
        invoiceUrl: pagamentoGateway?.invoiceUrl || null,

        integracao: 'asaas_vercel',

        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    };

    await setDoc(doc(db, 'pagamentos', agendamento.id), pagamento, { merge: true });

    await setDoc(
        doc(db, 'agendamentos', agendamento.id),
        {
            pagamentoId: agendamento.id,
            cobrancaGerada: true,
            formaPagamento: 'pix',
            formaPagamentoLabel: 'Pix',
            statusPagamento: STATUS_PAGAMENTO.GERADA,
            gatewayPagamento: 'asaas',
            atualizadoEm: serverTimestamp(),
        },
        { merge: true }
    );

    return pagamento;
}

export async function gerarCobrancaAgendamento({ agendamento }) {
    if (!agendamento?.id) {
        throw new Error('AGENDAMENTO_INVALIDO');
    }

    const pagamentoExistente = await buscarCobrancaPorAgendamento(agendamento.id);

    if (
        pagamentoExistente &&
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

    const cliente = await getDadosClienteAtual();
    const valor = calcularValorTotalAgendamento(agendamento);

    const response = await fetch(`${BACKEND_URL}/api/createPayment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            agendamentoId: agendamento.id,
            valor,
            descricao: `Pagamento do agendamento ${agendamento.id}`,
            cliente: {
                nome: cliente.nome,
                cpfCnpj: cliente.cpfCnpj,
                email: cliente.email || undefined,
                telefone: cliente.telefone || undefined,
            },
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.errors?.[0]?.description ||
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
    if (!agendamentoId) {
        throw new Error('AGENDAMENTO_INVALIDO');
    }

    const pagamentoRef = doc(db, 'pagamentos', agendamentoId);
    const pagamentoSnap = await getDoc(pagamentoRef);

    if (!pagamentoSnap.exists()) {
        throw new Error('PAGAMENTO_NAO_ENCONTRADO');
    }

    return {
        id: pagamentoSnap.id,
        ...pagamentoSnap.data(),
    };
}

export async function solicitarSaqueProfissional({ valor, pixAddressKey }) {
    const response = await fetch(`${BACKEND_URL}/api/withdraw`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            valor,
            pixKey: pixAddressKey,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data?.error?.errors?.[0]?.description ||
            data?.error ||
            'Erro ao solicitar saque'
        );
    }

    return data;
}