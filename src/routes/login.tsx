import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { seoMeta } from "@/lib/seo";
import { useAuth } from "@/lib/auth/auth.guard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: seoMeta("Connexion — GuardSite AI", "Connectez-vous à votre espace GuardSite AI."),
  }),
  component: LoginPage,
});

function LoginPage() {
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
      <LoginForm />
    </AuthShell>
  );
}
