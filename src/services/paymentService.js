import {
    doc,
    getDoc,
    serverTimestamp,
    updateDoc,
    setDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

export const STATUS_PAGAMENTO = {
    AGUARDANDO_COBRANCA: 'aguardando_cobranca',
    GERADA: 'gerada',
    PAGO: 'pago',
    CANCELADO: 'cancelado',
    VENCIDO: 'vencido',
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

function montarMensagemFormaPagamento(formaPagamento) {
    switch (formaPagamento) {
        case 'boleto':
            return 'Cobrança preparada para boleto bancário.';
        case 'cartao_credito':
            return 'Cobrança preparada para cartão de crédito.';
        case 'cartao_debito':
            return 'Cobrança preparada para cartão de débito.';
        case 'pix':
        default:
            return 'Cobrança preparada para Pix.';
    }
}

export async function gerarCobrancaAgendamento({ agendamento, profissionalId }) {
    if (!agendamento?.id) {
        throw new Error('AGENDAMENTO_INVALIDO');
    }

    const pagamentoRef = doc(db, 'pagamentos', agendamento.id);
    const pagamentoExistenteSnap = await getDoc(pagamentoRef);

    if (pagamentoExistenteSnap.exists()) {
        const pagamentoExistente = {
            id: pagamentoExistenteSnap.id,
            ...pagamentoExistenteSnap.data(),
        };

        return {
            pagamento: pagamentoExistente,
            agendamentoAtualizado: {
                ...agendamento,
                pagamentoId: pagamentoExistente.id,
                cobrancaGerada: true,
                statusPagamento: pagamentoExistente.status || STATUS_PAGAMENTO.GERADA,
            },
            jaExistia: true,
        };
    }

    const valorTotal = calcularValorTotalAgendamento(agendamento);
    const formaPagamento = agendamento?.formaPagamento || 'pix';
    const formaPagamentoLabel =
        agendamento?.formaPagamentoLabel || getFormaPagamentoLabel(formaPagamento);

    const profissionalResponsavelId =
        profissionalId || agendamento?.profissionalId || null;

    const pagamentoPayload = {
        agendamentoId: agendamento.id,
        clienteId: agendamento?.clienteId || null,
        clienteNome: agendamento?.clienteNome || 'Cliente',

        profissionalId: profissionalResponsavelId,
        clinicaId: agendamento?.clinicaId || null,
        clinicaNome: agendamento?.clinicaNome || 'Profissional',
        colaboradorId: agendamento?.colaboradorId || null,
        colaboradorNome: agendamento?.colaboradorNome || null,

        dataAgendamento: agendamento?.data || '',
        horarioAgendamento: agendamento?.horario || '',

        formaPagamento,
        formaPagamentoLabel,

        valorOriginal: valorTotal,
        valorCobrado: valorTotal,
        status: STATUS_PAGAMENTO.GERADA,

        gateway: 'pendente_integracao',
        descricao: `Cobrança referente ao agendamento de ${agendamento?.data || ''} às ${agendamento?.horario || ''}`.trim(),
        mensagem: montarMensagemFormaPagamento(formaPagamento),
        codigoReferencia: `COB-${String(agendamento.id).slice(0, 8).toUpperCase()}`,

        qrCodePix: '',
        copiaEColaPix: '',
        linhaDigitavel: '',
        linkPagamento: '',
        comprovanteUrl: '',

        geradoPor: profissionalResponsavelId,

        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        pagoEm: null,
        canceladoEm: null,
        vencimentoEm: null,
    };

    await setDoc(pagamentoRef, pagamentoPayload);

    const agendamentoUpdate = {
        pagamentoId: pagamentoRef.id,
        cobrancaGerada: true,
        statusPagamento: STATUS_PAGAMENTO.GERADA,
        formaPagamento,
        formaPagamentoLabel,
        valorTotal,
        cobrancaGeradaEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
    };

    await updateDoc(doc(db, 'agendamentos', agendamento.id), agendamentoUpdate);

    return {
        pagamento: {
            id: pagamentoRef.id,
            ...pagamentoPayload,
            createdLocally: true,
        },
        agendamentoAtualizado: {
            ...agendamento,
            ...agendamentoUpdate,
        },
        jaExistia: false,
    };
}