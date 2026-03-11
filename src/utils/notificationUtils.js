export async function enviarPushAoCliente(expoPushToken, status) {
    let titulo = 'Atualização do Agendamento';
    let corpo = 'Seu agendamento foi atualizado.';

    if (status === 'confirmado') {
        titulo = 'Agendamento Confirmado! ✅';
        corpo = 'Seu agendamento foi aceito. Nos vemos em breve!';
    } else if (status === 'recusado') {
        titulo = 'Agendamento Recusado ❌';
        corpo = 'O profissional não pôde aceitar seu pedido no momento.';
    } else if (status === 'cancelado') {
        titulo = 'Agendamento Cancelado ❌';
        corpo = 'Seu agendamento foi cancelado.';
    } else if (status === 'concluido') {
        titulo = 'Atendimento Concluído ✅';
        corpo = 'Seu atendimento foi concluído com sucesso.';
    }

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: corpo,
        data: { screen: 'MeusAgendamentosCliente' },
    };

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
    } catch (error) {
        console.log('Erro ao enviar push:', error);
    }
}