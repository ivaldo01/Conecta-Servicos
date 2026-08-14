import { functions } from "../services/firebaseConfig";
import { httpsCallable } from "firebase/functions";

export function validarCPF(cpf) {
    if (!cpf) return false;
    cpf = String(cpf).replace(/[^\d]+/g, "");
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

export function validarCNPJ(cnpj) {
    if (!cnpj) return false;
    cnpj = String(cnpj).replace(/[^\d]+/g, "");
    if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) return false;

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) return false;

    return true;
}

export function validarEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

export function validarTelefone(telefone) {
    if (!telefone) return false;
    const regexTelefone = /^\(?\d{2}\)?\s?(9?\d{4})[-]?\d{4}$/;
    return regexTelefone.test(String(telefone));
}

export async function verificarDadosDuplicados(documento, telefone, uidAtivo = null) {
    void uidAtivo;
    const verificar = httpsCallable(functions, "verificarDadosDuplicados");
    const resposta = await verificar({ documento, telefone });
    return resposta.data;
}
