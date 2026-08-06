import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/lib/auth/auth.schema";
import { loginServer, bypassLoginServer, googleLoginServer } from "@/lib/auth/auth.functions";
import { GOOGLE_DEMO_TOKEN } from "@/lib/auth/google-demo";
import { isDemoMode } from "@/lib/demo-mode";
import { setSession } from "@/lib/auth/auth.store";
import { AuthField, AuthSubmitButton, AuthDivider } from "./auth-form-field";
import { inputClass } from "@/components/ui/field";

type LoginErrorMap = Record<string, string>;

export function LoginForm() {
  const navigate = useNavigate();
  const runLogin = useServerFn(loginServer);
  const runBypass = useServerFn(bypassLoginServer);
  const runGoogle = useServerFn(googleLoginServer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrorMap>({});
  const [loading, setLoading] = useState(false);
  const demoMode = isDemoMode();

  const validate = (): boolean => {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const map: LoginErrorMap = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        map[key] = issue.message;
      }
      setErrors(map);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const session = await runLogin({ data: { email, password } });
      setSession(session);
      toast.success("Connexion réussie");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const msg =
        err instanceof Response
          ? await err.text().catch(() => "Échec de la connexion.")
          : err instanceof Error
            ? err.message
            : "Échec de la connexion.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async () => {
    setLoading(true);
    try {
      const session = await runBypass({});
      setSession(session);
      toast.success("Connexion en mode démo");
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("Le bypass a échoué.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const session = await runGoogle({ data: { idToken: GOOGLE_DEMO_TOKEN } });
      setSession(session);
      toast.success("Connexion Google réussie");
      void navigate({ to: "/dashboard" });
    } catch {
      toast.error("La connexion Google a échoué.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-center text-2xl font-semibold text-foreground">Connexion</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Accédez à votre espace de travail GuardSite AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email" error={errors["email"]}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.fr"
            className={inputClass}
          />
        </AuthField>

        <AuthField label="Mot de passe" error={errors["password"]}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={"pr-10 " + inputClass}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </AuthField>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary-glow"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <AuthSubmitButton disabled={!email || !password} loading={loading}>
          Se connecter
        </AuthSubmitButton>
      </form>

      <AuthDivider />

      {demoMode && (
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285EA"
              d="M22.56 12.15c0-.97-.09-1.92-.24-2.85H12v5.63h5.92c-.39 2.05-1.54 3.8-3.35 4.99l-.01-.01v.01C17.42 18.19 20.23 15.35 20.23 11.66L20.23 11.66Z"
            />
            <path
              fill="#34A853"
              d="M12 21.32c2.67 0 4.91-.87 6.67-2.36l-.01-.01c-1.84-1.72-4.18-2.8-6.67-2.8-2.42 0-4.62.93-6.28 2.43l-.01.01C6.73 19.68 9.09 20.81 12 20.81Z"
            />
            <path
              fill="#FBBC05"
              d="M5.57 10.46c-.18-.92-.29-1.87-.29-2.84 0-1.06.11-2.11.31-3.13l-.02-.01C3.72 5.93 2.5 8.19 2.5 10.66c0 1.35.33 2.63.91 3.74l.01-.01Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.29c1.43 0 2.78.57 3.81 1.5l.01-.01c1 .1 1.99.77 2.81 1.69l.01.01c.82-.63 1.41-1.53 1.67-2.53-.01-.01-.02-.02-.03-.03C17.42 5.48 17.42 5.48 17.42 5.48 16.91 3.93 15.39 2.72 13.5 2.72L12 2.75 9.33 2.72C8.06 2.72 6.93 3.53 5.96 4.53Z"
            />
          </svg>
          Continuer avec Google
        </button>
      )}

      <div className="border-t border-border pt-4 text-center">
        {demoMode && (
          <button
            type="button"
            onClick={handleBypass}
            disabled={loading}
            className="text-xs text-muted-foreground underline decoration-muted-foreground/40 decoration-offset-2 underline-offset-2 hover:text-primary-glow hover:decoration-primary-glow"
          >
            {loading ? "Connexion…" : "Accéder en mode démo (bypass hackathon)"}
          </button>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/register" className="text-primary-glow hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
