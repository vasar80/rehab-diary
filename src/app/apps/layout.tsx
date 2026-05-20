import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Fraunces, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { routing } from '@/i18n/routing';
import './apps.css';

/**
 * Layout sigillato per la sezione `/apps`.
 *
 * Carica i font di KINORA (Fraunces/DM Sans/JetBrains Mono) e il CSS
 * scope-ato (`apps.css`) che contiene tutti i token del design system
 * Editorial Healthtech. NextIntlClientProvider fornisce le messages
 * per `useTranslations` dentro i moduli. La locale è bloccata a `it`
 * per ora — quando avremo utenti ES/EN basterà leggerla dal profilo.
 *
 * Tutto questo guscio NON tocca il resto dell'app: i token vivono solo
 * sotto la classe `.kinora-shell` e il provider next-intl avvolge solo
 * questa subtree.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  style: ['normal', 'italic'],
  axes: ['SOFT', 'opsz'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500', '600'],
  display: 'swap',
});

export default async function AppsLayout({ children }: { children: ReactNode }) {
  // Locale fissa per ora — in futuro: leggi dal profilo paziente
  // (marketplace_code → it-ITA / es-INT).
  const locale = routing.defaultLocale;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <div
      className={`kinora-shell ${fraunces.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </div>
  );
}
