import { redirect } from 'next/navigation';

/**
 * /super è stato consolidato dentro /kinora-admin (la dashboard completa
 * con pazienti, agenti AI, tier-config, accessi, video, diari, contratti).
 * Manteniamo questo redirect per non rompere eventuali bookmark o link
 * vecchi. Le sub-route /super/ai e /super/push restano accessibili ma
 * verranno migrate sotto /kinora-admin nei prossimi step.
 */
export default function LegacySuperAdminRedirect() {
  redirect('/kinora-admin');
}
