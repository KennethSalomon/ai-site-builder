import { createContext } from "react";
import type { AuthContextValue } from "./auth.types";

/** Contexte React pour l'authentification. Séparé du provider pour le fast-refresh. */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
