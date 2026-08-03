import { lazy, Suspense } from "react";
import { ROUTE_PATHS } from "./routePaths";

const LegacyWorkspacePage = lazy(() =>
  import("../pages/legacy/LegacyWorkspacePage")
);
const ProductionPage = lazy(() => import("../pages/Production/ProductionPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

function RouteLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-teal-400" />
        <p className="mt-4 text-sm font-semibold tracking-wide text-slate-300">
          Cargando FM Control…
        </p>
      </div>
    </main>
  );
}

function getCurrentPath() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path;
}

/**
 * RC3.1A routing boundary.
 *
 * This first migration step deliberately keeps the production workspace in a
 * compatibility page. The public route contract is now isolated, allowing
 * modules to be extracted one by one without rewriting the application entry.
 */
export default function AppRoutes() {
  const currentPath = getCurrentPath();
  const knownRoutes = new Set(Object.values(ROUTE_PATHS));

  let CurrentPage = NotFoundPage;

  if (currentPath === ROUTE_PATHS.production) {
    CurrentPage = ProductionPage;
  } else if (knownRoutes.has(currentPath)) {
    CurrentPage = LegacyWorkspacePage;
  }

  return (
    <Suspense fallback={<RouteLoader />}>
      <CurrentPage />
    </Suspense>
  );
}
