export function limparTelefone(numero) {
    if (!numero) return "";

    return numero.replace(/\D/g, "");
}