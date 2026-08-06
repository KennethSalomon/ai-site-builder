import type { ReactNode } from "react";

/** Classes d'input réutilisées par le wizard et la page d'accueil. */
export const inputClass =
  "h-11 w-full rounded-xl border border-border bg-card/60 px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";

export const textareaClass =
  "h-32 w-full resize-none rounded-xl border border-border bg-card/60 p-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary";

/** Champ avec libellé et aide optionnelle. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
