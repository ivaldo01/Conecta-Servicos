import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

function getConteudoStatusAgendamento(status) {
    let titulo = 'Atualização do Agendamento';
    let corpo = 'Seu agendamento foi atualizado.';

    if (status === 'confirmado') {
        titulo = 'Agendamento Confirmado! ✅';
        corpo = 'Seu agendamento foi aceito. Nos vemos em breve!';
    } else if (status === 'recusado') {
        titulo = 'Agendamento Recusado ❌';
        corpo = 'O profissional não pôde aceitar seu pedido.';
    } else if (status === 'cancelado') {
        titulo = 'Agendamento Cancelado ❌';
        corpo = 'Seu agendamento foi cancelado.';
    } else if (status === 'concluido') {
        titulo = 'Atendimento Concluído ✅';
        corpo = 'Seu atendimento foi concluído com sucesso.';
    }

    return { titulo, corpo };
}

async function enviarPushExpo(expoPushToken, payload) {
    if (!expoPushToken) return;

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: expoPushToken,
                sound: 'default',
                priority: 'high',
                ...payload,
            }),
        });
    } catch (error) {
        console.log('Erro ao enviar push:', error);
    }
}

export async function enviarPushAoCliente(expoPushToken, status, extraData = {}) {
    const { titulo, corpo } = getConteudoStatusAgendamento(status);

    await enviarPushExpo(expoPushToken, {
        title: titulo,
        body: corpo,
        data: {
            ...extraData,
        },
    });
}

export async function salvarNotificacaoCliente({
    clienteId,
    status,
    agendamentoId = null,
    profissionalId = null,
    profissionalNome = 'Profissional',
}) {
    if (!clienteId) return;

    const { titulo, corpo } = getConteudoStatusAgendamento(status);

    try {
        await addDoc(collection(db, 'usuarios', clienteId, 'notificacoes'), {
            tipo: 'atualizacao_agendamento',
            titulo,
            mensagem: corpo,
            agendamentoId,
            profissionalId,
            profissionalNome,
            screen: 'DetalhesAgendamento',
            root: '',
            params: {
                agendamentoId,
            },
            createdAt: serverTimestamp(),
            lida: false,
        });
    } catch (error) {
        console.log('Erro ao criar notificação para cliente:', error);
    }
}

export async function enviarPushAoProfissional(
    expoPushToken,
    {
        titulo = 'Novo agendamento recebido',
        mensagem = 'Você recebeu uma nova solicitação.',
        screen = 'AgendaProfissional',
        root = 'Main',
        params = {},
    } = {}
) {
    await enviarPushExpo(expoPushToken, {
        title: titulo,
        body: mensagem,
        data: {
            screen,
            root,
            params,
        },
    });
}

export async function salvarNotificacaoProfissional({
    profissionalId,
    tipo = 'novo_agendamento',
    titulo = 'Novo agendamento recebido',
    mensagem = 'Você recebeu uma nova solicitação.',
    agendamentoId = null,
    clienteId = null,
    clienteNome = 'Cliente',
    screen = 'AgendaProfissional',
    root = 'Main',
    params = {},
}) {
    if (!profissionalId) return;

    try {
        await addDoc(collection(db, 'usuarios', profissionalId, 'notificacoes'), {
            tipo,
            titulo,
            mensagem,
            agendamentoId,
            clienteId,
            clienteNome,
            screen,
            root,
            params: {
                ...params,
                agendamentoId,
            },
            createdAt: serverTimestamp(),
            lida: false,
        });
    } catch (error) {
        console.log('Erro ao criar notificação para profissional:', error);
    }
}

export async function salvarNotificacaoSistema({
    userId,
    titulo = 'Aviso do sistema',
    mensagem = 'Você recebeu uma nova notificação.',
    tipo = 'sistema',
    agendamentoId = null,
    screen = '',
    root = '',
    params = {},
}) {
    if (!userId) return;

    try {
        let screenFinal = screen;
        let rootFinal = root;
        let paramsFinal = { ...params };
        const texto = `${titulo} ${mensagem}`.toLowerCase();

        if (!screenFinal) {
            if (texto.includes('pagamento') || texto.includes('cobran')) {
                screenFinal = 'PagamentoAgendamento';
                paramsFinal = {
                    ...paramsFinal,
                    agendamentoId,
                };
                tipo = 'cobranca';
            } else if (texto.includes('avali')) {
                screenFinal = 'AvaliarAtendimento';
                paramsFinal = {
                    ...paramsFinal,
                    agendamentoId,
                };
                tipo = 'nova_avaliacao';
            } else if (texto.includes('agendamento') || texto.includes('atendimento')) {
                screenFinal = 'DetalhesAgendamento';
                paramsFinal = {
                    ...paramsFinal,
                    agendamentoId,
                };
                tipo = 'atualizacao_agendamento';
            }
        }

        await addDoc(collection(db, 'usuarios', userId, 'notificacoes'), {
            tipo,
            titulo,
            mensagem,
            agendamentoId,
            screen: screenFinal,
            root: rootFinal,
            params: {
                ...paramsFinal,
                ...(agendamentoId ? { agendamentoId } : {}),
            },
            createdAt: serverTimestamp(),
            lida: false,
        });
    } catch (error) {
        console.log('Erro ao criar notificação de sistema:', error);
    }
}
