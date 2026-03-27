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