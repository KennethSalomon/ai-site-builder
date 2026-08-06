import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";

import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";
import {
  authenticateUser,
  authenticateGoogle,
  createUser,
  getSession,
  clearSession,
  requestPasswordReset,
  confirmPasswordReset,
  bypassAuth,
} from "./auth.server";
import { assertAuthAllowed } from "../rate-limit.server";
import { isDemoMode } from "../demo-mode";
import type { AuthSession } from "./auth.types";

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

const resetTokenSchema = resetPasswordSchema.extend({
  token: z.string().min(16),
});

/** Vérifie la session courante (endpoint GET). */
export const getSessionServer = createServerFn({ method: "GET" }).handler(
  (): AuthSession | null => {
    return getSession();
  },
);

/** Déconnexion. */
export const logoutServer = createServerFn({ method: "POST" }).handler(() => {
  clearSession();
  return { success: true };
});

/** Inscription avec email + mot de passe. */
export const registerServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => registerSchema.parse(data))
  .handler(async ({ data }): Promise<AuthSession> => {
    assertAuthAllowed();
    const user = createUser(data.name, data.email, data.password);
    const session = authenticateUser(user.email, data.password);
    return session;
  });

/** Connexion avec email + mot de passe. */
export const loginServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<AuthSession> => {
    assertAuthAllowed();
    return authenticateUser(data.email, data.password);
  });

/** Connexion Google (MVP : jeton de démonstration vérifié côté serveur). */
export const googleLoginServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => googleLoginSchema.parse(data))
  .handler(async ({ data }): Promise<AuthSession> => {
    assertAuthAllowed();
    if (!isDemoMode()) {
      throw new Response("La connexion Google n'est pas disponible.", { status: 403 });
    }
    return authenticateGoogle(data.idToken);
  });

/** Demande de réinitialisation de mot de passe. */
export const forgotPasswordServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => forgotPasswordSchema.parse(data))
  .handler(async ({ data }) => {
    assertAuthAllowed();
    const token = requestPasswordReset(data.email);
    return { email: data.email, resetToken: token };
  });

/** Confirmation de réinitialisation de mot de passe. */
export const resetPasswordServer = createServerFn({ method: "POST" })
  .validator((data: unknown) => resetTokenSchema.parse(data))
  .handler(async ({ data }) => {
    assertAuthAllowed();
    const user = confirmPasswordReset(data.token, data.password);
    return { success: true, email: user.email };
  });

/** Bypass hackathon : auto-login demo — uniquement hors production (ou GUARDSITE_DEMO=1). */
export const bypassLoginServer = createServerFn({ method: "POST" }).handler((): AuthSession => {
  if (!isDemoMode()) {
    throw new Response("Le mode démo n'est pas disponible.", { status: 403 });
  }
  return bypassAuth();
});
