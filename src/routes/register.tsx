import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { seoMeta } from "@/lib/seo";
import { useAuth } from "@/lib/auth/auth.guard";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: seoMeta(
      "Inscription — GuardSite AI",
      "Créez votre compte GuardSite AI en quelques secondes.",
    ),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = Route.useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      void navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading || isAuthenticated) return null;

  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
