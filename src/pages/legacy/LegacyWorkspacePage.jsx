import LegacyApp from "../../LegacyApp";

/**
 * RC3.1A compatibility page.
 *
 * The current production workspace remains intact while routing and page
 * boundaries are introduced around it. Later RC3.1 phases can extract each
 * module from LegacyApp without changing the public routing contract.
 */
export default function LegacyWorkspacePage() {
  return <LegacyApp />;
}
