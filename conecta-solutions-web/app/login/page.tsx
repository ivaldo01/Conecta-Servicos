'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import '@/styles/login.css';

// ============================================================
// TELA DE LOGIN
// Autentica com o mesmo Firebase do app mobile.
// O perfil (profissional/cliente) é detectado automaticamente.
// ============================================================
export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tradução dos códigos de erro do Firebase para PT-BR
  const traduzirErro = (code: string): string => {
    const erros: Record<string, string> = {
      'auth/user-not-found':         'E-mail não encontrado.',
      'auth/wrong-password':         'Senha incorreta.',
      'auth/invalid-email':          'E-mail inválido.',
      'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos.',
      'auth/network-request-failed': 'Erro de conexão. Verifique a internet.',
      'auth/invalid-credential':     'E-mail ou senha incorretos.',
    };
    return erros[code] || 'Ocorreu um erro. Tente novamente.';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !senha) { toast.error('Preencha todos os campos.'); return; }
    setLoading(true);
    try {
      await login(email.trim(), senha);
      toast.success('Bem-vindo ao Conecta Solutions!');
      router.push('/dashboard');
    } catch (err: unknown) {
      toast.error(traduzirErro((err as { code?: string }).code || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">

      {/* ===== PAINEL ESQUERDO — Logo + Conteúdo animado ===== */}
      <div className="login-brand">
        <div className="login-brand-inner">

          {/* Logo — usando componente Image para melhor gestão de preload */}
          <div className="login-brand-logo-wrap" style={{ position: 'relative', width: '300px', height: '150px', margin: '0 auto' }}>
            <Image
              src="/logo-cs.png"
              alt="Conecta Solutions"
              fill
              priority
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.35))',
                animation: 'fadeInDown 0.6s ease both',
              }}
            />
          </div>

          {/* Headline — fadeInUp com delay */}
          <h2
            className="login-brand-headline"
            style={{ animation: 'fadeInUp 0.55s ease 0.2s both' }}
          >
            Gerencie seu negócio de qualquer lugar
          </h2>

          {/* Descrição */}
          <p
            className="login-brand-desc"
            style={{ animation: 'fadeInUp 0.55s ease 0.32s both' }}
          >
            Agenda, financeiro, equipe e clientes — tudo em um painel corporativo.
            O mesmo app do celular, agora no computador.
          </p>

          {/* Benefícios — cada item com delay crescente */}
          <ul className="login-brand-benefits">
            {[
              { texto: 'Agenda sincronizada em tempo real com o app mobile', delay: '0.42s' },
              { texto: 'Dashboard financeiro com gráficos e relatórios',     delay: '0.50s' },
              { texto: 'Gerenciamento completo de equipe e serviços',         delay: '0.58s' },
              { texto: 'Instalável no Windows e Mac como app nativo',         delay: '0.66s' },
            ].map(({ texto, delay }) => (
              <li
                key={texto}
                className="login-brand-benefit-item"
                style={{ animation: `fadeInUp 0.45s ease ${delay} both` }}
              >
                <span className="login-brand-benefit-dot" />
                {texto}
              </li>
            ))}
          </ul>

          {/* Banner decorativo */}
          <div
            className="login-brand-banner-wrap"
            style={{ animation: 'fadeInUp 0.5s ease 0.76s both' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banner-web.png" alt="Painel Conecta Solutions" className="login-brand-banner" />
          </div>
        </div>
      </div>


      {/* ===== PAINEL DIREITO — Formulário ===== */}
      <div className="login-form-panel">
        <div className="login-form-card">

          {/* Logo no topo do card (mobile) */}
          <div className="login-card-logo">
            <Image src="/logo.png" alt="Conecta Solutions" width={120} height={60} />
          </div>

          <div className="login-form-header">
            <h1 className="login-form-title">Entrar na conta</h1>
            <p className="login-form-subtitle">Use as mesmas credenciais do aplicativo mobile</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>

            <div className="login-field">
              <label htmlFor="email" className="login-field-label">E-mail</label>
              <div className="login-field-input-wrap">
                <Mail size={16} className="login-field-icon" />
                <input id="email" type="email" className="login-field-input"
                  placeholder="seu@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email" disabled={loading} />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="senha" className="login-field-label">Senha</label>
              <div className="login-field-input-wrap">
                <Lock size={16} className="login-field-icon" />
                <input id="senha" type={mostrarSenha ? 'text' : 'password'}
                  className="login-field-input login-field-input--senha"
                  placeholder="••••••••" value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password" disabled={loading} />
                <button type="button" className="login-field-toggle"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit"
              className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
              disabled={loading}>
              {loading ? <><span className="login-btn-spinner" />Entrando...</> : 'Entrar no Painel'}
            </button>
          </form>

          {/* Link para cadastro */}
          <div className="login-signup-link">
            <p>Não tem conta?{' '}
              <Link href="/cadastro" className="login-signup-anchor">Criar conta grátis</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
