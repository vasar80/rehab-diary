import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import './apps.css';

/**
 * Layout sigillato per la sezione `/apps`.
 *
 * Carica il CSS scope-ato (apps.css) che ridefinisce i token KINORA
 * sopra la palette del core (violet/pink + Inter/Playfair). I font
 * "Playfair Display" e "Inter" sono già caricati dal root layout
 * via next/font/google, quindi qui non serve ricaricarli.
 *
 * NextIntlClientProvider fornisce le messages per `useTranslations`
 * dentro i moduli. La locale è bloccata a "it" per ora — quando
 * avremo utenti ES/EN basterà leggerla dal profilo paziente.
 *
 * Tutto questo guscio NON tocca il resto dell'app: i token vivono solo
 * sotto la classe `.kinora-shell` e il provider next-intl avvolge solo
 * questa subtree.
 */
export default async function AppsLayout({ children }: { children: ReactNode }) {
  const locale = routing.defaultLocale;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <div className="kinora-shell">
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
