export function calcTotalServicos(servicos, preco) {
    if (!servicos || !Array.isArray(servicos)) {
        return preco || 0;
    }
    
    const totalServicos = servicos.reduce((total, servico) => {
        return total + (servico.preco || 0);
    }, 0);
    
    return totalServicos + (preco || 0);
}