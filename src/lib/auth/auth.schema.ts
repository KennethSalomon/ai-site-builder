import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email requis.").max(254, "Email trop long.").email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis.").max(256, "Mot de passe trop long."),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nom requis.").max(100, "Nom trop long."),
  email: z.string().min(1, "Email requis.").max(254, "Email trop long.").email("Email invalide."),
  password: z.string().min(8, "8 caractères minimum.").max(256, "Mot de passe trop long."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email requis.").max(254, "Email trop long.").email("Email invalide."),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, "8 caractères minimum.").max(256, "Mot de passe trop long."),
});
