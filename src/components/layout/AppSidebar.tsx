import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Search,
  BookOpen,
  Plug,
  FolderOpen,
  Star,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Wand2,
  LogIn,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/lib/store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/lib/auth/auth.guard";
import { setSession } from "@/lib/auth/auth.store";
import { useServerFn } from "@tanstack/react-start";
import { bypassLoginServer } from "@/lib/auth/auth.functions";
import { isDemoMode } from "@/lib/demo-mode";

type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  search?: Record<string, string>;
};

const MAIN: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Nouveau site", to: "/wizard", icon: Wand2 },
  { label: "Resources", to: "/resources", icon: BookOpen },
  { label: "Connectors", to: "/connectors", icon: Plug },
];

const PROJECT_LINKS: NavItem[] = [
  { label: "Tous les projets", to: "/projects", icon: FolderOpen },
  { label: "Favoris", to: "/projects", icon: Star, search: { filter: "starred" } },
];

export function AppSidebar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const projects = useProjects();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as { filter?: string } });
  const { user, isAuthenticated, logout } = useAuth();
  const runBypass = useServerFn(bypassLoginServer);

  useEffect(() => {
    const stored = window.localStorage.getItem("GuardSite AI.sidebar.collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const setCollapsedPersist = (value: boolean) => {
    setCollapsed(value);
    window.localStorage.setItem("GuardSite AI.sidebar.collapsed", value ? "1" : "0");
  };

  const rowClass = (active: boolean) =>
    cn(
      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
      collapsed && "justify-center px-0",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
    );

  const isActive = (item: NavItem) => {
    if (pathname !== item.to) return false;
    if (item.search?.["filter"]) return search.filter === item.search["filter"];
    return !search.filter;
  };

  const NavRow = ({ item }: { item: NavItem }) => (
    <Link
      to={item.to}
      search={item.search as never}
      title={collapsed ? item.label : undefined}
      className={rowClass(isActive(item))}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  const recents = projects.slice(0, 4);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-out md:flex",
        collapsed ? "w-[68px] px-2" : "w-[264px] px-3",
      )}
      aria-label="Barre de navigation"
    >
      <div className={cn("flex items-center gap-3 py-4", collapsed && "justify-center")}>
        <Link
          to="/"
          aria-label="Accueil GuardSite AI"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg gradient-primary text-primary-foreground"
        >
          <Sparkles className="h-4 w-4" />
        </Link>
        {!collapsed && (
          <>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">GuardSite AI</p>
              <p className="truncate text-xs text-muted-foreground">EPITNET 2026</p>
            </div>
            <button
              type="button"
              aria-label="Replier la barre latérale"
              onClick={() => setCollapsedPersist(true)}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          aria-label="Déplier la barre latérale"
          onClick={() => setCollapsedPersist(false)}
          className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <div className="flex-1 overflow-y-auto pb-4">
        <nav className="space-y-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className={rowClass(false)}
            title="Rechercher"
          >
            <Search className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate">Recherche</span>
                <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground">
                  Ctrl K
                </kbd>
              </>
            )}
          </button>
          {MAIN.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </nav>

        <div className="mt-6">
          {collapsed ? (
            <div className="mx-auto mb-3 h-px w-6 bg-border" />
          ) : (
            <p className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
              Projets
            </p>
          )}
          <nav className="space-y-1">
            {PROJECT_LINKS.map((item) => (
              <NavRow key={item.label} item={item} />
            ))}
          </nav>
        </div>

        {recents.length > 0 && (
          <div className="mt-6">
            {collapsed ? (
              <div className="mx-auto mb-3 h-px w-6 bg-border" />
            ) : (
              <p className="mb-2 px-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
                Récents
              </p>
            )}
            <nav className="space-y-1">
              {recents.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  title={collapsed ? p.brief.siteName : undefined}
                  className={rowClass(pathname === `/projects/${p.id}`)}
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{p.brief.siteName}</span>}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border py-3">
        <div className={cn("mb-3", collapsed && "flex justify-center")}>
          <ThemeToggle className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" />
        </div>
        {collapsed ? (
          isAuthenticated ? (
            <button
              type="button"
              aria-label="Déconnexion"
              onClick={() => void logout()}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/login"
              aria-label="Connexion"
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <LogIn className="h-4 w-4" />
            </Link>
          )
        ) : isAuthenticated ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                  {user?.name?.charAt(0) ?? "?"}
                </span>
                <span className="truncate">{user?.name ?? "Compte"}</span>
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <LogIn className="h-3.5 w-3.5" />
              Se connecter
            </Link>
            {isDemoMode() && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const session = await runBypass({});
                    setSession(session);
                  } catch {
                    // bypass géré par le store
                  }
                }}
                aria-label="Accès démo"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Accès démo
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
