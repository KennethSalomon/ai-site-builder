import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: seoMeta(
      "Mot de passe oublié — GuardSite AI",
      "Réinitialisez votre mot de passe GuardSite AI en quelques étapes.",
    ),
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthShell>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
