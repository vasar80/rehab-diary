import type { ReactNode } from 'react';
import { AdminShell } from './_components/AdminShell';

// Tells search engines and previews not to index admin pages
export const metadata = {
  title: 'Kinora Admin',
  robots: { index: false, follow: false },
};

export default function KinoraAdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
