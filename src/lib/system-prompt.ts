interface DiaryEntrySummary {
  date: string;
  mood?: number;
  didTherapy?: boolean;
  therapyMinutes?: number;
  feeling?: number;
  practicedActions?: string;
  selectedActions?: string[];
  handInOtherActivities?: string;
  posture?: string;
  noticedCompensations?: boolean;
  compensationTypes?: string[];
  notes?: string;
}

interface ContractItemSummary {
  text: string;
  type: 'general' | 'specific';
  isActive: boolean;
}

interface PromptContext {
  name: string;
  sex?: 'M' | 'F';
  todayCompleted: boolean;
  streak: number;
  complianceRate: number;
  lastMood?: number;
  hasVideoToday: boolean;
  daysSinceLastVideo?: number;
  recentNotes?: string[];
  noticedCompensationsRecently?: boolean;
  recentDiary?: DiaryEntrySummary[];
  contract?: ContractItemSummary[];
  clinicalInfo?: string;
}

const moodLabels = ['', 'pessimo', 'male', 'così così', 'bene', 'benissimo'];

export const DEFAULT_BASE_PROMPT = `Sei l'assistente AI di Kinora, un'app di diario riabilitativo per pazienti con ictus che fanno terapia CIMT (Constraint-Induced Movement Therapy) sull'arto superiore.

# Identità e tono
- Parli sempre in italiano corretto e caldo. Sei empatico, ma diretto: non sei zuccheroso, non usi cliché motivazionali stucchevoli.
- Sei un alleato del paziente nel suo percorso, non un dottore. Non dai mai diagnosi, non suggerisci farmaci, non rispondi a domande mediche specifiche — in quei casi rimandi sempre al terapista o al medico curante.
- Sai che il paziente sta affrontando una fase difficile della propria vita. Riconosci i progressi piccoli, validi i momenti di frustrazione senza minimizzarli.
- Lunghezza: messaggi brevi, 1-3 frasi quando possibile. Se servono liste, max 4 punti.
- Niente emoji nel testo, niente markdown formattato. Solo testo naturale.

# Cose che SAI fare e suggerire
- Ricordare al paziente di fare il diario quando non l'ha ancora fatto.
- Ricordare di caricare un video se non l'ha fatto oggi.
- Aiutarlo a riflettere su come è andata la giornata di terapia.
- Riconoscere streak e progressi reali (non inventarli).
- Suggerire esercizi pratici della MAL (Motor Activity Log): aprire una porta, bere da un bicchiere, mangiare con forchetta, lavarsi i denti, lavarsi le mani, pettinarsi, indossare calzini, aprire un cassetto, usare il telecomando, scrivere.
- Spiegare cosa sono i compensi (movimenti involontari come spalla sollevata, tronco inclinato, ecc.) e perché evitarli.
- Incoraggiare l'uso della mano coinvolta in attività quotidiane oltre alla terapia.
- Riferirti al diario passato del paziente quando rilevante (es. "negli ultimi giorni hai segnalato compensi, vediamo come va oggi").

# Cose che NON fai
- Non dai pareri medici, non parli di farmaci, non interpreti sintomi.
- Non prometti risultati di recupero ("recupererai al 100%", ecc.).
- Non giudichi mai il paziente per essersi saltato un giorno.
- Non chiedi dati personali sensibili oltre a quelli già nel contesto.
- Se il paziente esprime forte sconforto, pensieri di non farcela o segnali preoccupanti, esprimi vicinanza e suggerisci con gentilezza di parlarne con il proprio terapista o medico nel prossimo incontro.

# Empatia prima del prossimo passo
- Quando il paziente esprime malessere (umore basso, dolore, frustrazione, sconforto), NON passare subito alla domanda successiva come se nulla fosse. Riconosci brevemente quello che ha detto in 1-2 frasi, poi se è il caso chiedi un motivo, poi continua. Esempio: paziente dice "oggi male", tu rispondi "Mi dispiace. C'è un motivo in particolare? Possiamo parlarne se vuoi, oppure procedere con le altre cose." NON sei psicoterapeuta — non scavare troppo, non rilanciare oltre 1 turno, ma neanche far finta di niente.
- Quando il paziente dice qualcosa di positivo, riconoscilo brevemente con un tono autentico (non eccessivo), poi continua.

# Genere e concordanza
- Quando ti riferisci al paziente, accorda i participi al genere (es. "sei riuscito" se uomo, "sei riuscita" se donna).`;

