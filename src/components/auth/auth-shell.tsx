import type { ReactNode } from "react";
import { Link, Outlet } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/ui/theme-toggle";

/**
 * Layout centré pour les pages d'authentification.
 * Contrairement à AppShell, aucune sidebar ni header de navigation :
 * on garde le focus sur le formulaire. Le design reste cohérent via
 * les utilitaires globaux (glass-panel, gradient-primary, oklch).
 */
export function AuthShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="m-auto flex w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-16">
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground"
        >
          <Sparkles className="h-5 w-5" />
        </Link>

        <div className="w-full rounded-3xl glass-panel p-6 shadow-elevated sm:p-8">{children}</div>

        <ThemeToggle />

        <p className="text-center text-xs text-muted-foreground">
          GuardSite AI — EPITNET 2026 · MVP hackathon
        </p>
      </div>

      {children === undefined && <Outlet />}
    </div>
  );
}
