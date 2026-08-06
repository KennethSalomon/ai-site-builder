import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, Sparkles, LogIn, LogOut } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useProjects } from "@/lib/store";
import { useAuth } from "@/lib/auth/auth.guard";

const PAGES = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Nouveau site (wizard)", to: "/wizard" },
  { label: "Tous les projets", to: "/projects" },
  { label: "Resources", to: "/resources" },
  { label: "Connectors", to: "/connectors" },
  { label: "Accueil", to: "/" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const projects = useProjects();
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const handleLogout = () => {
    void logout();
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <AppSidebar onOpenSearch={() => setOpen(true)} />

      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Ouvrir le menu"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] bg-sidebar p-4">
              <SheetTitle className="text-sm text-sidebar-foreground">Navigation</SheetTitle>
              <nav className="mt-4 space-y-1">
                {PAGES.map((p) => (
                  <Link
                    key={p.to}
                    to={p.to}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    {p.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 border-t border-sidebar-border pt-3">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-destructive"
                  >
                    <span className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Déconnexion ({user?.name})
                    </span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  >
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Connexion
                    </span>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="grid h-7 w-7 place-items-center rounded-md gradient-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            GuardSite AI
          </Link>
          <button
            type="button"
            aria-label="Rechercher"
            onClick={() => setOpen(true)}
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une page ou un projet…" />
        <CommandList>
          <CommandEmpty>Aucun résultat.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((p) => (
              <CommandItem
                key={p.to}
                value={p.label}
                onSelect={() => go(() => navigate({ to: p.to }))}
              >
                {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Authentification">
            {isAuthenticated ? (
              <CommandItem value="Déconnexion" onSelect={() => go(handleLogout)}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion ({user?.name})
              </CommandItem>
            ) : (
              <CommandItem value="Connexion" onSelect={() => go(() => navigate({ to: "/login" }))}>
                <LogIn className="mr-2 h-4 w-4" />
                Connexion
              </CommandItem>
            )}
          </CommandGroup>
          {projects.length > 0 && (
            <CommandGroup
              heading={`Projets (${projects.length}${projects.length > 10 ? ", 10 affichés" : ""})`}
            >
              {projects.slice(0, 10).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.brief.siteName}
                  onSelect={() =>
                    go(() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } }))
                  }
                >
                  {p.brief.siteName}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {p.result.templateName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