export function buildRuntimeContext(ctx: PromptContext): string {
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const lines: string[] = [];

  lines.push(`# Contesto attuale (${today})`);
  lines.push('');
  lines.push(`## Paziente`);
  lines.push(`- Nome: ${ctx.name}`);
  if (ctx.sex) lines.push(`- Sesso: ${ctx.sex === 'F' ? 'Donna' : 'Uomo'}`);

  lines.push('');
  lines.push(`## Stato di oggi`);
  lines.push(`- Diario di oggi: ${ctx.todayCompleted ? 'GIÀ COMPILATO' : 'NON ancora compilato'}.`);
  lines.push(`- Streak: ${ctx.streak} giorni consecutivi.`);
  lines.push(`- Aderenza media impegni: ${ctx.complianceRate}%.`);
  if (ctx.lastMood) lines.push(`- Ultimo umore registrato: ${moodLabels[ctx.lastMood]}.`);
  lines.push(`- Video di oggi: ${ctx.hasVideoToday ? 'caricato' : 'non caricato'}.`);
  if (ctx.daysSinceLastVideo !== undefined && ctx.daysSinceLastVideo > 1) {
    lines.push(`- Ultimo video caricato ${ctx.daysSinceLastVideo} giorni fa.`);
  }
  if (ctx.noticedCompensationsRecently) {
    lines.push(`- Negli ultimi giorni il paziente ha riportato compensi (movimenti involontari).`);
  }

  if (ctx.recentDiary && ctx.recentDiary.length > 0) {
    lines.push('');
    lines.push('## Diari recenti del paziente (più recente prima)');
    for (const e of ctx.recentDiary) {
      const parts: string[] = [];
      parts.push(`${e.date}:`);
      if (e.mood !== undefined) parts.push(`umore ${moodLabels[e.mood] || e.mood}`);
      if (e.didTherapy !== undefined) parts.push(e.didTherapy ? `terapia sì${e.therapyMinutes ? ` (${e.therapyMinutes} min)` : ''}` : 'terapia no');
      if (e.feeling !== undefined) parts.push(`sessione ${moodLabels[e.feeling] || e.feeling}`);
      if (e.practicedActions) parts.push(`azioni: ${e.practicedActions}`);
      if (e.selectedActions && e.selectedActions.length > 0) parts.push(`(${e.selectedActions.join(', ')})`);
      if (e.handInOtherActivities) parts.push(`mano in altre attività: ${e.handInOtherActivities}`);
      if (e.posture) parts.push(`postura: ${e.posture}`);
      if (e.noticedCompensations) {
        parts.push(`compensi: sì${e.compensationTypes && e.compensationTypes.length > 0 ? ` (${e.compensationTypes.join(', ')})` : ''}`);
      }
      if (e.notes) parts.push(`note: "${e.notes}"`);
      lines.push(`- ${parts.join(' · ')}`);
    }
  }

  if (ctx.contract && ctx.contract.length > 0) {
    const active = ctx.contract.filter((c) => c.isActive);
    if (active.length > 0) {
      lines.push('');
      lines.push('## Impegni concordati col terapista (contratto attivo)');
      for (const c of active) {
        lines.push(`- [${c.type === 'general' ? 'generale' : 'specifico'}] ${c.text}`);
      }
    }
  }

  if (ctx.clinicalInfo && ctx.clinicalInfo.trim()) {
    lines.push('');
    lines.push('## Informazioni cliniche');
    lines.push(ctx.clinicalInfo.trim());
  }

  return lines.join('\n');
}

export function buildSystemPrompt(ctx: PromptContext, customBase?: string): string {
  const base = (customBase && customBase.trim()) || DEFAULT_BASE_PROMPT;
  return `${base}\n\n${buildRuntimeContext(ctx)}`;
}
