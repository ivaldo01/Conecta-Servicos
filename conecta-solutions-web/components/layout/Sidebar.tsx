'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  Activity, Calendar, Settings, Users, Wallet,
  Star, User, MessageCircle, Search, FileText,
  Heart, ChevronRight, LogOut, Crown,
  Shield, Bell, Radio, Stethoscope,
  Megaphone, Building2, Mail
} from 'lucide-react';
import '@/styles/sidebar.css';

// ============================================================
// INTERFACE — Definição de um item de menu
// ============================================================
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// ============================================================
// ITENS DE MENU — PROFISSIONAL
// ============================================================
const navProfissional: NavItem[] = [
  { label: 'Dashboard',   href: '/dashboard',    icon: <Activity size={18} /> },
  { label: 'Agenda',      href: '/agenda',       icon: <Calendar size={18} /> },
  { label: 'Serviços',    href: '/servicos',     icon: <Settings size={18} /> },
  { label: 'Equipe',      href: '/equipe',       icon: <Users size={18} /> },
  { label: 'Financeiro',  href: '/financeiro',   icon: <Wallet size={18} /> },
  { label: 'Relatórios',  href: '/relatorios',   icon: <FileText size={18} /> },
  { label: 'Avaliações',  href: '/avaliacoes',   icon: <Star size={18} /> },
  { label: 'VIP',         href: '/vip',          icon: <Crown size={18} /> },
  { label: 'Suporte',     href: '/suporte',      icon: <MessageCircle size={18} /> },
  { label: 'Perfil',      href: '/perfil',       icon: <User size={18} /> },
];

// ============================================================
// ITENS DE MENU — ADMINISTRATIVO (HQ)
// ============================================================
const navAdmin: NavItem[] = [
  { label: 'Visão Geral',     href: '/admin',             icon: <Activity size={18} /> },
  { label: 'Usuários',        href: '/admin/usuarios',    icon: <Users size={18} /> },
  { label: 'Verificações',    href: '/admin/verificacoes',icon: <Shield size={18} /> },
  { label: 'Suporte Master',  href: '/admin/suporte',     icon: <MessageCircle size={18} /> },
  { label: 'Faturamento',     href: '/admin/financeiro',  icon: <Activity size={18} /> },
  { label: 'Monitor',         href: '/admin/monitor',     icon: <Radio size={18} /> },
  { label: 'Diagnóstico',     href: '/admin/diagnostico', icon: <Stethoscope size={18} /> },
  { label: 'Campanhas',       href: '/admin/campanhas',   icon: <Bell size={18} /> },
  { label: 'Equipe Adm',      href: '/admin/equipe',      icon: <Users size={18} /> },
  { label: 'Configurações',   href: '/admin/ajustes',     icon: <Settings size={18} /> },
];

// ============================================================
// ITENS DE MENU — CLIENTE
// ============================================================
const navCliente: NavItem[] = [
  { label: 'Início',          href: '/dashboard',       icon: <Activity size={18} /> },
  { label: 'Buscar',          href: '/busca',           icon: <Search size={18} /> },
  { label: 'Agendamentos',    href: '/agendamentos',    icon: <FileText size={18} /> },
  { label: 'Meus Contratos',  href: '/contratos',       icon: <FileText size={18} /> },
  { label: 'Favoritos',       href: '/favoritos',       icon: <Heart size={18} /> },
  { label: 'Avaliações',      href: '/avaliacoes',      icon: <Star size={18} /> },
  { label: 'VIP',             href: '/vip',             icon: <Crown size={18} /> },
  { label: 'Suporte',         href: '/suporte',         icon: <MessageCircle size={18} /> },
  { label: 'Perfil',          href: '/perfil',          icon: <User size={18} /> },
];

