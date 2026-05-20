<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Visual identity — non-negotiable, applies everywhere

Tutta la app condivide UNA identità visiva — qualsiasi schermata nuova,
qualsiasi modulo, qualsiasi pagina admin si conforma a questa.

**Wordmarks e titoli principali**: prima lettera **#E85A7A (pink)**,
resto **#322A6E (violet)**. Riusabili:
- `<TwoColorInline text="..." />` (statico) — `src/app/page.tsx`
- `<TypewriterTwoColor text="..." />` (animato) — `src/components/TypewriterTwoColor.tsx`
Non riscrivere a mano: importa questi componenti. Vale per:
- titoli di pagina (h1)
- nomi delle app nella lista esercizi
- wordmark in header
- titoli prominenti dentro i moduli (PermissionGate, WonOverlay, SuccessOverlay)

**Font famiglie**:
- Display (titoli, hero) → **Playfair Display** (caricata via next/font/google
  nel root layout come `--font-playfair`; classi `font-display`)
- Sans (corpo, UI, bottoni) → **Inter** (root layout `--font-inter`;
  classi `font-sans`)
- Mono (timer, monospace UI) → `ui-monospace, "SFMono-Regular"` di sistema
Mai aggiungere import next/font extra (Fraunces, DM Sans, JetBrains Mono,
ecc.). Se un modulo trasferito da altri progetti usa famiglie diverse,
ridirigi i `var(--font-*)` nei suoi token CSS scoped al display+sans
centrali.

**Palette del core** (definita in `src/app/globals.css` come `@theme`):
- `#322A6E` primary violet · `#1E1647` dark · `#14102F` darker · `#6B5DA8` light · `#4A3F8C` glow
- `#E85A7A` accent pink · `#F4A6B7` light · `#C13E5E` dark
- `#fbf7f9` bg · `#ffffff` surface · `#14102F` text · `#57516e` text-secondary · `#9088a8` text-muted
- success #10b981, warning #f59e0b, danger #ef4444
Mai introdurre token oklch/bone/ink/terracotta lato app. Se un modulo
copiato li usa internamente, rimappali nei suoi CSS scoped — non
diluire la palette del core con varianti.

**Background del body**: gradiente radiale violet/pink + base `#fbf7f9`,
definito in globals.css. Nelle subtree dei moduli a tutto schermo
(games, esperienze immersive) si copre con bg solido coerente — la
lista app `/apps` deve lasciar trasparire il gradiente.

**Accessi e gating**:
- L'allowlist staff è in `src/app/kinora-admin/_lib/staff-gate.ts`
- Tutte le API admin passano da `verifyStaffCaller` (server-only,
  in `staff-gate-server.ts`)
- Token Supabase: `getAccessToken()` da `@/lib/supabase/client`

# Schema permissions (Supabase)

Quando si crea uno schema nuovo (non `public`):
1. Aggiungerlo a `ALTER ROLE authenticator SET pgrst.db_schemas = '...,<nuovo>'`
2. `GRANT USAGE ON SCHEMA <nuovo> TO postgres, service_role, authenticated, anon`
3. `GRANT ALL ON ALL TABLES IN SCHEMA <nuovo> TO postgres, service_role`
4. `ALTER DEFAULT PRIVILEGES IN SCHEMA <nuovo> GRANT ALL ON TABLES TO postgres, service_role`
5. `NOTIFY pgrst, 'reload config'`
Altrimenti il client supabase-js ritorna "permission denied" → API
ritorna "Failed" → UI mostra "Failed".

# Email dei pazienti gestionale

`user_patient.email` è quasi sempre NULL (5/145 attivi). L'email vera
del paziente è su `user_user.email` (il payer/account che fa login al
gestionale Resilients). Usare `COALESCE(p.email, u.email)` in qualsiasi
query che vuole l'email del paziente.
