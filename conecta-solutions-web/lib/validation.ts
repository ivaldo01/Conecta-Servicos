/**
 * Helpers de validação para formulários
 */

// Validação de email
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validação de telefone brasileiro (com ou sem máscara)
export function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/\D/g, '');
  return numeros.length >= 10 && numeros.length <= 11;
}

// Validação de CPF
export function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numeros.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto === 10 || resto === 11 ? 0 : resto;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numeros.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto === 10 || resto === 11 ? 0 : resto;

  return (
    digito1 === parseInt(numeros.charAt(9)) &&
    digito2 === parseInt(numeros.charAt(10))
  );
}

// Validação de CNPJ
export function validarCNPJ(cnpj: string): boolean {
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(numeros)) return false;

  let tamanho = numeros.length - 2;
  let numerosBase = numeros.substring(0, tamanho);
  let digitos = numeros.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numerosBase.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numerosBase = numeros.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numerosBase.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

// Formata telefone com máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
export function formatarTelefone(telefone: string): string {
  const numeros = telefone.replace(/\D/g, '');
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  return telefone;
}

// Remove máscara do telefone
export function removerMascaraTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

// Validação de campos obrigatórios
export function validarObrigatorio(valor: string): boolean {
  return valor.trim().length > 0;
}

// Interface para erros de validação
export interface ValidationErrors {
  [key: string]: string;
}

// Validação completa do formulário de perfil
export function validarPerfilForm(data: {
  nome: string;
  whatsapp: string;
  email?: string;
  cpfCnpj?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!validarObrigatorio(data.nome)) {
    errors.nome = 'Nome é obrigatório';
  }

  if (!validarObrigatorio(data.whatsapp)) {
    errors.whatsapp = 'WhatsApp é obrigatório';
  } else if (!validarTelefone(data.whatsapp)) {
    errors.whatsapp = 'WhatsApp inválido (deve ter 10 ou 11 dígitos)';
  }

  if (data.email && !validarEmail(data.email)) {
    errors.email = 'E-mail inválido';
  }

  if (data.cpfCnpj) {
    const numeros = data.cpfCnpj.replace(/\D/g, '');
    if (numeros.length === 11 && !validarCPF(data.cpfCnpj)) {
      errors.cpfCnpj = 'CPF inválido';
    } else if (numeros.length === 14 && !validarCNPJ(data.cpfCnpj)) {
      errors.cpfCnpj = 'CNPJ inválido';
    } else if (numeros.length !== 11 && numeros.length !== 14) {
      errors.cpfCnpj = 'CPF/CNPJ deve ter 11 ou 14 dígitos';
    }
  }

  return errors;
}
