// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { AuthContext } from "./auth-context";
import { shouldRedirectToLogin, useRequireAuth } from "./auth.guard";
import type { AuthContextValue } from "./auth.types";

const noopLogout = async (): Promise<void> => {};

afterEach(() => cleanup());

function baseValue(loading: boolean, isAuthenticated: boolean): AuthContextValue {
  return {
    user: isAuthenticated
      ? { id: "u1", email: "a@b.fr", name: "A", picture: undefined, provider: "credentials" }
      : null,
    loading,
    isAuthenticated,
    logout: noopLogout,
  };
}

function DashboardProbe() {
  useRequireAuth();
  return <p>page-dashboard</p>;
}

function LoginProbe() {
  return <p>page-login</p>;
}

const rootRoute = createRootRoute();
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardProbe,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginProbe,
});
const routeTree = rootRoute.addChildren([dashboardRoute, loginRoute]);

function renderAtDashboard(value: AuthContextValue) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
  });
  render(
    <AuthContext.Provider value={value}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
  return router;
}

describe("shouldRedirectToLogin (décision pure)", () => {
  it("ne redirige pas tant que la session est en cours de vérification", () => {
    expect(shouldRedirectToLogin(true, false)).toBe(false);
  });

  it("redirige une fois la vérification terminée sans session", () => {
    expect(shouldRedirectToLogin(false, false)).toBe(true);
  });

  it("ne redirige jamais un utilisateur authentifié", () => {
    expect(shouldRedirectToLogin(false, true)).toBe(false);
    expect(shouldRedirectToLogin(true, true)).toBe(false);
  });
});

describe("useRequireAuth — régression du rebond post-connexion", () => {
  it("reste sur la page protégée pendant la vérification (loading true)", async () => {
    renderAtDashboard(baseValue(true, false));
    expect(await screen.findByText("page-dashboard")).toBeDefined();
    expect(screen.queryByText("page-login")).toBeNull();
  });

  it("redirige vers /login après une vérification sans session (comportement attendu)", async () => {
    const router = renderAtDashboard(baseValue(false, false));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
    expect(await screen.findByText("page-login")).toBeDefined();
  });

  it("reste sur la page lorsque l'utilisateur est authentifié", async () => {
    const router = renderAtDashboard(baseValue(false, true));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dashboard");
    });
    expect(await screen.findByText("page-dashboard")).toBeDefined();
  });
});
