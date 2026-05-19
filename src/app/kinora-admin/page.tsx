'use client';

import { useAuth } from '@/lib/auth-context';
import { Users, BookOpen, Video, FileText, Bot, Settings, Bell } from 'lucide-react';
import { AppChip } from './_components/AppChip';

export default function KinoraAdminOverview() {
  const { supabaseUser } = useAuth();
  const name =
    ((supabaseUser?.user_metadata as Record<string, unknown> | null)?.name as string) ||
    supabaseUser?.email?.split('@')[0] ||
    'Staff';
  const firstName = (name || '').split(' ')[0];
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.5px',
          }}
        >
          {greet}, {firstName}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
          Pannello di amministrazione di Kinora — gestione pazienti, contenuti, agenti AI.
        </p>
      </header>

      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              margin: 0,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Applicativi
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
          }}
        >
          <AppChip
            href="/kinora-admin/pazienti"
            Icon={Users}
            label="Pazienti"
            sublabel="Lista, stato abbonamento, ultima attività"
            gradient="linear-gradient(135deg, #E85A7A 0%, #322A6E 100%)"
          />
          <AppChip
            href="/kinora-admin/diari"
            Icon={BookOpen}
            label="Diari"
            sublabel="Compilazioni quotidiane, filtri per paziente"
            gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
          />
          <AppChip
            href="/kinora-admin/video"
            Icon={Video}
            label="Video"
            sublabel="Sessioni caricate dai pazienti"
            gradient="linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)"
          />
          <AppChip
            href="/kinora-admin/contratti"
            Icon={FileText}
            label="Contratti"
            sublabel="Impegni riabilitativi attivi"
            gradient="linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)"
          />
          <AppChip
            href="/kinora-admin/agents"
            Icon={Bot}
            label="Agents AI"
            sublabel="Assistenti AI condivisi con la dashboard"
            gradient="linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
          />
          <AppChip
            href="/kinora-admin/configurazione"
            Icon={Settings}
            label="Configurazione"
            sublabel="Prompt AI, conoscenza clinica, parametri"
            gradient="linear-gradient(135deg, #64748b 0%, #334155 100%)"
          />
          <AppChip
            href="/kinora-admin/notifiche"
            Icon={Bell}
            label="Notifiche push"
            sublabel="Invio manuale a un paziente o broadcast"
            gradient="linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)"
          />
        </div>
      </section>

      <section
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 24,
        }}
      >
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#475569',
            margin: 0,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Prossimo
        </h2>
        <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          Questo pannello è la <strong>cartella sigillata</strong> del dipartimento Kinora —
          progettata per essere trasferita un giorno dentro la dashboard aziendale con un
          semplice <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>cp -r</code>.
          La grafica replica quella della dashboard così l&apos;integrazione, quando avverrà,
          sarà visivamente trasparente per chi la usa.
        </p>
      </section>
    </div>
  );
}
