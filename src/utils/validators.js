import { db } from "../services/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

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
    try {
        if (documento) {
            const q1 = query(collection(db, "usuarios"), where("cpfCnpj", "==", documento));
            const q2 = query(collection(db, "usuarios"), where("cpf", "==", documento));
            const q3 = query(collection(db, "usuarios"), where("cnpj", "==", documento));

            const [s1, s2, s3] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3)]);
            
            const possuiOutroDoc = (snapshot) => {
                let existe = false;
                snapshot.forEach(doc => {
                    if (doc.id !== uidAtivo) existe = true;
                });
                return existe;
            };

            if (possuiOutroDoc(s1) || possuiOutroDoc(s2) || possuiOutroDoc(s3)) {
                return { existe: true, tipo: "documento" };
            }
        }

        if (telefone) {
            const qT1 = query(collection(db, "usuarios"), where("telefone", "==", telefone));
            const qT2 = query(collection(db, "usuarios"), where("whatsapp", "==", telefone));
            
            const [st1, st2] = await Promise.all([getDocs(qT1), getDocs(qT2)]);

            const possuiOutroTel = (snapshot) => {
                let existe = false;
                snapshot.forEach(doc => {
                    if (doc.id !== uidAtivo) existe = true;
                });
                return existe;
            };
            if (possuiOutroTel(st1) || possuiOutroTel(st2)) {
                return { existe: true, tipo: "telefone" };
            }
        }

        return { existe: false };
    } catch (error) {
        console.error("Erro ao verificar duplicidade:", error);
        return { existe: false };
    }
}
