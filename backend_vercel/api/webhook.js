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

        console.log(`[Webhook] Processando evento: ${event} para agendamentoId: ${agendamentoId}`, {
            paymentId: payment.id,
            paymentStatus: payment.status,
        });

        // Lógica baseada no evento recebido
        switch (event) {
            case 'PAYMENT_RECEIVED':
            case 'PAYMENT_CONFIRMED':
                console.log(`[Webhook] Confirmando pagamento. Assinatura: ${!!payment.subscription}`);

                // --- BLOCO 1: TRATAMENTO DE AGENDAMENTOS ---
                // Verificar se o agendamento existe antes de processar
                const agendamentoSnap = await agendamentoRef.get();
                const agendamentoExiste = agendamentoSnap.exists;

                if (!agendamentoExiste) {
                    console.log(`[Webhook] Agendamento ${agendamentoId} não encontrado. Pode ser pagamento de contrato recorrente ou agendamento foi deletado.`);
                }

                // Obter dados do pagamento para saber quem é o profissional
                const pagamentoSnap = await pagamentoRef.get();
                if (pagamentoSnap.exists) {
                    const dadosPag = pagamentoSnap.data();
                    const profissionalId = dadosPag.profissionalId || dadosPag.colaboradorId || dadosPag.clinicaId;

                    if (profissionalId) {
                        // Buscar o plano do profissional para aplicar a taxa correta
                        const userSnap = await db.collection('usuarios').doc(profissionalId).get();
                        const userData = userSnap.exists ? userSnap.data() : {};
                        const planoAtivo = userData.planoAtivo || 'free';

                        // Definição das taxas conforme o plano (Enterprise Level)
                        const taxaIntermediacao = planoAtivo === 'premium' ? 0.05 : 0.10; // 5% ou 10%

                        const valorBruto = payment.value || 0;
                        const valorTaxaPlataforma = valorBruto * taxaIntermediacao;
                        const valorLiquidoProfissional = valorBruto - valorTaxaPlataforma;

                        console.log(`[Webhook] Profissional: ${profissionalId} | Plano: ${planoAtivo}`);

                        // Atualizar saldo do profissional com o valor líquido do plano
                        const saldoRef = db.collection('saldos').doc(profissionalId);
                        await saldoRef.set({
                            valor: admin.firestore.FieldValue.increment(valorLiquidoProfissional),
                            saldoDisponivel: admin.firestore.FieldValue.increment(valorLiquidoProfissional),
                            ultimaEntrada: admin.firestore.FieldValue.serverTimestamp(),
                            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });

                        // Atualizar o documento de pagamento com o detalhamento das taxas
                        await pagamentoRef.update({
                            status: 'pago',
                            pagoEm: admin.firestore.FieldValue.serverTimestamp(),
                            gatewayStatus: payment.status,
                            valorPago: valorBruto,
                            valorLiquidoProfissional: valorLiquidoProfissional,
                            taxaPlataforma: valorTaxaPlataforma,
                            planoAplicado: planoAtivo,
                            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                } else {
                    // Fallback caso o documento de pagamento não exista (Cria com taxa padrão de 10%)
                    const valorLiquidoDefault = payment.value * 0.90;
                    await pagamentoRef.set({
                        status: 'pago',
                        pagoEm: admin.firestore.FieldValue.serverTimestamp(),
                        gatewayStatus: payment.status,
                        valorPago: payment.value,
                        valorLiquidoProfissional: valorLiquidoDefault,
                        taxaPlataforma: payment.value * 0.10,
                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Atualizar ou criar agendamento
                if (agendamentoExiste) {
                    await agendamentoRef.update({
                        status: 'confirmado',
                        statusPagamento: 'pago',
                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`[Webhook] Agendamento ${agendamentoId} atualizado com sucesso`);
                } else {
                    // Criar agendamento se não existir (ex: pagamento de contrato recorrente)
                    console.log(`[Webhook] Criando agendamento ${agendamentoId} pois não existe`);

                    // Extrair dados do ID do agendamento (formato: userId_planoId_timestamp)
                    const idParts = agendamentoId.split('_');
                    const clienteId = idParts[0] || payment.customer?.split('_')[0] || 'desconhecido';
                    const planoId = idParts[1] || 'plano_desconhecido';

                    // Buscar dados do cliente
                    let clienteNome = 'Cliente';
                    try {
                        const clienteSnap = await db.collection('usuarios').doc(clienteId).get();
                        if (clienteSnap.exists) {
                            const clienteData = clienteSnap.data();
                            clienteNome = clienteData.nome || clienteData.displayName || 'Cliente';
                        }
                    } catch (e) {
                        console.log(`[Webhook] Não foi possível buscar cliente ${clienteId}`);
                    }

                    // Buscar dados do profissional do pagamento
                    let profissionalId = null;
                    let profissionalNome = 'Profissional';
                    try {
                        if (pagamentoSnap.exists) {
                            const dadosPag = pagamentoSnap.data();
                            profissionalId = dadosPag.profissionalId || dadosPag.colaboradorId || dadosPag.clinicaId;
                            profissionalNome = dadosPag.profissionalNome || dadosPag.nomeProfissional || 'Profissional';
                        }
                    } catch (e) {
                        console.log(`[Webhook] Não foi possível buscar profissional do pagamento`);
                    }

                    // Criar o agendamento
                    await agendamentoRef.set({
                        clienteId: clienteId,
                        clienteNome: clienteNome,
                        profissionalId: profissionalId || null,
                        colaboradorId: profissionalId || null,


                        // Dados do agendamento
                        dataAgendamento: payment.dueDate ? admin.firestore.Timestamp.fromDate(new Date(payment.dueDate)) : admin.firestore.FieldValue.serverTimestamp(),
                        horaInicio: '09:00', // Horário padrão, pode ser ajustado

                        // Serviço
                        servico: 'Serviço contratado',
                        servicoId: planoId,
                        valor: payment.value || 0,

                        // Status
                        status: 'confirmado',
                        statusPagamento: 'pago',

                        // Pagamento
                        pagamentoId: payment.id,
                        asaasPaymentId: payment.id,
                        pagoEm: admin.firestore.FieldValue.serverTimestamp(),

                        // Metadados
                        criadoViaWebhook: true,
                        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                    });

                    console.log(`[Webhook] Agendamento ${agendamentoId} criado com sucesso`);
                }

                // --- BLOCO 2: TRATAMENTO DE ASSINATURAS ---
                if (payment.subscription) {
                    console.log(`[Webhook] Assinatura detectada: ${payment.subscription}`);

                    const assinaturaRef = db.collection('assinaturas').doc(payment.subscription);
                    const assinaturaSnap = await assinaturaRef.get();

                    if (assinaturaSnap.exists) {
                        const { userId, planoId } = assinaturaSnap.data();

                        // Atualizar status da assinatura
                        await assinaturaRef.update({
                            status: 'ACTIVE',
                            ultimaConfirmacao: admin.firestore.FieldValue.serverTimestamp(),
                            proximaVencimento: payment.dueDate
                        });

                        // Mudar o plano do usuário no Firestore
                        await db.collection('usuarios').doc(userId).update({
                            planoAtivo: planoId,
                            assinaturaAtiva: true,
                            dataAssinatura: admin.firestore.FieldValue.serverTimestamp()
                        });

                        console.log(`[Webhook] Plano PREMIUM ativado para o usuário: ${userId}`);
                    }
                } else if (payment.externalReference && payment.externalReference.includes('_')) {
                    // Fallback: usar externalReference se não tiver subscription ainda (caso PIX)
                    const parts = payment.externalReference.split('_');
                    if (parts.length >= 2) {
                        const [userId, planoId] = parts;
                        console.log(`[Webhook] Ativando plano via externalReference - User: ${userId}, Plano: ${planoId}`);

                        // Buscar assinatura pelo externalReference
                        const assinaturasSnap = await db.collection('assinaturas')
                            .where('userId', '==', userId)
                            .where('planoId', '==', planoId)
                            .orderBy('criadoEm', 'desc')
                            .limit(1)
                            .get();

                        if (!assinaturasSnap.empty) {
                            const assinaturaDoc = assinaturasSnap.docs[0];
                            await assinaturaDoc.ref.update({
                                status: 'ACTIVE',
                                ultimaConfirmacao: admin.firestore.FieldValue.serverTimestamp(),
                                proximaVencimento: payment.dueDate,
                                asaasPaymentId: payment.id
                            });

                            // Ativar plano no usuário
                            await db.collection('usuarios').doc(userId).update({
                                planoAtivo: planoId,
                                assinaturaAtiva: true,
                                dataAssinatura: admin.firestore.FieldValue.serverTimestamp()
                            });

                            console.log(`[Webhook] Plano PREMIUM ativado via fallback para: ${userId}`);
                        }
                    }
                }

                // --- BLOCO 3: TRATAMENTO DE CONTRATOS RECORRENTES ---
                // Verificar se o pagamento é de um contrato recorrente (renovação mensal)
                if (payment.subscription) {
                    console.log(`[Webhook] Verificando contrato recorrente para subscription: ${payment.subscription}`);

                    // Buscar contrato pelo subscription ID
                    const contratosSnap = await db.collection('contratosRecorrentes')
                        .where('asaasSubscriptionId', '==', payment.subscription)
                        .where('status', 'in', ['ativo', 'trial', 'pendente'])
                        .limit(1)
                        .get();

                    if (!contratosSnap.empty) {
                        const contratoDoc = contratosSnap.docs[0];
                        const contratoData = contratoDoc.data();

                        console.log(`[Webhook] Contrato recorrente encontrado: ${contratoDoc.id}`);

                        // Atualizar dados do contrato
                        const updateData = {
                            ultimaCobrancaConfirmada: admin.firestore.FieldValue.serverTimestamp(),
                            proximaCobranca: payment.dueDate,
                            ultimoPagamentoId: payment.id,
                            statusPagamento: 'pago',
                            atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                        };

                        // Se era trial, mudar para ativo
                        if (contratoData.status === 'trial' || contratoData.status === 'pendente') {
                            updateData.status = 'ativo';
                            updateData.dataAtivacao = admin.firestore.FieldValue.serverTimestamp();
                        }

                        await contratoDoc.ref.update(updateData);

                        // Incrementar ciclo se for renovação
                        const cicloAtual = contratoData.cicloAtual || 1;
                        const jaGerouEsteMes = contratoData.ultimaGeracaoAgendamentos?.toDate?.();
                        const hoje = new Date();

                        // Se não gerou agendamentos para o próximo ciclo, gerar agora
                        const deveGerarAgendamentos = !jaGerouEsteMes ||
                            (jaGerouEsteMes.getMonth() !== hoje.getMonth());

                        if (deveGerarAgendamentos && contratoData.plano?.diasSemana) {
                            console.log(`[Webhook] Gerando agendamentos para próximo ciclo do contrato ${contratoDoc.id}`);

                            // Gerar agendamentos para o próximo mês
                            const batch = db.batch();
                            const agendamentosIds = [];

                            // Calcular datas para o próximo mês
                            const ano = hoje.getFullYear();
                            const mes = hoje.getMonth() + 1; // Próximo mês
                            const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();

                            for (let dia = 1; dia <= ultimoDiaMes; dia++) {
                                const data = new Date(ano, mes, dia);
                                const diaSemana = data.getDay();

                                // Verificar se esse dia está configurado no plano
                                const diaConfig = contratoData.plano.diasSemana.find(d => d.diaSemana === diaSemana);
                                if (diaConfig) {
                                    const novoAgendamentoRef = db.collection('agendamentos').doc();

                                    batch.set(novoAgendamentoRef, {
                                        clienteId: contratoData.clienteId,
                                        clienteNome: contratoData.clienteNome,
                                        profissionalId: contratoData.profissionalId,
                                        colaboradorId: contratoData.profissionalId,
                                        clinicaId: contratoData.clinicaId || null,
                                        dataAgendamento: admin.firestore.Timestamp.fromDate(data),
                                        horaInicio: diaConfig.horaInicio,
                                        horaFim: diaConfig.horaFim,
                                        servico: contratoData.plano.nome,
                                        servicoId: contratoData.planoId,
                                        status: 'agendado',
                                        statusPagamento: 'pago',
                                        contratoId: contratoDoc.id,
                                        tipoAgendamento: 'RECORRENTE',
                                        cicloMensal: cicloAtual + 1,
                                        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
                                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                                    });

                                    agendamentosIds.push(novoAgendamentoRef.id);
                                }
                            }

                            // Limitar ao número de sessões por mês
                            const sessoesPorMes = contratoData.plano.sessoesPorMes || agendamentosIds.length;
                            const agendamentosLimitados = agendamentosIds.slice(0, sessoesPorMes);

                            await batch.commit();

                            // Atualizar contrato com novos agendamentos
                            await contratoDoc.ref.update({
                                agendamentosIds: admin.firestore.FieldValue.arrayUnion(...agendamentosLimitados),
                                sessoesTotaisContrato: admin.firestore.FieldValue.increment(agendamentosLimitados.length),
                                cicloAtual: admin.firestore.FieldValue.increment(1),
                                sessoesRestantesMesAtual: agendamentosLimitados.length,
                                remarcacoesUsadasMes: 0, // Reset mensal
                                ultimaGeracaoAgendamentos: admin.firestore.FieldValue.serverTimestamp()
                            });

                            console.log(`[Webhook] ${agendamentosLimitados.length} agendamentos gerados para contrato ${contratoDoc.id}`);

                            // Criar notificação para o cliente
                            await db.collection('notificacoes').add({
                                userId: contratoData.clienteId,
                                tipo: 'CONTRATO_RENOVADO',
                                titulo: 'Contrato renovado com sucesso!',
                                mensagem: `Seu plano ${contratoData.plano.nome} foi renovado e ${agendamentosLimitados.length} novas sessões foram agendadas.`,
                                contratoId: contratoDoc.id,
                                lida: false,
                                criadoEm: admin.firestore.FieldValue.serverTimestamp()
                            });

                            // Criar notificação para o profissional
                            await db.collection('notificacoes').add({
                                userId: contratoData.profissionalId,
                                tipo: 'CONTRATO_CLIENTE_RENOVADO',
                                titulo: 'Pagamento recebido - Contrato renovado',
                                mensagem: `O cliente ${contratoData.clienteNome} renovou o contrato ${contratoData.plano.nome}. Novos agendamentos criados.`,
                                contratoId: contratoDoc.id,
                                lida: false,
                                criadoEm: admin.firestore.FieldValue.serverTimestamp()
                            });
                        }

                        console.log(`[Webhook] Contrato recorrente ${contratoDoc.id} processado com sucesso`);
                    }
                }
                break;

            case 'PAYMENT_OVERDUE':
                // Pagamento Vencido - verificar se documento existe
                const pagamentoOverdueSnap = await pagamentoRef.get();
                if (pagamentoOverdueSnap.exists) {
                    await pagamentoRef.update({
                        status: 'vencido',
                        gatewayStatus: payment.status,
                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('[Webhook] Status atualizado para VENCIDO');
                } else {
                    console.log('[Webhook] Documento não encontrado, ignorando evento PAYMENT_OVERDUE');
                }
                break;

            case 'PAYMENT_DELETED':
            case 'PAYMENT_CANCELLED':
                // Pagamento Deletado/Cancelado - verificar se documento existe
                const pagamentoCancelSnap = await pagamentoRef.get();
                if (pagamentoCancelSnap.exists) {
                    await pagamentoRef.update({
                        status: 'cancelado',
                        gatewayStatus: payment.status,
                        atualizadoEm: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log('[Webhook] Status atualizado para CANCELADO');
                } else {
                    console.log('[Webhook] Documento não encontrado, ignorando evento ' + event);
                }
                break;

            default:
                console.log(`[Webhook] Evento ignorado (não há handler): ${event}`);
                break;
        }

        console.log('[Webhook] Evento processado com sucesso');
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('[Webhook] Erro ao processar:', {
            agendamentoId,
            event,
            errorMessage: error.message,
            stack: error.stack,
        });
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
};