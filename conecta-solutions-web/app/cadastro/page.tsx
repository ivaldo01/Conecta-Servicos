'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Eye, EyeOff, Mail, Lock, User, Phone, Building2, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import '@/styles/cadastro.css';

// ============================================================
// TIPOS DE CONTA
// ============================================================
type TipoConta = 'profissional' | 'cliente';

interface FormCadastro {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
}

const FORM_INICIAL: FormCadastro = {
  nome: '', email: '', telefone: '', senha: '', confirmarSenha: ''
};

// ============================================================
// TELA DE CADASTRO
// Cria conta no mesmo Firebase do app mobile.
// Profisionais e clientes usam o mesmo fluxo com campos distintos.
// ============================================================
export default function CadastroPage() {
  const router = useRouter();

  const [tipo, setTipo] = useState<TipoConta>('cliente');
  const [form, setForm] = useState<FormCadastro>(FORM_INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (campo: keyof FormCadastro) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [campo]: e.target.value }));

  // Validações antes de cadastrar
  const validar = (): string | null => {
    if (!form.nome.trim())  return 'Informe seu nome completo.';
    if (!form.email.trim()) return 'Informe seu e-mail.';
    if (!form.telefone.trim()) return 'Informe seu telefone/WhatsApp.';
    if (form.senha.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    if (form.senha !== form.confirmarSenha) return 'As senhas não coincidem.';
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
        
        transaction.set(counterRef, { usuarios: currentCount }, { merge: true });
        transaction.set(userRef, {
          uid:          user.uid,
          nome:         form.nome.trim(),
          nomeCompleto: form.nome.trim(),
          email:        form.email.trim().toLowerCase(),
          whatsapp:     form.telefone.trim(),
          telefone:     form.telefone.trim(),
          tipo,            // 'profissional' | 'cliente'
          perfil:       tipo,
          planoAtivo:   tipo === 'profissional' ? 'pro_iniciante' : 'free',
          codigoConecta: codigoConecta, // ID OFICIAL GERADO
          aceitouTermos: true,
          ativo:        true,
          criadoEm:     serverTimestamp(),
          criadoVia:    'web',
        });
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
                {tipo === 'profissional' ? 'Nome ou Nome do Negócio' : 'Nome Completo'}
              </label>
              <div className="login-field-input-wrap">
                {tipo === 'profissional' ? <Building2 size={16} className="login-field-icon" /> : <User size={16} className="login-field-icon" />}
                <input id="nome" type="text" className="login-field-input"
                  placeholder={tipo === 'profissional' ? 'Ex: Barbearia do João' : 'Seu nome completo'}
                  value={form.nome} onChange={set('nome')} disabled={loading} />
              </div>
            </div>

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
