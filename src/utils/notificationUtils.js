import { addDoc, collection, serverTimestamp, getDoc, doc } from 'firebase/firestore';
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
    if (!expoPushToken || typeof expoPushToken !== 'string') {
        console.log('Push: Token inválido ou ausente:', expoPushToken);
        return;
    }

    if (!expoPushToken.startsWith('ExponentPushToken')) {
        console.log('Push: O token fornecido não é um Expo Push Token padrão:', expoPushToken);
    }

    try {
        const body = {
            to: expoPushToken,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            ...payload,
        };

        console.log('Push: Tentando enviar para:', expoPushToken);
        console.log('Push: Body final:', JSON.stringify(body));

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const result = await response.json();
        console.log("Push: Resposta do servidor Expo:", JSON.stringify(result));

        if (result.errors) {
            console.error("Push: Erros reportados pelo Expo:", result.errors);
        }
    } catch (error) {
        console.error('Push: Erro fatal ao chamar API do Expo:', error);
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
    payload = {}
) {
    const {
        titulo, title,
        mensagem, body,
        screen, root, params
    } = payload;

    await enviarPushExpo(expoPushToken, {
        title: title || titulo || 'Novo agendamento recebido',
        body: body || mensagem || 'Você recebeu uma nova solicitação.',
        data: {
            screen: screen || 'AgendaProfissional',
            root: root || 'Main',
            params: params || {},
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

export async function enviarPushSuporte({
    toUserId,
    titulo = 'Suporte Conecta',
    mensagem,
    screen = 'Suporte',
    params = {},
    sound = 'default',
    channelId = 'default'
}) {
    if (!toUserId) return;

    try {
        const userSnap = await getDoc(doc(db, 'usuarios', toUserId));
        if (userSnap.exists()) {
            const token = userSnap.data()?.expoPushToken || userSnap.data()?.pushToken;
            if (token) {
                await enviarPushExpo(token, {
                    title: titulo,
                    body: mensagem,
                    sound: sound,
                    channelId: channelId,
                    data: {
                        screen,
                        params,
                    }
                });
            }
        }
    } catch (error) {
        console.log('Erro ao enviar push de suporte:', error);
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

        // Enviar PUSH externo também para notificações de sistema
        try {
            const userSnap = await getDoc(doc(db, 'usuarios', userId));
            if (userSnap.exists()) {
                const token = userSnap.data()?.expoPushToken || userSnap.data()?.pushToken;
                if (token) {
                    await enviarPushExpo(token, {
                        title: titulo,
                        body: mensagem,
                        data: {
                            screen: screenFinal,
                            root: rootFinal,
                            params: {
                                ...paramsFinal,
                                ...(agendamentoId ? { agendamentoId } : {}),
                            },
                        }
                    });
                }
            }
        } catch (pushError) {
            console.log('Erro ao tentar enviar push na notificacao de sistema:', pushError);
        }
    } catch (error) {
        console.log('Erro ao criar notificação de sistema:', error);
    }
}
