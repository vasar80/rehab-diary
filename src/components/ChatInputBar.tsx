'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

export default function ChatInputBar() {
  const router = useRouter();
  const [input, setInput] = useState('');

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      sessionStorage.setItem('pendingPrompt', trimmed);
    } catch {}
    router.push('/');
  }

  return (
    <div className="fixed inset-x-0 z-30 pointer-events-none bottom-5 sm:bottom-6">
      <div className="mx-auto max-w-md lg:max-w-2xl px-4 pointer-events-auto">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Chiedi a Kinora…"
            className="flex-1 glass-strong rounded-full px-5 py-3.5 text-[15px] text-text placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-12 h-12 rounded-full gradient-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shadow-lg shadow-primary/30 glow-primary"
            aria-label="Invia"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
