'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import '@/styles/topbar.css';

// ============================================================
// TOPBAR — Barra superior do painel
// ============================================================
interface TopbarProps {
  title: string;                    // Título da página atual
  subtitle?: string;                // Subtítulo opcional
  action?: React.ReactNode;         // Botão/ação opcional (ex: "+ Adicionar")
}

export default function Topbar({ title, subtitle, action }: TopbarProps) {
  const { dadosUsuario } = useAuth();

  // Saudação dinâmica
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <header className="topbar">
      <div className="topbar-title-area">
        <h1 className="topbar-title">{title}</h1>
        {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
      </div>

      <div className="topbar-actions">
        {action && <div className="topbar-page-action">{action}</div>}

        <button className="topbar-icon-btn" aria-label="Notificações">
          <Bell size={18} />
          <span className="topbar-notification-dot" />
        </button>

        <div className="topbar-user">
          <span className="topbar-greeting">
            {saudacao}, <strong>{dadosUsuario?.nome?.split(' ')[0] || 'Usuário'}</strong>
          </span>
        </div>
      </div>
    </header>
  );
}
