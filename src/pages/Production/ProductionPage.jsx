import LegacyApp from "../../LegacyApp";

/**
 * RC3.1B - Production route boundary.
 *
 * Production now has its own lazy-loaded page and public route. The existing
 * production workflow remains inside LegacyApp during the first extraction
 * block, which keeps Supabase, labels, rejects and operator flows unchanged.
 */
export default function ProductionPage() {
  return <LegacyApp initialWorkspaceModule="production" />;
}
