import { createFileRoute } from "@tanstack/react-router";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/reset-password/$token")({
  head: () => ({
    meta: seoMeta(
      "Réinitialiser le mot de passe — GuardSite AI",
      "Choisissez un nouveau mot de passe pour votre compte GuardSite AI.",
    ),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useParams();

  return (
    <AuthShell>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
