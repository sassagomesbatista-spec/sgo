'use client';

import { useState } from 'react';
import Link from 'next/link';
import { logoutAction } from '@/app/actions';
import Icon from '@/app/icons';

function NavGroup({ label, children }) {
  return (
    <div className="nav-group">
      {label && <div className="nav-group-label">{label}</div>}
      {children}
    </div>
  );
}

function NavItem({ href, icon, children, onNavigate }) {
  return (
    <Link href={href} prefetch={false} className="nav-item" onClick={onNavigate}>
      <Icon name={icon} />
      <span>{children}</span>
    </Link>
  );
}

export default function Sidebar({ session }) {
  const [open, setOpen] = useState(false);
  const isAdmin = session.role === 'admin';
  const isPilotista = session.role === 'pilotista';
  const close = () => setOpen(false);

  return (
    <>
      <header className="topbar">
        <button
          className="menu-toggle"
          type="button"
          aria-label="Abrir menu"
          onClick={() => setOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <div className="topbar-brand">Pilotagem</div>
      </header>

      {open && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">Pilotagem</div>

        <nav className="sidebar-nav">
          {isPilotista && (
            <NavGroup>
              <NavItem href="/pilotagem" icon="scissors" onNavigate={close}>
                Minhas Peças
              </NavItem>
            </NavGroup>
          )}

          {!isPilotista && (
            <>
              <NavGroup>
                {isAdmin && (
                  <NavItem href="/dashboard" icon="home" onNavigate={close}>
                    Painel
                  </NavItem>
                )}
                <NavItem href="/ordens" icon="boxes" onNavigate={close}>
                  Ordens de Produção
                </NavItem>
                <NavItem href="/lancar" icon="plus-circle" onNavigate={close}>
                  Lançar Peça
                </NavItem>
                <NavItem href="/lancamentos" icon="list" onNavigate={close}>
                  Lançamentos
                </NavItem>
              </NavGroup>

              <NavGroup label="Cadastros">
                <NavItem href="/clientes" icon="users" onNavigate={close}>
                  Clientes
                </NavItem>
                <NavItem href="/modelistas" icon="user" onNavigate={close}>
                  Modelistas
                </NavItem>
                <NavItem href="/tamanhos" icon="tag" onNavigate={close}>
                  Tamanhos
                </NavItem>
                {isAdmin && (
                  <NavItem href="/pilotistas" icon="scissors" onNavigate={close}>
                    Pilotistas
                  </NavItem>
                )}
              </NavGroup>

              {isAdmin && (
                <NavGroup label="Administração">
                  <NavItem href="/precos" icon="dollar" onNavigate={close}>
                    Preços
                  </NavItem>
                  <NavItem href="/relatorio" icon="file" onNavigate={close}>
                    Relatório
                  </NavItem>
                </NavGroup>
              )}
            </>
          )}

          <NavGroup>
            <NavItem href="/conta" icon="account" onNavigate={close}>
              Conta
            </NavItem>
          </NavGroup>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{session.nome}</span>
            <span className="sidebar-user-role">
              {isAdmin ? 'Administradora' : isPilotista ? 'Pilotista' : 'Assistente'}
            </span>
          </div>
          <form action={logoutAction}>
            <button className="nav-item nav-item-logout" type="submit">
              <Icon name="logout" />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
