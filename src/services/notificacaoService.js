export async function enviarNotificacaoPush(expoPushToken, titulo, mensagem) {
    const message = {
        to: expoPushToken,
        sound: 'default',
        title: titulo,
        body: mensagem,
        data: { someData: 'goes here' }, // Você pode passar o ID do agendamento aqui
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
        console.log("Notificação enviada com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar notificação:", error);
    }
}