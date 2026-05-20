import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classi Tailwind in modo sicuro:
 *  - clsx accetta tutte le forme (stringhe, oggetti, array, condizioni)
 *  - twMerge risolve i conflitti (es. `p-2 p-4` → `p-4`)
 *
 * Importato da `src/modules/walking/Walking.tsx`. Trasferito dal progetto
 * KINORA così com'è — non modificare la firma o il comportamento.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
