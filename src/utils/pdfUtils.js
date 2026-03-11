import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import colors from '../constants/colors';

export async function imprimirOrdemServico(item) {
    const listaServicosHtml =
        item.servicos?.map(
            (s) => `<li>${s.nome} - R$ ${parseFloat(s.preco || 0).toFixed(2)}</li>`
        ).join('') ||
        `<li>${item.servicoNome || 'Serviço'} - R$ ${parseFloat(item.preco || 0).toFixed(2)}</li>`;

    const valorTotal = item.servicos
        ? item.servicos
            .reduce((acc, s) => acc + parseFloat(s.preco || 0), 0)
            .toFixed(2)
        : parseFloat(item.preco || 0).toFixed(2);

    const html = `
    <html>
      <body style="padding:40px; font-family:sans-serif;">
        <h1 style="color:${colors.primary}">ORDEM DE SERVIÇO</h1>
        <p><strong>Cliente:</strong> ${item.clienteNome || 'Cliente'}</p>
        <p><strong>WhatsApp:</strong> ${item.clienteWhatsapp || 'Não informado'}</p>
        <p><strong>Data:</strong> ${item.data} às ${item.horario}</p>
        <p><strong>Status:</strong> ${item.status || 'pendente'}</p>
        <hr/>
        <h3>Serviços:</h3>
        <ul>${listaServicosHtml}</ul>
        <h2>Total: R$ ${valorTotal}</h2>
      </body>
    </html>
  `;

    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
}