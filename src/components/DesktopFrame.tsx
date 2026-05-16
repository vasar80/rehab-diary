'use client';

import { ReactNode } from 'react';
import { Heart, Smartphone, Sparkles, ShieldCheck } from 'lucide-react';

export default function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="hidden lg:block fixed inset-0 -z-[3] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[920px] max-h-[90vh] rounded-[3rem] glass-strong" style={{ boxShadow: '0 60px 140px -30px rgba(15, 23, 42, 0.22), 0 30px 60px -20px rgba(15, 118, 110, 0.18)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[920px] max-h-[90vh] rounded-[3rem] pointer-events-none border border-white/40" />
      </div>

      <div className="hidden lg:flex fixed top-0 bottom-0 z-[1] pointer-events-none flex-col justify-center gap-8 pl-12 pr-6" style={{ width: 'calc((100vw - 480px) / 2)', minWidth: '240px' }}>
        <div className="ml-auto max-w-[280px] space-y-8 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary rounded-2xl blur-md opacity-50" />
              <div className="relative w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <Heart size={22} className="text-white" strokeWidth={2.5} fill="white" />
              </div>
            </div>
            <div>
              <p className="text-text font-bold text-lg leading-tight">RehabDiary</p>
              <p className="text-xs text-text-secondary">Il tuo percorso, ogni giorno</p>
            </div>
          </div>

          <div className="space-y-4">
            <SideTip
              icon={<Sparkles size={16} className="text-white" />}
              gradient="gradient-primary"
              title="2 minuti al giorno"
              text="Il diario ti aiuta a ricordare le sensazioni, e il tuo terapista a vedere i tuoi progressi reali."
            />
            <SideTip
              icon={<Smartphone size={16} className="text-white" />}
              gradient="gradient-warm"
              title="Pensato per il telefono"
              text="L'app dà il meglio su mobile. Su desktop la vedi qui in versione comoda."
            />
          </div>
        </div>
      </div>

      <div className="hidden lg:flex fixed top-0 bottom-0 right-0 z-[1] pointer-events-none flex-col justify-center gap-8 pr-12 pl-6" style={{ width: 'calc((100vw - 480px) / 2)', minWidth: '240px' }}>
        <div className="mr-auto max-w-[280px] space-y-4 pointer-events-auto">
          <SideTip
            icon={<ShieldCheck size={16} className="text-white" />}
            gradient="gradient-cool"
            title="I tuoi dati sono tuoi"
            text="Tutto è cifrato. I tuoi report li vede solo il tuo terapista, nessun altro."
          />
          <div className="glass-soft rounded-3xl p-4">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Suggerimento</p>
            <p className="text-sm text-text mt-2 leading-relaxed">
              Aggiungi la app alla schermata Home del tuo telefono per averla sempre a portata di mano e ricevere reminder.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </>
  );
}

function SideTip({
  icon,
  gradient,
  title,
  text,
}: {
  icon: ReactNode;
  gradient: string;
  title: string;
  text: string;
}) {
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-xl ${gradient} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <p className="text-text font-bold text-sm">{title}</p>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}
