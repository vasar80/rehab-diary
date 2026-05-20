'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AppWindow,
  Users,
  BookOpen,
  Video,
  FileText,
  Bot,
  Sparkles,
  LogOut,
  UserCircle,
  Menu,
  X,
  Bell,
  Settings,
  Settings2,
  Shield,
  Stethoscope,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { isStaffEmail, isStaffMetadataRole } from '../_lib/staff-gate';
import VersionWatcher from '@/components/VersionWatcher';

interface NavNode {
  href: string;
  icon: LucideIcon;
  label: string;
  children?: NavNode[];
}

const NAV_TREE: NavNode[] = [
  { href: '/kinora-admin', icon: LayoutDashboard, label: 'Overview' },
  {
    href: '/kinora-admin/applicativi',
    icon: AppWindow,
    label: 'Applicativi',
    children: [
      { href: '/kinora-admin/pazienti', icon: Stethoscope, label: 'Pazienti' },
      { href: '/kinora-admin/accessi', icon: Shield, label: 'Accessi applicativi' },
      { href: '/kinora-admin/tier-config', icon: Settings2, label: 'Configurazione tier' },
      { href: '/kinora-admin/diari', icon: BookOpen, label: 'Diari' },
      { href: '/kinora-admin/video', icon: Video, label: 'Video' },
      { href: '/kinora-admin/contratti', icon: FileText, label: 'Contratti' },
      { href: '/kinora-admin/agenti', icon: Bot, label: 'Agenti AI' },
      { href: '/kinora-admin/configurazione', icon: Settings, label: 'Configurazione' },
    ],
  },
];

/**
 * Returns true when the given node's branch is "active" — i.e. the
 * current pathname matches the node href, or any of its descendants.
 */
function isOnPath(pathname: string, node: NavNode): boolean {
  if (pathname === node.href) return true;
  if (node.children) {
    return node.children.some((c) => isOnPath(pathname, c));
  }
  // Match descendants of intermediate nodes like /kinora-admin/<app>/*
  if (node.href !== '/kinora-admin' && pathname.startsWith(node.href + '/')) {
    return true;
  }
  return false;
}

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

  function renderNavNode(node: NavNode, depth = 0): ReactNode {
    const Icon = node.icon;
    const active = pathname === node.href;
    const branchActive = isOnPath(pathname, node);
    const showChildren = !!node.children && branchActive;

    return (
      <div key={node.href}>
        <Link
          href={node.href}
          onClick={() => isMobile && setDrawerOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: depth === 0 ? '10px 12px' : '8px 12px 8px 36px',
            borderRadius: 9,
            color: active ? '#f1f5f9' : '#94a3b8',
            background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: depth === 0 ? 13 : 12,
            fontWeight: active ? 600 : 500,
            transition: 'background 0.12s, color 0.12s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            marginBottom: 1,
          }}
        >
          <Icon size={depth === 0 ? 17 : 15} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span
            style={{
              opacity: showSidebarLabels ? 1 : 0,
              transition: 'opacity 0.12s',
              flex: 1,
            }}
          >
            {node.label}
          </span>
          {node.children && showSidebarLabels && (
            <ChevronRight
              size={13}
              strokeWidth={2.5}
              style={{
                transform: showChildren ? 'rotate(90deg)' : 'rotate(0)',
                transition: 'transform 0.15s',
                color: '#475569',
                flexShrink: 0,
              }}
            />
          )}
        </Link>
        {showChildren && node.children?.map((child) => renderNavNode(child, depth + 1))}
      </div>
    );
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
      <VersionWatcher endpoint="/api/version/admin" tone="admin" />
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
          {NAV_TREE.map((node) => renderNavNode(node))}
        </nav>

        <div
          style={{
            padding: '12px 8px 16px',
            borderTop: '1px solid rgba(148,163,184,0.08)',
          }}
        >
          <Link
            href="/profilo"
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
              textDecoration: 'none',
              marginBottom: 4,
            }}
          >
            <UserCircle size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ opacity: showSidebarLabels ? 1 : 0, transition: 'opacity 0.12s' }}>
              Profilo · cambia password
            </span>
          </Link>
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

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
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
