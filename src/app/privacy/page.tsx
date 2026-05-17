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
        <p className="text-text-secondary text-xs mb-2">Versione del 17 maggio 2026</p>
        <p className="text-text-secondary text-xs mb-6">Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (&laquo;GDPR&raquo;) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018.</p>

        <article className="prose prose-sm text-text leading-relaxed space-y-4 text-[14px]">

          <section>
            <h2 className="font-bold text-base mt-4">In breve</h2>
            <p>Kinora è un&apos;applicazione web progressiva (PWA) di supporto al percorso di riabilitazione motoria, in particolare per persone colpite da ictus. Trattiamo dati relativi alla salute esclusivamente con il tuo consenso esplicito, li condividiamo solo con il tuo terapista assegnato e con responsabili esterni che eseguono compiti tecnici per nostro conto (hosting, autenticazione, modello di intelligenza artificiale). Non vendiamo i tuoi dati. Non li usiamo per profilazione pubblicitaria. Puoi esportarli o cancellarli in qualsiasi momento dalla pagina <em>Profilo</em>.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">1. Titolare del trattamento</h2>
            <p>Il titolare del trattamento è <strong>Stroke Therapy Revolution</strong> (di seguito anche &laquo;Titolare&raquo; o &laquo;noi&raquo;). Per qualsiasi richiesta in materia di protezione dei dati personali puoi scrivere a <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a>.</p>
            <p className="mt-2 text-text-secondary text-xs">Allo stato attuale non è obbligatoria, ai sensi dell&apos;art. 37 GDPR, la designazione di un Responsabile della Protezione dei Dati (DPO). Aggiorneremo la presente informativa qualora si configurino i presupposti di legge.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">2. Categorie di dati personali trattati</h2>
            <p>Quando usi Kinora possiamo trattare le seguenti categorie di dati:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dati identificativi e di contatto</strong>: nome, indirizzo email, sesso (utilizzato unicamente per la concordanza grammaticale italiana dell&apos;assistente).</li>
              <li><strong>Dati di autenticazione</strong>: password (in forma cifrata e gestita da Firebase Authentication; non vi accediamo in chiaro), token di sessione.</li>
              <li><strong>Dati relativi alla salute (categoria particolare, art. 9 GDPR)</strong>: contenuti del diario riabilitativo (umore quotidiano, terapia svolta, durata, azioni eseguite, uso della mano emiplegica, postura, compensi osservati, note libere), risposte al contratto riabilitativo, video delle sessioni di terapia che decidi di caricare, conversazioni testuali con l&apos;assistente Kinora che possono contenere riferimenti al tuo stato di salute.</li>
              <li><strong>Dati di utilizzo e tecnici</strong>: identificativo anonimo del dispositivo, sottoscrizione alle notifiche push (endpoint e chiavi crittografiche), log di errore, indirizzi IP utilizzati per le chiamate API (conservati nei log dei nostri responsabili per il tempo strettamente necessario).</li>
            </ul>
            <p className="mt-2">Non raccogliamo deliberatamente dati relativi a origine razziale, opinioni politiche, convinzioni religiose, vita sessuale, dati genetici o biometrici. Ti invitiamo a non inserire nel diario, nelle note libere o nelle conversazioni con l&apos;assistente informazioni di queste categorie.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">3. Finalità del trattamento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permetterti di tenere un diario riabilitativo strutturato e di consultare lo storico del tuo percorso.</li>
              <li>Consentire al tuo terapista assegnato di visualizzare i tuoi diari, video e contratto, valutarne i progressi e adattare il trattamento.</li>
              <li>Fornirti reminder, promemoria e supporto conversazionale tramite l&apos;assistente AI Kinora.</li>
              <li>Inviarti notifiche push relative al percorso (se hai prestato consenso specifico al momento dell&apos;abilitazione).</li>
              <li>Rispondere alle tue richieste di esercizio dei diritti (art. 15-22 GDPR).</li>
              <li>Garantire la sicurezza dell&apos;applicazione (rilevamento di abusi, integrità tecnica, audit log).</li>
              <li>Adempiere a obblighi di legge ai quali siamo soggetti.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">4. Base giuridica</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dati identificativi e tecnici</strong>: esecuzione di misure precontrattuali e del rapporto con te (art. 6.1.b GDPR), nostro legittimo interesse a mantenere l&apos;applicazione sicura e funzionante (art. 6.1.f).</li>
              <li><strong>Dati relativi alla salute</strong>: <strong>consenso esplicito</strong> dell&apos;interessato (art. 6.1.a e art. 9.2.a GDPR), che ti chiediamo separatamente al momento della registrazione e che puoi revocare in qualsiasi momento dalla pagina <em>Profilo</em> &rarr; <em>Cancella account</em>.</li>
              <li><strong>Conversazioni con l&apos;assistente AI</strong>: stesso consenso esplicito di cui sopra, esteso espressamente alla trasmissione del contenuto al modello fornito da Google.</li>
              <li><strong>Notifiche push</strong>: consenso specifico, prestato dall&apos;utente al momento dell&apos;abilitazione tramite browser; revocabile in qualsiasi momento dalle impostazioni del browser/del sistema operativo.</li>
              <li><strong>Adempimenti di legge</strong>: art. 6.1.c GDPR.</li>
            </ul>
            <p className="mt-2">La revoca del consenso non pregiudica la liceità dei trattamenti effettuati prima della revoca. La revoca relativa ai dati sanitari rende tecnicamente impossibile l&apos;uso del servizio: in caso di revoca cancelleremo i dati come descritto al punto 7.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">5. Destinatari e responsabili esterni</h2>
            <p>I tuoi dati personali possono essere comunicati alle seguenti categorie di soggetti, in qualità di responsabili del trattamento ai sensi dell&apos;art. 28 GDPR o di titolari autonomi:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Il tuo terapista assegnato</strong>: opera come autorizzato al trattamento e accede ai tuoi diari, video e contratto al fine di personalizzare il percorso riabilitativo.</li>
              <li><strong>Google LLC e Google Ireland Ltd.</strong> (responsabile esterno): fornisce l&apos;infrastruttura su cui poggia Kinora. In particolare: <em>Firebase Authentication</em> per l&apos;autenticazione; <em>Cloud Firestore</em> (regione <code>eur3</code>) per il database; <em>Google Drive</em> per l&apos;archiviazione dei video; <em>Vertex AI / Gemini 2.5 Flash</em> per il modello di intelligenza artificiale dell&apos;assistente. Il rapporto è regolato dal Data Processing Addendum di Google Cloud e dalle Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea per gli eventuali trasferimenti extra-UE. Google si è impegnata contrattualmente a <strong>non utilizzare i contenuti elaborati da Gemini per addestrare i propri modelli</strong>.</li>
              <li><strong>Vercel Inc.</strong> (responsabile esterno): ospita l&apos;applicazione web (frontend e route API). Il rapporto è regolato dal DPA di Vercel e dalle SCC.</li>
            </ul>
            <p className="mt-2">Non vendiamo, affittiamo o cediamo a terzi i tuoi dati personali per finalità di marketing diretto o profilazione pubblicitaria.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">6. Trasferimenti extra-UE</h2>
            <p>I dati risiedono prevalentemente su server europei (Firestore <code>eur3</code> e Google Drive UE). Le richieste al modello di intelligenza artificiale (Gemini) possono essere instradate su server Google extra-UE: in tal caso il trasferimento è coperto dalle <strong>Clausole Contrattuali Standard (SCC)</strong> approvate dalla Commissione Europea con decisione 2021/914 e da misure supplementari di sicurezza descritte nell&apos;impegno contrattuale di Google. Vercel applica analoghe garanzie per i trasferimenti verso gli Stati Uniti, dove può risiedere parte dell&apos;infrastruttura.</p>
            <p className="mt-2 text-text-secondary text-xs">Puoi richiedere copia delle clausole applicabili scrivendo a <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a>.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">7. Periodo di conservazione</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account attivo</strong>: i dati identificativi, i diari, le risposte al contratto e i video sono conservati per tutta la durata del rapporto con il servizio.</li>
              <li><strong>Singole entry</strong>: puoi cancellare singolarmente diari, video e impegni del contratto in qualsiasi momento; la cancellazione è effettiva entro 24 ore sui sistemi attivi e fino a 30 giorni sui backup.</li>
              <li><strong>Cancellazione dell&apos;account</strong>: alla richiesta di cancellazione tramite la pagina <em>Profilo</em>, eliminiamo entro 30 giorni tutti i contenuti del diario, i video, le risposte al contratto, le sottoscrizioni push e il documento del profilo. Manteniamo per un periodo aggiuntivo di 30 giorni un record minimo dell&apos;identificativo Auth, in stato disabilitato, per impedire la riattivazione fraudolenta dell&apos;account con la stessa email; trascorso tale periodo viene rimosso anche quello.</li>
              <li><strong>Log tecnici</strong>: i log di errore e accesso sono conservati dai responsabili esterni per un massimo di 90 giorni, salvo necessità di accertamento di sicurezza.</li>
              <li><strong>Comunicazioni</strong>: corrispondenza email con il titolare è conservata per il tempo necessario alla risposta e fino a 2 anni successivi, salvo obblighi di legge.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">8. I tuoi diritti</h2>
            <p>In qualità di interessato, ai sensi degli artt. 15-22 GDPR, puoi in qualsiasi momento esercitare i seguenti diritti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Accesso</strong> (art. 15): chiedere conferma che sia in corso un trattamento e ottenerne copia.</li>
              <li><strong>Rettifica</strong> (art. 16): correggere dati inesatti o integrarli.</li>
              <li><strong>Cancellazione</strong> (art. 17): &laquo;diritto all&apos;oblio&raquo;.</li>
              <li><strong>Limitazione</strong> (art. 18): chiedere la sospensione del trattamento in casi specifici.</li>
              <li><strong>Portabilità</strong> (art. 20): ricevere i dati in formato strutturato, leggibile da dispositivo automatico (JSON).</li>
              <li><strong>Opposizione</strong> (art. 21): opporti al trattamento per motivi connessi alla tua situazione particolare.</li>
              <li><strong>Revoca del consenso</strong> (art. 7): in qualsiasi momento, senza pregiudicare la liceità dei trattamenti già effettuati.</li>
              <li><strong>Reclamo all&apos;Autorità di controllo</strong>: in Italia il Garante per la protezione dei dati personali (<a className="text-primary underline" href="https://www.garanteprivacy.it" target="_blank">garanteprivacy.it</a>).</li>
            </ul>
            <p className="mt-2">Per esercitare i diritti di <strong>accesso e portabilità</strong>, e di <strong>cancellazione</strong>, è disponibile una funzione self-service nella pagina <em>Profilo</em>: pulsanti &laquo;Esporta i miei dati&raquo; e &laquo;Cancella account&raquo;. Per gli altri diritti, scrivi a <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a>: risponderemo entro 30 giorni, prorogabili di altri 60 in casi particolarmente complessi, dandone comunicazione motivata.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">9. Decisioni automatizzate e profilazione</h2>
            <p>Kinora <strong>non prende decisioni che producono effetti giuridici nei tuoi confronti o che incidono in modo analogo significativamente sulla tua persona</strong> sulla base di un trattamento automatizzato ai sensi dell&apos;art. 22 GDPR. L&apos;assistente AI fornisce suggerimenti di carattere generale a supporto della relazione tra te e il tuo terapista, ma <strong>non sostituisce il giudizio clinico</strong> e non emette diagnosi, prognosi o prescrizioni.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">10. Minori</h2>
            <p>Kinora non è destinato a soggetti di età inferiore ai 16 anni. Non raccogliamo deliberatamente dati di minori. Se sei genitore o tutore e ritieni che il minore abbia fornito dati senza il tuo consenso, contattaci all&apos;indirizzo email indicato al punto 1: provvederemo alla cancellazione entro i termini previsti.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">11. Sicurezza</h2>
            <p>Adottiamo misure tecniche e organizzative adeguate al rischio (art. 32 GDPR), tra cui:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cifratura in transito tramite HTTPS/TLS.</li>
              <li>Cifratura a riposo sui database e storage Google Firebase / Drive.</li>
              <li>Autenticazione a doppio fattore disponibile lato Firebase Auth.</li>
              <li>Controllo degli accessi: ai dati clinici di un paziente accedono unicamente il paziente stesso, il terapista assegnato e il super-amministratore del sistema per finalità di manutenzione.</li>
              <li>Verifica dei token di sessione su ogni endpoint API che esegue operazioni privilegiate.</li>
              <li>Backup automatici gestiti da Firebase con conservazione limitata.</li>
              <li>Procedura di gestione delle violazioni (data breach) con notifica al Garante entro 72 ore nei casi previsti dall&apos;art. 33 GDPR e comunicazione agli interessati ai sensi dell&apos;art. 34.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">12. Cookie e tecnologie analoghe</h2>
            <p>Kinora non utilizza cookie di profilazione né di terze parti per finalità di marketing. Utilizza esclusivamente:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Storage tecnico</strong> (<code>localStorage</code> del browser) per mantenere la sessione e le preferenze locali dell&apos;app.</li>
              <li><strong>Service worker</strong> per il funzionamento offline come PWA e per la ricezione delle notifiche push.</li>
            </ul>
            <p className="mt-2">Tali strumenti sono strettamente necessari al funzionamento del servizio e non richiedono consenso ai sensi dell&apos;art. 122 D.Lgs. 196/2003.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">13. Assistente AI Kinora</h2>
            <p>L&apos;assistente conversazionale Kinora è basato sul modello <strong>Gemini 2.5 Flash</strong> di Google. <strong>Non è un medico, non fornisce diagnosi, prognosi o terapie</strong>. Le sue risposte hanno carattere meramente informativo e di supporto motivazionale e <strong>non sostituiscono in alcun caso il parere del tuo terapista o medico curante</strong>.</p>
            <p className="mt-2">Per generare risposte pertinenti, ad ogni messaggio inviamo a Gemini una sintesi del tuo stato attuale (giorno corrente del diario, statistiche aggregate, ultime annotazioni, contratto riabilitativo, prossimi appuntamenti). Tali informazioni possono includere dati clinici. Google si è impegnata contrattualmente a non utilizzarli per addestrare i propri modelli.</p>
            <p className="mt-2 text-text-secondary text-xs">In situazioni di emergenza medica chiama il 112 (numero unico europeo) o rivolgiti immediatamente al pronto soccorso. Kinora non gestisce emergenze.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">14. Notifiche push</h2>
            <p>L&apos;invio di notifiche push richiede un consenso specifico, prestato dall&apos;utente al momento della prima richiesta da parte del browser e revocabile in qualsiasi momento dalle impostazioni del sistema operativo o del browser. Le notifiche vengono utilizzate esclusivamente per ricordarti la compilazione del diario, segnalarti un appuntamento imminente o trasmetterti comunicazioni di servizio. Conserviamo l&apos;endpoint della sottoscrizione finché è valido; le sottoscrizioni scadute (errore HTTP 410 dal provider push) vengono eliminate automaticamente.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">15. Modifiche alla presente informativa</h2>
            <p>Aggiorneremo qui ogni modifica all&apos;informativa, indicando la nuova data di versione. In caso di modifiche sostanziali, ti chiederemo nuovamente il consenso al successivo accesso. Le versioni precedenti sono disponibili su richiesta scritta al titolare.</p>
          </section>

          <section>
            <h2 className="font-bold text-base mt-4">16. Contatti</h2>
            <p>Per ogni richiesta, segnalazione o chiarimento relativi al trattamento dei dati personali e all&apos;esercizio dei diritti:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email: <a className="text-primary underline" href="mailto:info@stroke-therapy-revolution.es">info@stroke-therapy-revolution.es</a></li>
              <li>Titolare: Stroke Therapy Revolution</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
