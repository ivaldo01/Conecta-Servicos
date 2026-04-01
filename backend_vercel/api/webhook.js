// backend_vercel/api/webhook.js
const { db, admin } = require('../lib/firebaseAdmin');

module.exports = async (req, res) => {
    // 1. Verificação de método (deve ser POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // 2. Verificação de segurança (Token do Webhook)
    const asaasToken = req.headers['asaas-access-token'];
    const myWebhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (myWebhookToken && asaasToken !== myWebhookToken) {
        console.warn('[Webhook] Tentativa de acesso não autorizada. Token inválido.');
        return res.status(401).json({ error: 'Não autorizado' });
    }

    const { event, payment } = req.body;
    
    // O externalReference é o ID do agendamento que enviamos ao criar a cobrança
    const agendamentoId = payment.externalReference;

    console.log(`[Webhook] Evento: ${event} para o Agendamento: ${agendamentoId}`);

    if (!agendamentoId) {
        return res.status(200).send('Webhook recebido sem externalReference.');
    }

    try {
        const agendamentoRef = db.collection('agendamentos').doc(agendamentoId);
        const pagamentoRef = db.collection('pagamentos').doc(agendamentoId);

        // Lógica baseada no evento recebido
        switch (event) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                // Pagamento Confirmado
                await pagamentoRef.update({
                    status: 'pago',
                    pagoEm: admin.firestore.FieldValue.serverTimestamp(),
                    gatewayStatus: payment.status,
                    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                });

                await agendamentoRef.update({
                    status: 'confirmado',
                    statusPagamento: 'pago',
                    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                });
                break;

            case 'PAYMENT_OVERDUE':
                // Pagamento Vencido
                await pagamentoRef.update({
                    status: 'vencido',
                    gatewayStatus: payment.status,
                    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                });
                break;

            case 'PAYMENT_DELETED':
                // Pagamento Deletado/Cancelado
                await pagamentoRef.update({
                    status: 'cancelado',
                    gatewayStatus: payment.status,
                    atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                });
                break;

            default:
                console.log(`[Webhook] Evento ignorado: ${event}`);
                break;
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[Webhook] Erro ao processar:', error);
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
};