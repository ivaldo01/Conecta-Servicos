const { db, admin } = require('../lib/firebaseAdmin');
const axios = require('axios');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://www.asaas.com/api/v3';

module.exports = async (req, res) => {
    // Garante que a resposta seja JSON
    res.setHeader('Content-Type', 'application/json');

    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const {
            userId,
            planoId,
            valor,
            nomePlano,
            billingType = 'PIX',
            creditCard,
            creditCardHolderInfo
        } = req.body;

        if (!userId || !planoId || !valor) {
            return res.status(400).json({ error: 'Dados incompletos para assinatura' });
        }

        console.log(`[createSubscription] INICIANDO - User: ${userId}, Plano: ${planoId}, Valor: ${valor}, Tipo: ${billingType}`);

        // 1. Buscar dados do usuário no Firestore
        const userSnap = await db.collection('usuarios').doc(userId).get();
        if (!userSnap.exists) {
            console.error(`[createSubscription] ERRO: Usuário ${userId} não encontrado no Firestore`);
            return res.status(404).json({ error: 'Usuário não encontrado no banco de dados' });
        }
        const userData = userSnap.data();
        console.log(`[createSubscription] Dados do usuário carregados: ${userData.nome}, CPF: ${userData.cpf || userData.cpfCnpj || 'NÃO TEM'}`);

        // 2. Criar, buscar ou recriar cliente no Asaas
        let asaasCustomerId = userData.asaasCustomerId;

        // Se tem ID, verificar se cliente ainda existe no ASAAS
        if (asaasCustomerId) {
            try {
                console.log(`[createSubscription] Verificando se cliente ${asaasCustomerId} existe no Asaas...`);
                const customerCheck = await axios.get(`${ASAAS_API_URL}/customers/${asaasCustomerId}`, {
                    headers: { 'access_token': ASAAS_API_KEY }
                });

                if (customerCheck.data.deleted || customerCheck.data.status === 'REMOVED') {
                    console.log('[createSubscription] Cliente foi removido no Asaas. Criando novo...');
                    asaasCustomerId = null; // Força criação de novo cliente
                } else {
                    console.log('[createSubscription] Cliente existe e está ativo no Asaas');
                }
            } catch (checkErr) {
                // Se erro 404, cliente não existe
                if (checkErr.response?.status === 404) {
                    console.log('[createSubscription] Cliente não encontrado no Asaas (404). Criando novo...');
                    asaasCustomerId = null;
                } else {
                    console.error('[createSubscription] Erro ao verificar cliente:', checkErr.message);
                    // Continua com o ID existente e tenta assim mesmo
                }
            }
        }

        if (!asaasCustomerId) {
            console.log('[createSubscription] Criando novo cliente no Asaas...');

            const phoneClean = (userData.telefone || userData.whatsapp || '').replace(/\D/g, '');
            const cpfCnpjClean = (userData.cpf || userData.cnpj || userData.cpfCnpj || '').replace(/\D/g, '');

            if (!cpfCnpjClean) {
                console.error('[createSubscription] ERRO: CPF/CNPJ ausente no perfil');
                return res.status(400).json({
                    error: 'Perfil incompleto',
                    details: 'Você precisa cadastrar seu CPF ou CNPJ no perfil antes de assinar um plano.'
                });
            }

            const customerData = {
                name: userData.nome || 'Cliente Conecta',
                email: userData.email || `user_${userId}@conecta.com`,
                cpfCnpj: cpfCnpjClean,
                externalReference: userId
            };

            if (phoneClean) customerData.mobilePhone = phoneClean;

            try {
                const customerResponse = await axios.post(`${ASAAS_API_URL}/customers`, customerData, {
                    headers: { 'access_token': ASAAS_API_KEY }
                });
                asaasCustomerId = customerResponse.data.id;
                console.log(`[createSubscription] Cliente criado no Asaas: ${asaasCustomerId}`);
                await db.collection('usuarios').doc(userId).update({ asaasCustomerId });
            } catch (custErr) {
                console.error('[createSubscription] ERRO ao criar cliente Asaas:', custErr.response?.data || custErr.message);
                return res.status(400).json({
                    error: 'Erro no cadastro do Asaas',
                    details: custErr.response?.data?.errors?.[0]?.description || custErr.message
                });
            }
        }

        // 3. Criar a Assinatura no Asaas
        console.log(`[createSubscription] Criando assinatura ${billingType} no Asaas...`);
        let subscription;
        try {
            const subscriptionBody = {
                customer: asaasCustomerId,
                billingType: billingType,
                value: Number(valor),
                nextDueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                cycle: 'MONTHLY',
                description: `Assinatura Conecta Solutions - ${nomePlano}`,
                externalReference: `${userId}_${planoId}_${Date.now()}`
            };

            // Se for cartão, adiciona os dados necessários
            if (billingType === 'CREDIT_CARD') {
                if (!creditCard || !creditCardHolderInfo) {
                    return res.status(400).json({ error: 'Dados do cartão de crédito ausentes' });
                }
                subscriptionBody.creditCard = creditCard;
                subscriptionBody.creditCardHolderInfo = creditCardHolderInfo;
                // Para cartão, o nextDueDate pode ser hoje se quisermos cobrar na hora,
                // mas Asaas cobra a primeira mensalidade na criação se for cartão e não tiver trial.
            }

            const subscriptionResponse = await axios.post(`${ASAAS_API_URL}/subscriptions`, subscriptionBody, {
                headers: { 'access_token': ASAAS_API_KEY }
            });

            subscription = subscriptionResponse.data;
            console.log(`[createSubscription] Assinatura criada: ${subscription.id}`);
        } catch (subErr) {
            console.error('[createSubscription] ERRO ao criar assinatura Asaas:', subErr.response?.data || subErr.message);
            return res.status(400).json({
                error: 'Erro ao gerar assinatura',
                details: subErr.response?.data?.errors?.[0]?.description || subErr.message
            });
        }

        // 4. Buscar a cobrança imediata (Apenas para PIX, para gerar QR Code)
        let responseJson = {
            success: true,
            subscriptionId: subscription.id,
            billingType
        };

        if (billingType === 'PIX') {
            console.log('[createSubscription] Buscando primeiro pagamento para PIX...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            let firstPaymentId;
            try {
                const paymentResponse = await axios.get(`${ASAAS_API_URL}/subscriptions/${subscription.id}/payments`, {
                    headers: { 'access_token': ASAAS_API_KEY }
                });

                if (!paymentResponse.data.data || paymentResponse.data.data.length === 0) {
                    throw new Error('Nenhum pagamento gerado pelo Asaas para esta assinatura.');
                }
                firstPaymentId = paymentResponse.data.data[0].id;
                console.log(`[createSubscription] Pagamento localizado: ${firstPaymentId}`);
            } catch (payErr) {
                console.error('[createSubscription] ERRO ao localizar pagamento:', payErr.message);
                throw payErr;
            }

            // 5. Pegar QR Code (Apenas PIX)
            console.log('[createSubscription] Solicitando QR Code Pix...');
            const qrCodeResponse = await axios.get(`${ASAAS_API_URL}/payments/${firstPaymentId}/pixQrCode`, {
                headers: { 'access_token': ASAAS_API_KEY }
            });

            responseJson.pixEncodedId = qrCodeResponse.data.encodedImage;
            responseJson.pixPayload = qrCodeResponse.data.payload;
            responseJson.copyPaste = qrCodeResponse.data.payload;
        }

        // 6. Registrar no Firestore
        await db.collection('assinaturas').doc(subscription.id).set({
            userId,
            planoId,
            status: billingType === 'CREDIT_CARD' ? 'ACTIVE' : 'PENDING', // Cartão ativa na hora se capturar
            valor: Number(valor),
            asaasSubscriptionId: subscription.id,
            asaasCustomerId: asaasCustomerId,
            billingType,
            criadoEm: admin.firestore.FieldValue.serverTimestamp(),
            nomePlano
        });

        console.log('[createSubscription] SUCESSO - Resposta enviada ao App');
        return res.status(200).json(responseJson);

    } catch (error) {
        console.error('[createSubscription] Erro:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Erro ao processar assinatura',
            details: error.response?.data?.errors?.[0]?.description || error.message
        });
    }
};
