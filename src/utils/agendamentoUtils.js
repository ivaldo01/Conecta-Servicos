export function getHojeStr() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${ano}-${mes}-${dia}`;
}

export function calcularTotalAgendamento(item) {
    if (item?.servicos?.length) {
        return item.servicos.reduce((acc, s) => {
            return acc + parseFloat(s.preco || 0);
        }, 0);
    }

    return parseFloat(item?.preco || 0);
}

export function getResumoServicos(item) {
    if (item?.servicos?.length) {
        return item.servicos.map((s) => s.nome).join(', ');
    }

    return item?.servicoNome || 'Serviço';
}

export function filtrarAgendamentosPorStatus(agendamentos, filtroStatus) {
    if (filtroStatus === 'todos') return agendamentos;

    return agendamentos.filter((item) => {
        return (item.status || 'pendente') === filtroStatus;
    });
}

export function contarAgendamentosPorStatus(agendamentos) {
    return {
        todos: agendamentos.length,
        pendente: agendamentos.filter((a) => (a.status || 'pendente') === 'pendente').length,
        confirmado: agendamentos.filter((a) => a.status === 'confirmado').length,
        concluido: agendamentos.filter((a) => a.status === 'concluido').length,
        cancelado: agendamentos.filter((a) => a.status === 'cancelado').length,
        recusado: agendamentos.filter((a) => a.status === 'recusado').length,
    };
}

export function montarDashboardHoje(agendamentos, hojeStr) {
    const hoje = agendamentos.filter((item) => item.dataFiltro === hojeStr);

    return {
        totalHoje: hoje.length,
        pendentesHoje: hoje.filter((a) => (a.status || 'pendente') === 'pendente').length,
        confirmadosHoje: hoje.filter((a) => a.status === 'confirmado').length,
        concluidosHoje: hoje.filter((a) => a.status === 'concluido').length,
        canceladosHoje: hoje.filter((a) => a.status === 'cancelado').length,
    };
}

export function ordenarAgendamentosPorCriacao(dados) {
    return [...dados].sort((a, b) => {
        const dataA = a.dataCriacao?.seconds || 0;
        const dataB = b.dataCriacao?.seconds || 0;
        return dataB - dataA;
    });
}

/**
 * Verifica se o profissional está em horário de atendimento baseado na escala.
 * @param {Object} configAgenda - Objeto de configuração da agenda (usuarios/{uid}/configuracoes/agenda)
 * @returns {Boolean}
 */
export function isAtendendoAgora(configAgenda) {
    if (!configAgenda || !configAgenda.dias || !configAgenda.horaInicio || !configAgenda.horaFim) {
        return false;
    }

    const agora = new Date();
    const diaSemana = agora.getDay(); // 0 (Dom) a 6 (Sab)
    
    // 1. Verifica se hoje é um dia de atendimento
    if (!configAgenda.dias.includes(diaSemana)) {
        return false;
    }

    // 2. Verifica se o horário atual está dentro da faixa
    const horaAtual = agora.getHours();
    const minAtual = agora.getMinutes();
    const tempoAtual = horaAtual * 60 + minAtual;

    const [hIni, mIni] = configAgenda.horaInicio.split(':').map(Number);
    const [hFim, mFim] = configAgenda.horaFim.split(':').map(Number);

    const tempoInicio = hIni * 60 + mIni;
    let tempoFim = hFim * 60 + mFim;

    // Se o fim for 00:00, considerar como 24:00 (final do dia)
    if (tempoFim === 0) {
        tempoFim = 24 * 60;
    }

    return tempoAtual >= tempoInicio && tempoAtual <= tempoFim;
}