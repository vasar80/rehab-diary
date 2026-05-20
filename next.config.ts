import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl è usato SOLO dai moduli applicativi in `src/modules/*` —
// resi disponibili sotto `/apps/[slug]`. Il resto dell'app NON dipende
// da next-intl. Il plugin richiede comunque il puntamento al file di
// configurazione (anche se la app non usa il routing locale-based).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
