'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '@/lib/firebase';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building2, Briefcase, MapPin, FileText, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import '@/styles/cadastro.css';

// ============================================================
// TIPOS DE CONTA
// ============================================================
type TipoConta = 'profissional' | 'cliente';
type TipoCadastroProfissional = 'autonomo' | 'empresa';

interface FormCadastro {
  nome: string;
  nomeNegocio: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  cpfCnpj: string;
  especialidade: string;
  bio: string;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
  pais: string;
}

const FORM_INICIAL: FormCadastro = {
  nome: '', nomeNegocio: '', email: '', telefone: '', senha: '', confirmarSenha: '',
  cpfCnpj: '', especialidade: '', bio: '', endereco: '', cep: '', cidade: '', estado: '', pais: 'Brasil'
};

// ============================================================
// TELA DE CADASTRO
// Cria conta no mesmo Firebase do app mobile.
// Profisionais e clientes usam o mesmo fluxo com campos distintos.
// ============================================================
export default function CadastroPage() {
  const router = useRouter();

  const [tipo, setTipo] = useState<TipoConta>('cliente');
  const [tipoProfissional, setTipoProfissional] = useState<TipoCadastroProfissional>('autonomo');
  const [form, setForm] = useState<FormCadastro>(FORM_INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mostrarEndereco, setMostrarEndereco] = useState(false);
  const [aceitaTermos, setAceitaTermos] = useState(false);

  const set = (campo: keyof FormCadastro) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }));

  // Validações antes de cadastrar
  const validar = (): string | null => {
    if (!form.nome.trim())  return 'Informe seu nome completo.';
    if (tipo === 'profissional' && tipoProfissional === 'empresa' && !form.nomeNegocio.trim()) {
      return 'Informe o nome do negócio/empresa.';
    }
    if (!form.email.trim()) return 'Informe seu e-mail.';
    if (!form.telefone.trim()) return 'Informe seu telefone/WhatsApp.';
    if (tipo === 'profissional' && !form.cpfCnpj.trim()) {
      return tipoProfissional === 'empresa' ? 'Informe o CNPJ.' : 'Informe o CPF.';
    }
    if (tipo === 'profissional' && !form.especialidade.trim()) {
      return 'Informe sua especialidade/categoria.';
    }
    if (form.senha.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    if (form.senha !== form.confirmarSenha) return 'As senhas não coincidem.';
    if (!aceitaTermos) return 'Você precisa aceitar os Termos de Uso e Política de Privacidade.';
    return null;
  };

  // Tradução de erros do Firebase
  const traduzirErro = (code: string): string => {
    const erros: Record<string, string> = {
      'auth/email-already-in-use': 'Este e-mail já possui uma conta.',
      'auth/invalid-email':        'E-mail inválido.',
      'auth/weak-password':        'Senha muito fraca. Use ao menos 6 caracteres.',
    };
    return erros[code] || 'Erro ao criar conta. Tente novamente.';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const erro = validar();
    if (erro) { toast.error(erro); return; }

    setLoading(true);
    try {
      const verificarDuplicidade = httpsCallable<
        { documento: string; telefone: string },
        { existe: boolean; tipo?: 'documento' | 'telefone' }
      >(functions, 'verificarDadosDuplicados');
      const duplicidade = await verificarDuplicidade({
        documento: form.cpfCnpj.trim(),
        telefone: form.telefone.trim(),
      });

      if (duplicidade.data.existe) {
        toast.error(
          duplicidade.data.tipo === 'documento'
            ? 'Este CPF/CNPJ já está vinculado a outra conta.'
            : 'Este telefone/WhatsApp já está vinculado a outra conta.',
        );
        return;
      }

      // 1. Cria usuário no Firebase Auth
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.senha);

      // 2. Grava o perfil no Firestore com Transação para Gerar ID Sequencial
      const userRef = doc(db, 'usuarios', user.uid);
      const counterRef = doc(db, 'config', 'contadores');

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentCount = 1;

        if (counterDoc.exists()) {
          currentCount = (counterDoc.data().usuarios || 0) + 1;
        }

        const codigoConecta = `CS-BR-${String(currentCount).padStart(6, '0')}`;

        // Define nome de exibição baseado no tipo
        const nomeExibicao = tipo === 'profissional' && tipoProfissional === 'empresa'
          ? form.nomeNegocio.trim()
          : form.nome.trim();

        transaction.set(counterRef, { usuarios: currentCount }, { merge: true });

        const dadosPerfil: Record<string, unknown> = {
          uid:          user.uid,
          nome:         nomeExibicao,
          nomeCompleto: form.nome.trim(),
          email:        form.email.trim().toLowerCase(),
          whatsapp:     form.telefone.trim(),
          telefone:     form.telefone.trim(),
          tipo,            // 'profissional' | 'cliente'
          perfil:       tipo,
          planoAtivo:   tipo === 'profissional' ? 'pro_iniciante' : 'free',
          codigoConecta: codigoConecta, // ID OFICIAL GERADO
          aceitouTermos: aceitaTermos,
          ativo:        true,
          criadoEm:     serverTimestamp(),
          dataCriacao:  serverTimestamp(),
          criadoVia:    'web',
          verificado:   false,
          avaliacaoMedia: 0,
          totalAvaliacoes: 0,
          fotoPerfil:   '',
          pushToken:    '',
        };

        // Campos específicos para profissionais
        if (tipo === 'profissional') {
          dadosPerfil.tipoCadastroProfissional = tipoProfissional;
          dadosPerfil.cpfCnpj = form.cpfCnpj.trim();
          dadosPerfil.especialidade = form.especialidade.trim();
          dadosPerfil.nomeNegocio = form.nomeNegocio.trim();
          dadosPerfil.responsavel = form.nome.trim();
          dadosPerfil.bio = form.bio.trim();
          dadosPerfil.endereco = form.endereco.trim();
          dadosPerfil.localizacao = {
            pais: form.pais || 'Brasil',
            estado: form.estado,
            cidade: form.cidade,
            cep: form.cep
          };
        }

        transaction.set(userRef, dadosPerfil);
      });

      toast.success('Conta criada com sucesso! Bem-vindo(a)!');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(traduzirErro((err as { code?: string }).code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-root">

      {/* ===== PAINEL ESQUERDO — Marca ===== */}
      <div className="cadastro-brand">
        <div className="cadastro-brand-inner">

          <div className="cadastro-brand-logo-wrap">
            <Image src="/logo-brand.png" alt="Conecta Solutions" width={180} height={90} priority
              className="cadastro-brand-logo-img" />
          </div>

          <h2 className="cadastro-brand-headline">
            Comece agora com a Conecta Solutions
          </h2>
          <p className="cadastro-brand-desc">
            Crie sua conta e acesse a plataforma completa de agendamento.
            Os dados ficam sincronizados com o aplicativo mobile automaticamente.
          </p>

          {/* Seletor visual de perfil */}
          <div className="cadastro-tipo-cards">
            <button
              type="button"
              className={`cadastro-tipo-card ${tipo === 'profissional' ? 'cadastro-tipo-card--ativo' : ''}`}
              onClick={() => setTipo('profissional')}
            >
              <Briefcase size={22} />
              <span>Profissional</span>
              <small>Gerencie agenda, equipe e finanças</small>
            </button>
            <button
              type="button"
              className={`cadastro-tipo-card ${tipo === 'cliente' ? 'cadastro-tipo-card--ativo' : ''}`}
              onClick={() => setTipo('cliente')}
            >
              <User size={22} />
              <span>Cliente</span>
              <small>Agende serviços com facilidade</small>
            </button>
          </div>

          {/* Seletor de tipo de profissional */}
          {tipo === 'profissional' && (
            <div className="cadastro-tipo-pro-cards">
              <button
                type="button"
                className={`cadastro-tipo-pro-card ${tipoProfissional === 'autonomo' ? 'cadastro-tipo-pro-card--ativo' : ''}`}
                onClick={() => setTipoProfissional('autonomo')}
              >
                <User size={18} />
                <span>Autônomo</span>
                <small>Profissional individual</small>
              </button>
              <button
                type="button"
                className={`cadastro-tipo-pro-card ${tipoProfissional === 'empresa' ? 'cadastro-tipo-pro-card--ativo' : ''}`}
                onClick={() => setTipoProfissional('empresa')}
              >
                <Building2 size={18} />
                <span>Empresa</span>
                <small>Negócio com CNPJ</small>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DIREITO — Formulário ===== */}
      <div className="cadastro-form-panel">
        <div className="cadastro-form-card">

          <div className="cadastro-card-logo">
            <Image src="/logo.png" alt="Conecta Solutions" width={110} height={55} />
          </div>

          <div className="cadastro-form-header">
            <h1 className="cadastro-form-title">Criar conta</h1>
            <p className="cadastro-form-subtitle">
              Conta de <strong>{tipo === 'profissional' ? 'Profissional' : 'Cliente'}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="cadastro-form" noValidate>

            {/* Nome */}
            <div className="login-field">
              <label htmlFor="nome" className="login-field-label">
                {tipo === 'profissional' && tipoProfissional === 'empresa' ? 'Nome do Responsável' : 'Nome Completo'}
              </label>
              <div className="login-field-input-wrap">
                <User size={16} className="login-field-icon" />
                <input id="nome" type="text" className="login-field-input"
                  placeholder="Seu nome completo"
                  value={form.nome} onChange={set('nome')} disabled={loading} />
              </div>
            </div>

            {/* Nome do Negócio (apenas para empresa) */}
            {tipo === 'profissional' && tipoProfissional === 'empresa' && (
              <div className="login-field">
                <label htmlFor="nomeNegocio" className="login-field-label">Nome do Negócio</label>
                <div className="login-field-input-wrap">
                  <Building2 size={16} className="login-field-icon" />
                  <input id="nomeNegocio" type="text" className="login-field-input"
                    placeholder="Ex: Barbearia do João"
                    value={form.nomeNegocio} onChange={set('nomeNegocio')} disabled={loading} />
                </div>
              </div>
            )}

            {/* E-mail */}
            <div className="login-field">
              <label htmlFor="cad-email" className="login-field-label">E-mail</label>
              <div className="login-field-input-wrap">
                <Mail size={16} className="login-field-icon" />
                <input id="cad-email" type="email" className="login-field-input"
                  placeholder="seu@email.com" value={form.email}
                  onChange={set('email')} autoComplete="email" disabled={loading} />
              </div>
            </div>

            {/* Telefone */}
            <div className="login-field">
              <label htmlFor="telefone" className="login-field-label">WhatsApp / Telefone</label>
              <div className="login-field-input-wrap">
                <Phone size={16} className="login-field-icon" />
                <input id="telefone" type="tel" className="login-field-input"
                  placeholder="(11) 99999-9999" value={form.telefone}
                  onChange={set('telefone')} disabled={loading} />
              </div>
            </div>

            {/* Campos específicos para Profissionais */}
            {tipo === 'profissional' && (
              <>
                {/* CPF/CNPJ */}
                <div className="login-field">
                  <label htmlFor="cpfCnpj" className="login-field-label">
                    {tipoProfissional === 'empresa' ? 'CNPJ' : 'CPF'}
                  </label>
                  <div className="login-field-input-wrap">
                    <FileText size={16} className="login-field-icon" />
                    <input id="cpfCnpj" type="text" className="login-field-input"
                      placeholder={tipoProfissional === 'empresa' ? '00.000.000/0000-00' : '000.000.000-00'}
                      value={form.cpfCnpj} onChange={set('cpfCnpj')} disabled={loading} />
                  </div>
                </div>

                {/* Especialidade/Categoria */}
                <div className="login-field">
                  <label htmlFor="especialidade" className="login-field-label">Especialidade / Categoria</label>
                  <div className="login-field-input-wrap">
                    <Briefcase size={16} className="login-field-icon" />
                    <input id="especialidade" type="text" className="login-field-input"
                      placeholder="Ex: Barbearia, Manicure, Massagem..."
                      value={form.especialidade} onChange={set('especialidade')} disabled={loading} />
                  </div>
                </div>

                {/* Bio/Descrição */}
                <div className="login-field">
                  <label htmlFor="bio" className="login-field-label">Bio / Descrição <small>(opcional)</small></label>
                  <div className="login-field-input-wrap login-field-input-wrap--textarea">
                    <AlignLeft size={16} className="login-field-icon" />
                    <textarea id="bio" className="login-field-input login-field-input--textarea"
                      placeholder="Conte um pouco sobre você ou seu negócio..."
                      value={form.bio} onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={loading} rows={3} />
                  </div>
                </div>

                {/* Toggle Endereço */}
                <button
                  type="button"
                  className="cadastro-toggle-endereco"
                  onClick={() => setMostrarEndereco(!mostrarEndereco)}
                >
                  <MapPin size={16} />
                  {mostrarEndereco ? 'Ocultar endereço' : 'Adicionar endereço (opcional)'}
                </button>

                {/* Endereço (opcional) */}
                {mostrarEndereco && (
                  <div className="cadastro-endereco-fields">
                    <div className="login-field">
                      <label htmlFor="endereco" className="login-field-label">Endereço</label>
                      <div className="login-field-input-wrap">
                        <MapPin size={16} className="login-field-icon" />
                        <input id="endereco" type="text" className="login-field-input"
                          placeholder="Rua, número, bairro"
                          value={form.endereco} onChange={set('endereco')} disabled={loading} />
                      </div>
                    </div>
                    <div className="cadastro-endereco-row">
                      <div className="login-field">
                        <label htmlFor="cep" className="login-field-label">CEP</label>
                        <div className="login-field-input-wrap">
                          <input id="cep" type="text" className="login-field-input login-field-input--no-icon"
                            placeholder="00000-000" value={form.cep} onChange={set('cep')} disabled={loading} />
                        </div>
                      </div>
                      <div className="login-field">
                        <label htmlFor="cidade" className="login-field-label">Cidade</label>
                        <div className="login-field-input-wrap">
                          <input id="cidade" type="text" className="login-field-input login-field-input--no-icon"
                            placeholder="Sua cidade" value={form.cidade} onChange={set('cidade')} disabled={loading} />
                        </div>
                      </div>
                    </div>
                    <div className="cadastro-endereco-row">
                      <div className="login-field">
                        <label htmlFor="estado" className="login-field-label">Estado</label>
                        <div className="login-field-input-wrap">
                          <input id="estado" type="text" className="login-field-input login-field-input--no-icon"
                            placeholder="UF" value={form.estado} onChange={set('estado')} disabled={loading} maxLength={2} />
                        </div>
                      </div>
                      <div className="login-field">
                        <label htmlFor="pais" className="login-field-label">País</label>
                        <div className="login-field-input-wrap">
                          <input id="pais" type="text" className="login-field-input login-field-input--no-icon"
                            placeholder="País" value={form.pais} onChange={set('pais')} disabled={loading} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Senha */}
            <div className="login-field">
              <label htmlFor="cad-senha" className="login-field-label">Senha</label>
              <div className="login-field-input-wrap">
                <Lock size={16} className="login-field-icon" />
                <input id="cad-senha" type={mostrarSenha ? 'text' : 'password'}
                  className="login-field-input login-field-input--senha"
                  placeholder="Mínimo 6 caracteres" value={form.senha}
                  onChange={set('senha')} disabled={loading} />
                <button type="button" className="login-field-toggle"
                  onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="login-field">
              <label htmlFor="confirmar-senha" className="login-field-label">Confirmar Senha</label>
              <div className="login-field-input-wrap">
                <Lock size={16} className="login-field-icon" />
                <input id="confirmar-senha" type={mostrarSenha ? 'text' : 'password'}
                  className="login-field-input login-field-input--senha"
                  placeholder="Repita a senha" value={form.confirmarSenha}
                  onChange={set('confirmarSenha')} disabled={loading} />
              </div>
            </div>

            {/* Termos de Uso */}
            <div className="cadastro-termos">
              <label className="cadastro-termos-label">
                <input
                  type="checkbox"
                  checked={aceitaTermos}
                  onChange={(e) => setAceitaTermos(e.target.checked)}
                  disabled={loading}
                  className="cadastro-termos-checkbox"
                />
                <span className="cadastro-termos-texto">
                  Li e aceito os{' '}
                  <Link href="/termos" target="_blank" className="cadastro-termos-link">
                    Termos de Uso
                  </Link>{' '}
                  e{' '}
                  <Link href="/privacidade" target="_blank" className="cadastro-termos-link">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
            </div>

            <button type="submit"
              className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
              disabled={loading}>
              {loading ? <><span className="login-btn-spinner" />Criando conta...</> : 'Criar Conta Grátis'}
            </button>
          </form>

          <div className="login-signup-link">
            <p>Já tem conta?{' '}
              <Link href="/login" className="login-signup-anchor">Entrar agora</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
