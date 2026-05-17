'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Wordmark from '@/components/Wordmark';

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen pb-16">
      <header className="px-4 pt-12 pb-3 flex-shrink-0 sticky top-0 z-20 backdrop-blur-md bg-white/40 border-b border-white/40">
        <div className="mx-auto max-w-md lg:max-w-2xl flex items-center justify-between">
          <button onClick={() => router.back()} className="glass w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <Wordmark text="Kinora" className="text-3xl font-bold" />
          <div className="w-11 h-11" />
        </div>
      </header>

      <main className="px-5 mx-auto max-w-md lg:max-w-2xl pt-4">
        <h1 className="text-text font-bold text-2xl mb-1">Informativa privacy</h1>
        <p className="text-text-secondary text-xs mb-6">Versione del 17 maggio 2026</p>

        <article className="prose prose-sm text-text leading-relaxed space-y-4 text-[14px]">
          <section>
            <h2 className="font-bold text-base mt-4">1. Chi tratta i tuoi dati</h2>
            <p>Il titolare del trattamento è <strong>Stroke Therapy Revolution</strong>. Per qualsiasi richiesta in materia di privacy puoi scrivere a <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a>.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">2. Cosa raccogliamo</h2>
            <p>Quando usi Kinora trattiamo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Dati anagrafici: nome, email, sesso (per la concordanza linguistica).</li>
              <li>Dati clinici inseriti volontariamente nel diario: umore, terapia svolta, azioni eseguite, compensi osservati, note libere.</li>
              <li>Video che carichi delle tue sessioni di terapia (salvati su Google Drive).</li>
              <li>Conversazioni con l&apos;assistente Kinora.</li>
              <li>Dati tecnici: identificativo del dispositivo, sottoscrizione push, log di errore.</li>
            </ul>
            <p className="mt-2"><strong>Categoria particolare (art. 9 GDPR)</strong>: i dati clinici relativi al tuo percorso riabilitativo sono dati relativi alla salute. Li trattiamo solo con il tuo consenso esplicito e per le finalità qui descritte.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">3. Perché</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permetterti di tenere un diario riabilitativo e condividerlo con il tuo terapista.</li>
              <li>Permettere al terapista di vedere i tuoi progressi e adattare il trattamento.</li>
              <li>Fornire suggerimenti, reminder e supporto conversazionale tramite l&apos;assistente Kinora.</li>
              <li>Rispondere a tue richieste e migliorare il servizio.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">4. Base giuridica</h2>
            <p>Il tuo <strong>consenso esplicito</strong> (art. 6.1.a e art. 9.2.a GDPR) per i dati clinici e l&apos;uso dell&apos;assistente AI. Puoi ritirarlo in qualsiasi momento.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">5. A chi vengono comunicati</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Il tuo terapista assegnato</strong>: vede diari, video e contratto.</li>
              <li><strong>Google LLC</strong> come responsabile esterno: ospita database (Firebase Firestore), autenticazione (Firebase Auth), file (Google Drive) e fornisce il modello di intelligenza artificiale (Gemini 2.5 Flash). I dati personali e clinici inseriti nelle conversazioni con l&apos;assistente sono inviati a Gemini per generare la risposta. Google si impegna contrattualmente a non usare questi dati per addestrare i propri modelli e a tenerli in data center europei quando possibile.</li>
              <li><strong>Vercel Inc.</strong> come responsabile esterno: ospita l&apos;app web.</li>
            </ul>
            <p className="mt-2">Non vendiamo dati a terzi e non li usiamo per profilazione pubblicitaria.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">6. Per quanto tempo</h2>
            <p>I tuoi diari e video restano disponibili finché il tuo account è attivo. Puoi cancellare singolarmente entry, video, e l&apos;intero account in qualsiasi momento (vedi punto 8). Alla cancellazione dell&apos;account tutti i dati vengono rimossi entro 30 giorni, salvo obblighi di legge.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">7. Dove vengono trattati</h2>
            <p>I dati risiedono principalmente su server europei (Firebase eur3 / Google Drive UE). Le richieste all&apos;assistente AI possono transitare su server Google extra-UE secondo le clausole contrattuali standard (SCC) approvate dalla Commissione Europea.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">8. I tuoi diritti</h2>
            <p>In base agli articoli 15-22 del GDPR puoi in ogni momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Accedere ai tuoi dati (chiedere copia).</li>
              <li>Correggerli se inesatti.</li>
              <li>Cancellarli (&quot;diritto all&apos;oblio&quot;).</li>
              <li>Limitare il trattamento.</li>
              <li>Portarli con te (portabilità).</li>
              <li>Opporti al trattamento.</li>
              <li>Revocare il consenso.</li>
              <li>Proporre reclamo al Garante Privacy.</li>
            </ul>
            <p className="mt-2">Per esercitare questi diritti scrivi a <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a>. Ti risponderemo entro 30 giorni.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">9. Sicurezza</h2>
            <p>Cifriamo le comunicazioni in transito (HTTPS) e i dati a riposo nei database Google Firebase. L&apos;accesso ai dati è limitato al tuo terapista assegnato e al super-amministratore del sistema.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">10. Assistente AI</h2>
            <p>L&apos;assistente Kinora è basato sul modello Gemini di Google. <strong>Non è un medico</strong>, non fornisce diagnosi né cure. Le sue risposte non sostituiscono in alcun caso il parere del tuo terapista o medico. Le conversazioni vengono inviate al servizio di intelligenza artificiale per generare la risposta; il contenuto può includere dati clinici riportati nei diari e nel contratto, dato che servono al modello per essere utile.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">11. Modifiche</h2>
            <p>Pubblicheremo qui ogni aggiornamento di questa informativa. Se le modifiche sono sostanziali ti chiederemo nuovamente il consenso.</p>
          </section>
        </article>
      </main>
    </div>
  );
}
