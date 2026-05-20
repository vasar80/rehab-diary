import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['it', 'es', 'en'],
  defaultLocale: 'it',
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
