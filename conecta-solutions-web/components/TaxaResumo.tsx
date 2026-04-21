'use client';

import { useConfig } from '@/lib/useConfig';
import { useState } from 'react';

export default function TaxaResumo() {
  const { config, loading } = useConfig();
  const [valorServico, setValorServico] = useState(100);
  
  if (loading) return <div>Carregando configurações...</div>;
  
  const taxaPercentual = config.pagamentos.taxaServico;
  const taxa = (valorServico * taxaPercentual) / 100;
  const liquido = valorServico - taxa;
  
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">
        Taxa de Serviço: {taxaPercentual}%
      </h3>
      
      <div className="space-y-2 mb-4">
        <label className="block text-sm text-gray-600">
          Valor do Serviço (R$)
        </label>
        <input
          type="number"
          value={valorServico}
          onChange={(e) => setValorServico(Number(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Valor Bruto:</span>
          <span>R$ {valorServico.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-red-600">
          <span>Taxa da Plataforma ({taxaPercentual}%):</span>
          <span>- R$ {taxa.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-green-600 pt-2 border-t">
          <span>Você Recebe:</span>
          <span>R$ {liquido.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
