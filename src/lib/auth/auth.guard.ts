import { useContext, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthContext } from "./auth-context";
import { useAuthState } from "./auth.store";
import type { AuthContextValue } from "./auth.types";

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Décision pure du garde : rediriger seulement une fois la session vérifiée
 * (loading terminé) ET l'utilisateur absent. Tant que `loading` est vrai, on
 * attend la réponse du serveur au lieu de renvoyer vers /login.
 */
export function shouldRedirectToLogin(loading: boolean, isAuthenticated: boolean): boolean {
  return !loading && !isAuthenticated;
}

/**
 * Redirige vers /login si l'utilisateur n'est pas authentifié.
 * À appeler au début de tout composant de route protégée.
 */
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (shouldRedirectToLogin(loading, isAuthenticated)) {
      void navigate({ to: "/login" });
    }
  }, [isAuthenticated, loading, navigate]);

  return { isAuthenticated, loading };
}

/**
 * Hook léger pour récupérer l'utilisateur courant côté client.
 */
export function useCurrentUser() {
  const state = useAuthState();
  return state.user;
}