// ============================================================
// COMPONENTE PRINCIPAL — SIDEBAR
// ============================================================
export default function Sidebar() {
  const { dadosUsuario, ehProfissional, ehAdmin, logout } = useAuth();
  const pathname = usePathname();

  // Seleciona os itens de navegação conforme o perfil
  let navItems = navCliente;
  if (ehAdmin) navItems = navAdmin;
  else if (ehProfissional) navItems = navProfissional;

  // Iniciais do nome para o avatar (lógica resiliente)
  const iniciais = (dadosUsuario?.nome || 'C')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('') || 'CS';

  return (
    <aside className="sidebar">
      {/* ===== LOGO ===== */}
      <div className="sidebar-logo">
        <img src="/logo-cs.png" alt="Conecta Solutions" className="sidebar-logo-img" />
      </div>

      {/* ===== PERFIL DO USUÁRIO ===== */}
      <div className="sidebar-user-premium">
        <div className="sidebar-user-banner-thumb">
          {(dadosUsuario?.bannerPerfil || dadosUsuario?.banner || dadosUsuario?.bannerUrl || dadosUsuario?.fotoBanner) ? (
            <img
              src={(dadosUsuario.bannerPerfil || dadosUsuario.banner || dadosUsuario.bannerUrl || dadosUsuario.fotoBanner) as string}
              alt="Banner"
            />
          ) : (
            <div className="sidebar-banner-placeholder" />
          )}
        </div>

        <div className="sidebar-user-content">
          <div className="sidebar-user-avatar-premium">
            {(dadosUsuario?.fotoPerfil || dadosUsuario?.foto || dadosUsuario?.avatar || dadosUsuario?.fotoUrl) ? (
              <img
                src={(dadosUsuario.fotoPerfil || dadosUsuario.foto || dadosUsuario.avatar || dadosUsuario.fotoUrl) as string}
                alt="Avatar"
              />
            ) : (
              <div className="avatar-fallback">{iniciais}</div>
            )}
          </div>
          <div className="sidebar-user-info-premium">
            <p className="sidebar-user-name-premium">{dadosUsuario?.nome || 'Usuário'}</p>
            <p className="sidebar-user-role-premium">
              {ehAdmin ? 'Administrador' : ehProfissional ? 'Profissional' : 'Cliente'}
            </p>
          </div>
        </div>
      </div>

      {/* ===== NAVEGAÇÃO ===== */}
      <nav className="sidebar-nav">
        <p className="sidebar-nav-label">
          {ehAdmin ? 'Administração' : ehProfissional ? 'Minha Gestão' : 'Menu Principal'}
        </p>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + '/'));
          const isCampanhas = item.href === '/admin/campanhas';
          const isCampanhasSection = pathname?.startsWith('/admin/campanhas');
          
          return (
            <React.Fragment key={item.href}>
              <Link
                href={item.href}
                className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`}
              >
                <span className="sidebar-nav-item-icon">{item.icon}</span>
                <span className="sidebar-nav-item-label">{item.label}</span>
                {isActive && <ChevronRight size={14} className="sidebar-nav-item-arrow" />}
              </Link>
              
              {/* Submenu Campanhas */}
              {isCampanhas && isCampanhasSection && (
                <>
                  <Link
                    href="/admin/campanhas/anuncios"
                    className={`sidebar-nav-item sidebar-nav-subitem ${pathname?.startsWith('/admin/campanhas/anuncios') ? 'sidebar-nav-item--active' : ''}`}
                    style={{ paddingLeft: 40 }}
                  >
                    <span className="sidebar-nav-item-icon"><Megaphone size={16} /></span>
                    <span className="sidebar-nav-item-label">Anúncios</span>
                  </Link>
                  <Link
                    href="/admin/campanhas/anunciantes"
                    className={`sidebar-nav-item sidebar-nav-subitem ${pathname?.startsWith('/admin/campanhas/anunciantes') ? 'sidebar-nav-item--active' : ''}`}
                    style={{ paddingLeft: 40 }}
                  >
                    <span className="sidebar-nav-item-icon"><Building2 size={16} /></span>
                    <span className="sidebar-nav-item-label">Anunciantes</span>
                  </Link>
                  <Link
                    href="/admin/campanhas/email"
                    className={`sidebar-nav-item sidebar-nav-subitem ${pathname?.startsWith('/admin/campanhas/email') ? 'sidebar-nav-item--active' : ''}`}
                    style={{ paddingLeft: 40 }}
                  >
                    <span className="sidebar-nav-item-icon"><Mail size={16} /></span>
                    <span className="sidebar-nav-item-label">Email</span>
                  </Link>
                </>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* ===== SAIR ===== */}
      <div className="sidebar-footer">
        <button onClick={logout} className="sidebar-logout-btn">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
