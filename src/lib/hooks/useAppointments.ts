'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  generateUpcomingAppointments,
  adaptResilientsAppointments,
  type MockAppointment,
} from '@/lib/appointments-mock';

export type AppointmentsSource =
  | 'loading'
  | 'gestionale'
  | 'mock-self-signup'
  | 'mock-unauthenticated'
  | 'mock-error';

export interface UseAppointmentsResult {
  appointments: MockAppointment[];
  source: AppointmentsSource;
  /** True quando i dati sono quelli veri del gestionale Resilients. */
  isReal: boolean;
}

/**
 * Hook che risolve gli appuntamenti del paziente loggato:
 *
 *   1. Parte SUBITO con la lista mock (così la UI non sfarfalla / il
 *      diary-script non aspetta).
 *   2. In background chiama `/api/me/appuntamenti`. Se ritorna righe
 *      reali (paziente interno con `patientId` in user_metadata),
 *      sostituisce il mock con i dati veri.
 *   3. Se l'utente non è loggato o è un self-signup senza patientId,
 *      rimane sul mock e segnala la fonte tramite `source`.
 *
 * Tutti i call-site sostituiscono `generateUpcomingAppointments()` con
 * `useAppointments().appointments`. Il mock continua a vivere come
 * fallback e demo offline.
 */
export function useAppointments(): UseAppointmentsResult {
  const [state, setState] = useState<UseAppointmentsResult>(() => ({
    appointments: generateUpcomingAppointments(),
    source: 'loading',
    isReal: false,
  }));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Token dal client Supabase condiviso (singleton di lib/supabase/client).
        const { data: sess } = await supabase().auth.getSession();
        const token = sess.session?.access_token;
        if (!token) {
          if (!cancelled) {
            setState((s) => ({ ...s, source: 'mock-unauthenticated' }));
          }
          return;
        }

        const res = await fetch('/api/me/appuntamenti', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setState((s) => ({ ...s, source: 'mock-error' }));
          return;
        }
        const body = (await res.json()) as {
          rows?: Array<{
            id: number;
            code: string;
            label_it: string;
            datetime: string;
            url: string | null;
            therapist_name: string | null;
          }>;
          source: 'gestionale' | 'no-patient-id';
        };

        if (body.source === 'no-patient-id') {
          if (!cancelled) {
            setState((s) => ({ ...s, source: 'mock-self-signup' }));
          }
          return;
        }

        const real = adaptResilientsAppointments(body.rows || []);
        // Se il gestionale non ha proprio nulla, lascia il mock visibile
        // (UX migliore — invece di un calendario vuoto).
        if (real.length === 0) {
          if (!cancelled) {
            setState((s) => ({ ...s, source: 'gestionale' }));
          }
          return;
        }
        if (!cancelled) {
          setState({
            appointments: real,
            source: 'gestionale',
            isReal: true,
          });
        }
      } catch (err) {
        console.warn('useAppointments fallback to mock:', err);
        if (!cancelled) setState((s) => ({ ...s, source: 'mock-error' }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
