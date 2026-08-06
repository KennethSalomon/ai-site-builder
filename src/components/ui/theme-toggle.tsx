import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/** Bascule clair/sombre, placée dans la barre latérale et l'en-tête mobile. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      className={
        className ??
        "rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      }
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
