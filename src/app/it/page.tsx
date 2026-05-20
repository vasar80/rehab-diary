import { redirect } from 'next/navigation';

/**
 * Ponte per il back button dei moduli applicativi.
 *
 * I moduli copiati da KINORA usano internamente `Link href={`/${locale}`}`
 * come "torna alla home" — nel progetto standalone andava bene perché
 * la root della UI era `/[locale]`. Qui rehab-diary non ha quel routing,
 * quindi `/it` reindirizza alla lista app `/apps`. Tenuto SCOLLEGATO
 * dai moduli stessi per non modificarne il sorgente.
 */
export default function LocaleHomeBridge() {
  redirect('/apps');
}
