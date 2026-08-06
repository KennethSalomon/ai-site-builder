import type { ReactNode } from "react";

/**
 * Champ de formulaire d'authentification : libellé, contrôle enfant
 * et message d'erreur optionnel. Réutilise le style `inputClass` pour
 * garantir la cohérence avec le reste du design system.
 */
export function AuthField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

/** Bouton plein page avec gradient primaire (CTA principal des formulaires). */
export function AuthSubmitButton({
  children,
  disabled,
  loading,
}: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full rounded-xl gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Séparateur "ou" entre les boutons sociaux et le formulaire. */
export function AuthDivider() {
  return (
    <div className="relative my-5 flex items-center">
      <span className="h-px flex-1 bg-border" />
      <span className="px-3 text-xs uppercase tracking-wider text-muted-foreground">Ou</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
