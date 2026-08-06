import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordSchema } from "@/lib/auth/auth.schema";
import { resetPasswordServer } from "@/lib/auth/auth.functions";
import { AuthField, AuthSubmitButton } from "./auth-form-field";
import { inputClass } from "@/components/ui/field";

type ResetErrorMap = Record<string, string>;

export function ResetPasswordForm({ token }: { token: string }) {
  const navigate = useNavigate();
  const runReset = useServerFn(resetPasswordServer);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ResetErrorMap>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const parsed = resetPasswordSchema
      .extend({ token: resetPasswordSchema.shape.password })
      .safeParse({
        password,
        token,
      });
    if (!parsed.success) {
      const map: ResetErrorMap = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as string;
        map[key] = issue.message;
      }
      setErrors(map);
      return false;
    }
    if (password !== confirm) {
      setErrors({ password: "Les mots de passe ne correspondent pas." });
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
      await runReset({ data: { token, password } });
      toast.success("Mot de passe modifié. Vous pouvez maintenant vous connecter.");
      void navigate({ to: "/login" });
    } catch (err) {
      const msg =
        err instanceof Response
          ? await err.text().catch(() => "Échec de la réinitialisation.")
          : err instanceof Error
            ? err.message
            : "Échec de la réinitialisation.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-center text-2xl font-semibold text-foreground">Nouveau mot de passe</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Choisissez un nouveau mot de passe (8 caractères minimum).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          label="Nouveau mot de passe"
          hint="8 caractères minimum."
          error={errors["password"]}
        >
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

        <AuthField label="Confirmer le mot de passe">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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

        <AuthSubmitButton disabled={!password || !confirm} loading={loading}>
          Réinitialiser le mot de passe
        </AuthSubmitButton>
      </form>
    </div>
  );
}
