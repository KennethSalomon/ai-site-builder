import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { forgotPasswordSchema } from "@/lib/auth/auth.schema";
import { forgotPasswordServer } from "@/lib/auth/auth.functions";
import { AuthField, AuthSubmitButton } from "./auth-form-field";
import { inputClass } from "@/components/ui/field";

type ForgotErrorMap = Record<string, string>;

export function ForgotPasswordForm() {
  const navigate = useNavigate();
  const runForgot = useServerFn(forgotPasswordServer);
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<ForgotErrorMap>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const map: ForgotErrorMap = {};
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
      const result = await runForgot({ data: { email } });
      toast.success(`Un email de réinitialisation a été envoyé à ${result.email}.`, {
        description:
          process.env["NODE_ENV"] !== "production"
            ? `Token de secours (MVP) : ${result.resetToken}`
            : undefined,
        duration: 8000,
      });
      void navigate({ to: "/login" });
    } catch (err) {
      const msg =
        err instanceof Response
          ? await err.text().catch(() => "Échec de l'envoi.")
          : err instanceof Error
            ? err.message
            : "Échec de l'envoi du mot de passe.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-center text-2xl font-semibold text-foreground">Mot de passe oublié</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Saisissez votre email et nous vous enverrons un lien pour réinitialiser votre mot de
          passe.
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

        <AuthSubmitButton disabled={!email} loading={loading}>
          Envoyer le lien
        </AuthSubmitButton>
      </form>

      <div className="border-t border-border pt-4 text-center">
        <p className="text-xs text-muted-foreground">
          <Link to="/login" className="text-primary-glow hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
