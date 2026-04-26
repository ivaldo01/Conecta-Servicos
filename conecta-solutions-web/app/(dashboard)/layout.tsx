'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { ConfigProvider } from '@/lib/useConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth, updatePassword } from 'firebase/auth';
import { Lock, Check, X, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import '@/styles/dashboard-layout.css';

// ============================================================
// DASHBOARD LAYOUT
// ============================================================
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, dadosUsuario, loading } = useAuth();
  const router = useRouter();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ConfigProvider>
      <div className="dashboard-root">
        <Sidebar />
        <div className="dashboard-content">
          {children}
        </div>

        {/* MODAL DE TROCA DE SENHA OBRIGATÓRIA (Apenas para Colaboradores no 1º acesso) */}
        {dadosUsuario?.perfil === 'colaborador' && (dadosUsuario as any).precisaTrocarSenha && (
          <ModalTrocaSenha uid={dadosUsuario.uid} />
        )}
      </div>
    </ConfigProvider>
  );
}

// ============================================================
// COMPONENTE: MODAL DE TROCA DE SENHA
// ============================================================
function ModalTrocaSenha({ uid }: { uid: string }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmar) {
      toast.error('As senhas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      // 1. Atualiza a senha no Firebase Auth
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updatePassword(currentUser, novaSenha);
        console.log('[ModalTrocaSenha] Senha atualizada no Firebase Auth');
      }

      // 2. Atualiza o documento do colaborador no Firestore
      const colabRef = doc(db, 'colaboradores', uid);
      await updateDoc(colabRef, {
        senhaTemporaria: novaSenha,
        precisaTrocarSenha: false
      });

      toast.success('Senha definida com sucesso! Bem-vindo.');
      
      // Recarrega para atualizar o auth context
      window.location.reload();
    } catch (err: any) {
      console.error('[ModalTrocaSenha] Erro:', err);
      if (err.code === 'auth/requires-recent-login') {
        toast.error('Por segurança, faça login novamente antes de trocar a senha.');
      } else {
        toast.error('Erro ao atualizar senha.');
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-forced-overlay">
      <div className="modal-forced-card">
        <div className="modal-forced-icon">
          <ShieldAlert size={32} color="#F59E0B" />
        </div>
        
        <div className="modal-forced-header">
          <h2>Segurança Necessária</h2>
          <p>Para sua proteção, escolha uma senha pessoal para acessar o painel.</p>
        </div>

        <form onSubmit={handleSalvar} className="modal-forced-form">
          <div className="campo-grupo">
            <label className="campo-label"><Lock size={12} /> Nova Senha</label>
            <input 
              type="password" 
              className="campo-input" 
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="Digite sua nova senha"
              required
            />
          </div>

          <div className="campo-grupo">
            <label className="campo-label"><Lock size={12} /> Confirmar Senha</label>
            <input 
              type="password" 
              className="campo-input" 
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Definir Nova Senha'}
          </button>
        </form>

        <div className="modal-forced-footer">
          <p>Sua senha temporária será desativada imediatamente.</p>
        </div>
      </div>

      <style jsx>{`
        .modal-forced-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: fadeIn 0.4s ease-out;
        }
        .modal-forced-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
          width: 100%;
          max-width: 440px;
          border-radius: 28px;
          padding: 40px 36px;
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 20px 40px -15px rgba(99, 102, 241, 0.15);
          text-align: center;
          animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }
        .modal-forced-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
        }
        .modal-forced-icon {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 
            0 10px 25px -5px rgba(245, 158, 11, 0.3),
            0 0 0 4px rgba(245, 158, 11, 0.1);
          animation: pulseIcon 2s ease-in-out infinite;
        }
        .modal-forced-header h2 {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .modal-forced-header p {
          font-size: 15px;
          color: #64748b;
          margin-bottom: 32px;
          line-height: 1.6;
          max-width: 320px;
          margin-left: auto;
          margin-right: auto;
        }
        .modal-forced-form {
          text-align: left;
        }
        .campo-grupo {
          margin-bottom: 20px;
        }
        .campo-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .campo-input {
          width: 100%;
          padding: 14px 16px;
          font-size: 15px;
          color: #0f172a;
          background: #ffffff;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.2s ease;
          outline: none;
        }
        .campo-input:hover {
          border-color: #cbd5e1;
        }
        .campo-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .campo-input::placeholder {
          color: #94a3b8;
        }
        .btn-primary {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
          margin-top: 16px;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .modal-forced-footer {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }
        .modal-forced-footer p {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
