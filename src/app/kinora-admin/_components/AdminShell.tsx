'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Video,
  FileText,
  Bot,
  Sparkles,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  Shield,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { isStaffEmail, isStaffMetadataRole } from '../_lib/staff-gate';

interface NavNode {
  href: string;
  icon: LucideIcon;
  label: string;
}

const NAV_TREE: NavNode[] = [
  { href: '/kinora-admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/kinora-admin/pazienti', icon: Stethoscope, label: 'Pazienti' },
  { href: '/kinora-admin/staff', icon: Users, label: 'Staff' },
  { href: '/kinora-admin/accessi', icon: Shield, label: 'Accessi applicativi' },
  { href: '/kinora-admin/diari', icon: BookOpen, label: 'Diari' },
  { href: '/kinora-admin/video', icon: Video, label: 'Video' },
  { href: '/kinora-admin/contratti', icon: FileText, label: 'Contratti' },
  { href: '/kinora-admin/agents', icon: Bot, label: 'Agents AI' },
  { href: '/kinora-admin/configurazione', icon: Settings, label: 'Configurazione' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabaseUser, loading } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Block body scroll when mobile drawer open
  useEffect(() => {
    if (!isMobile) return;
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobile, drawerOpen]);

  // Auth gate
  useEffect(() => {
    if (loading) return;
    if (!supabaseUser) {
      router.replace('/login?next=/kinora-admin');
      return;
    }
    const allowed =
      isStaffEmail(supabaseUser.email) ||
      isStaffMetadataRole((supabaseUser.user_metadata as Record<string, unknown> | null)?.role);
    if (!allowed) {
      router.replace('/');
      return;
    }
    setAuthChecked(true);
  }, [loading, supabaseUser, router]);

  if (loading || !authChecked) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b1220',
          color: '#cbd5e1',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        <Sparkles size={18} className="animate-pulse" />
      </div>
    );
  }

  const sidebarExpanded = isMobile ? true : sidebarHovered;
  const showSidebarLabels = sidebarExpanded;

  async function handleLogout() {
    await supabase().auth.signOut();
    router.push('/login');
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        overflow: 'hidden',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        background: '#f8fafc',
      }}
    >
      {isMobile && drawerOpen && (
        <div
          aria-hidden
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            zIndex: 90,
          }}
        />
      )}

      <aside
        onMouseEnter={isMobile ? undefined : () => setSidebarHovered(true)}
        onMouseLeave={isMobile ? undefined : () => setSidebarHovered(false)}
        style={
          isMobile
            ? {
                position: 'fixed',
                inset: '0 auto 0 0',
                width: 260,
                maxWidth: '85vw',
                background: '#0b1220',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-105%)',
                transition: 'transform 0.22s ease-out',
                boxShadow: drawerOpen ? '0 12px 40px rgba(0,0,0,0.4)' : 'none',
                borderRight: '1px solid rgba(148,163,184,0.08)',
              }
            : {
                width: sidebarExpanded ? 240 : 64,
                flexShrink: 0,
                background: '#0b1220',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid rgba(148,163,184,0.08)',
                transition: 'width 0.18s ease-out',
                overflow: 'hidden',
              }
        }
      >
        {/* Brand */}
        <div
          style={{
            padding: '22px 20px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #E85A7A 0%, #6B5DA8 60%, #322A6E 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(232,90,122,0.35)',
              fontFamily: 'var(--font-playfair), Georgia, serif',
              color: '#fff',
              fontSize: 19,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            K
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              opacity: showSidebarLabels ? 1 : 0,
              transition: 'opacity 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            <div
              style={{
                color: '#f1f5f9',
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '-0.2px',
              }}
            >
              Kinora Admin
            </div>
            <div style={{ color: '#475569', fontSize: 10, letterSpacing: '0.08em' }}>
              STAFF
            </div>
          </div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Chiudi menu"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(148,163,184,0.1)',
                border: '1px solid rgba(148,163,184,0.18)',
                color: '#cbd5e1',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* User */}
        <div
          style={{
            padding: '16px 16px',
            borderBottom: '1px solid rgba(148,163,184,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              flexShrink: 0,
              border: '2px solid #6366f1',
            }}
          >
            {(supabaseUser?.email || '?')[0].toUpperCase()}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              opacity: showSidebarLabels ? 1 : 0,
              transition: 'opacity 0.12s',
            }}
          >
            <div
              style={{
                color: '#e2e8f0',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {((supabaseUser?.user_metadata as Record<string, unknown> | null)?.name as string) ||
                supabaseUser?.email?.split('@')[0] ||
                'Staff'}
            </div>
            <div
              style={{
                color: '#64748b',
                fontSize: 11,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {supabaseUser?.email}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {NAV_TREE.map((node) => {
            const Icon = node.icon;
            const active =
              pathname === node.href ||
              (node.href !== '/kinora-admin' && pathname.startsWith(node.href));
            return (
              <Link
                key={node.href}
                href={node.href}
                onClick={() => isMobile && setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 9,
                  color: active ? '#f1f5f9' : '#94a3b8',
                  background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  transition: 'background 0.12s, color 0.12s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span
                  style={{
                    opacity: showSidebarLabels ? 1 : 0,
                    transition: 'opacity 0.12s',
                  }}
                >
                  {node.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          style={{
            padding: '12px 8px 16px',
            borderTop: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 9,
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'background 0.12s, color 0.12s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            <LogOut size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ opacity: showSidebarLabels ? 1 : 0, transition: 'opacity 0.12s' }}>
              Esci
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: 56,
            flexShrink: 0,
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 12,
          }}
        >
          {isMobile && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Apri menu"
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
              }}
            >
              <Menu size={18} />
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            aria-label="Notifiche"
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <Bell size={17} />
          </button>
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '20px 16px' : '28px 32px',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
