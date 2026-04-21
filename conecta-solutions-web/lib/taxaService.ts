import { getConfigServerSide } from './useConfig';

/**
 * Calcula o valor da taxa de serviço baseado nas configurações do sistema
 * @param valorTotal - Valor total do serviço
 * @returns Objeto com valor da taxa e valor líquido
 * 
 * Exemplo de uso:
 * const { taxa, valorLiquido } = await calcularTaxaServico(100);
 * console.log(`Taxa: R$ ${taxa}, Líquido: R$ ${valorLiquido}`);
 */
export async function calcularTaxaServico(valorTotal: number): Promise<{ 
  taxa: number; 
  valorLiquido: number; 
  taxaPercentual: number;
}> {
  const config = await getConfigServerSide();
  const taxaPercentual = config.pagamentos.taxaServico;
  
  const taxa = (valorTotal * taxaPercentual) / 100;
  const valorLiquido = valorTotal - taxa;
  
  return {
    taxa,
    valorLiquido,
    taxaPercentual,
  };
}

/**
 * Versão síncrona - usar quando já tem a configuração carregada
 */
export function calcularTaxaServicoSync(
  valorTotal: number, 
  taxaPercentual: number
): { 
  taxa: number; 
  valorLiquido: number; 
} {
  const taxa = (valorTotal * taxaPercentual) / 100;
  const valorLiquido = valorTotal - taxa;
  
  return {
    taxa,
    valorLiquido,
  };
}
