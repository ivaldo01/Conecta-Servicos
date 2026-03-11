import colors from '../constants/colors';

export function getStatusColor(status) {
    switch (status) {
        case 'pendente':
            return colors.warning || '#FFCC00';
        case 'confirmado':
            return colors.success || '#28a745';
        case 'recusado':
            return colors.danger || '#dc3545';
        case 'cancelado':
            return '#6c757d';
        case 'concluido':
            return '#1565C0';
        default:
            return colors.secondary || '#999';
    }
}

export function getMensagemStatus(novoStatus) {
    if (novoStatus === 'confirmado') return 'Agendamento confirmado.';
    if (novoStatus === 'recusado') return 'Agendamento recusado.';
    if (novoStatus === 'cancelado') return 'Agendamento cancelado.';
    if (novoStatus === 'concluido') return 'Atendimento concluído.';
    return 'Status atualizado com sucesso.';
}