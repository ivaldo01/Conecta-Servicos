'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
      // Atualiza o documento do colaborador
      const colabRef = doc(db, 'colaboradores', uid);
      await updateDoc(colabRef, {
        senhaTemporaria: novaSenha, // No nosso sistema híbrido, a senha oficial é essa
        precisaTrocarSenha: false // Libera o acesso
      });

      toast.success('Senha definida com sucesso! Bem-vindo.');
      // O onSnapshot no lib/auth vai detectar a mudança e fechar o modal automaticamente
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar senha.');
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
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-forced-card {
          background: white;
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
          animation: scaleUp 0.3s ease-out;
        }
        .modal-forced-icon {
          background: #FFF7ED;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .modal-forced-header h2 {
          font-size: 20px;
          font-weight: 800;
          color: #1E293B;
          margin-bottom: 8px;
        }
        .modal-forced-header p {
          font-size: 14px;
          color: #64748B;
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .modal-forced-form {
          text-align: left;
        }
        .w-full { width: 100%; margin-top: 10px; }
        .modal-forced-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #F1F5F9;
        }
        .modal-forced-footer p {
          font-size: 12px;
          color: #94A3B8;
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
