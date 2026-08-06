import { useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { getSessionServer, logoutServer } from "./auth.functions";
import { setSession, getAuthState, startLoading, useAuthState } from "./auth.store";
import { AuthContext } from "./auth-context";
import type { AuthSession } from "./auth.types";

export function AuthProvider({ children }: { children: ReactNode }) {
  const runGetSession = useServerFn(getSessionServer);
  const runLogout = useServerFn(logoutServer);

  const refresh = useMutation({
    mutationFn: async () => runGetSession({}),
    onMutate: () => startLoading(),
    onSuccess: (session: AuthSession | null) => {
      // Ne pas écraser une session posée entre-temps (ex. connexion pendant la vérification).
      if (!session && getAuthState().user) return;
      setSession(session);
    },
    onError: () => {
      if (getAuthState().user) return;
      setSession(null);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => runLogout({}),
    onSuccess: () => setSession(null),
    onError: () => setSession(null),
  });

  useEffect(() => {
    refresh.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useAuthState();

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        loading: state.loading,
        isAuthenticated: state.user !== null,
        logout: async () => {
          await logoutMutation.mutateAsync();
          return;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
