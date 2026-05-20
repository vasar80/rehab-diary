'use client';

import { useRouter } from 'next/navigation';
import {
  Menu,
  X,
  BookOpen,
  Video,
  CalendarDays,
  Edit3,
  Search,
  FileText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Wordmark from './Wordmark';

type ActionKey =
  | 'diary'
  | 'video'
  | 'appointments'
  | 'contract'
  | 'apps'
  | 'record';

const ACTIONS: { key: ActionKey; icon: React.ReactNode; label: string }[] = [
  { key: 'diary', icon: <BookOpen size={20} strokeWidth={1.7} />, label: 'Compila il diario di oggi' },
  { key: 'apps', icon: <Sparkles size={20} strokeWidth={1.7} />, label: 'I tuoi esercizi' },
  { key: 'record', icon: <TrendingUp size={20} strokeWidth={1.7} />, label: 'I tuoi record' },
  { key: 'video', icon: <Video size={20} strokeWidth={1.7} />, label: 'Carica video' },
  { key: 'appointments', icon: <CalendarDays size={20} strokeWidth={1.7} />, label: 'Prossimi appuntamenti' },
  { key: 'contract', icon: <FileText size={20} strokeWidth={1.7} />, label: 'Compila il contratto' },
];

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNewChat?: () => void;
  history?: { id: string; title: string }[];
  onSelectChat?: (id: string) => void;
}

export default function SideMenu({ open, onClose, onNewChat, history = [], onSelectChat }: SideMenuProps) {
  const router = useRouter();

  function handleAction(key: ActionKey) {
    onClose();
    if (key === 'diary') router.push('/?mode=diary');
    else if (key === 'video') router.push('/video');
    else if (key === 'appointments') router.push('/?prompt=appointments');
    else if (key === 'contract') router.push('/?mode=contract');
    else if (key === 'apps') router.push('/apps');
    else if (key === 'record') router.push('/record');
  }

  function handleNewChat() {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/?new=1');
    }
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] animate-fade-in">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={onClose} />
        <aside
          className="absolute top-0 bottom-0 left-0 w-[88%] max-w-sm bg-stone-50 border-r border-stone-200 shadow-2xl shadow-stone-900/20 flex flex-col"
          style={{ animation: 'slide-in-left 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
          <div className="px-5 pt-12 pb-3 flex items-center justify-between">
            <Wordmark text="Kinora" className="text-3xl font-bold" />
            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Cerca"
              >
                <Search size={18} className="text-text-secondary" />
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/60 flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-3 pb-2 space-y-0.5 border-b border-stone-200">
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                onClick={() => handleAction(a.key)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl active:bg-white/50 transition-colors text-left"
              >
                <span className="text-text-secondary shrink-0">{a.icon}</span>
                <span className="text-text font-medium text-[15px]">{a.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider px-3 mb-1">
              Chat
            </p>
            {history.length === 0 ? (
              <div className="px-3 py-6 text-sm text-text-muted text-center">
                Le tue conversazioni appariranno qui.
              </div>
            ) : (
              <div className="space-y-0.5">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      onSelectChat?.(h.id);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl active:bg-white/50 transition-colors text-sm text-text truncate"
                  >
                    {h.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="absolute bottom-5 right-5">
            <button
              onClick={handleNewChat}
              className="gradient-primary text-white pl-4 pr-5 py-3 rounded-full font-bold text-sm shadow-2xl shadow-primary/40 glow-primary flex items-center gap-2 active:scale-95 transition-transform"
            >
              <Edit3 size={16} strokeWidth={2.5} />
              Nuova chat
            </button>
          </div>
        </aside>
      </div>
      <style jsx>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Menu"
    >
      <Menu size={20} className="text-text" />
    </button>
  );
}
