import { describe, it, expect } from "vitest";
import { getAuthState, setSession, clearSessionClient, startLoading } from "./auth.store";

describe("auth store — état initial", () => {
  it("démarre en attente de la vérification serveur (loading true, jamais déconnecté)", () => {
    expect(getAuthState()).toMatchObject({ user: null, accessToken: null, loading: true });
  });

  it("setSession pose l'utilisateur et termine le chargement", () => {
    setSession({
      user: { id: "u1", email: "a@b.fr", name: "A", picture: undefined, provider: "credentials" },
      accessToken: "tok",
    });
    expect(getAuthState()).toMatchObject({ user: expect.any(Object), loading: false });
  });

  it("clearSessionClient repasse en vérification (loading true)", () => {
    setSession(null);
    clearSessionClient();
    expect(getAuthState()).toMatchObject({ user: null, loading: true });
  });

  it("startLoading conserve l'utilisateur courant et lève loading", () => {
    setSession({
      user: { id: "u1", email: "a@b.fr", name: "A", picture: undefined, provider: "credentials" },
      accessToken: "tok",
    });
    startLoading();
    const s = getAuthState();
    expect(s.loading).toBe(true);
    expect(s.user).not.toBeNull();
  });
});
