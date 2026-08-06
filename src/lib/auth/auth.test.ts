import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
  setCookie: vi.fn(),
  getCookie: vi.fn(() => undefined),
  deleteCookie: vi.fn(),
}));

import {
  createUser,
  authenticateUser,
  authenticateGoogle,
  requestPasswordReset,
  confirmPasswordReset,
  bypassAuth,
  _resetAuthForTests,
} from "./auth.server";
import { loginSchema, registerSchema, resetPasswordSchema } from "./auth.schema";

describe("auth.server", () => {
  beforeEach(() => _resetAuthForTests());

  describe("createUser", () => {
    it("creates a user with normalized email", () => {
      const user = createUser("Alice", "  Alice@Example.com  ", "password123");
      expect(user.email).toBe("alice@example.com");
      expect(user.name).toBe("Alice");
      expect(user.id).toBeDefined();
      expect(user.picture).toBeUndefined();
      expect(user.provider).toBe("credentials");
    });

    it("throws 409 if email already exists", () => {
      createUser("Alice", "alice@example.com", "password123");
      expect(() => createUser("Bob", "ALICE@example.com", "password456")).toThrow(Response);
    });
  });

  describe("authenticateUser", () => {
    beforeEach(() => createUser("Alice", "alice@example.com", "password123"));

    it("returns a session with a valid accessToken on correct password", () => {
      const session = authenticateUser("alice@example.com", "password123");
      expect(session.accessToken).toBeDefined();
      expect(session.accessToken.length).toBeGreaterThan(16);
      expect(session.user.email).toBe("alice@example.com");
      expect(session.user.name).toBe("Alice");
    });

    it("throws 401 for wrong password", () => {
      expect(() => authenticateUser("alice@example.com", "wrong")).toThrow(Response);
    });

    it("throws 401 for unknown email", () => {
      expect(() => authenticateUser("nobody@example.com", "password123")).toThrow(Response);
    });
  });

  describe("authenticateGoogle", () => {
    it("creates the demo Google user with the valid demo token", () => {
      const session = authenticateGoogle("demo-google-token");
      expect(session.user.provider).toBe("google");
      expect(session.user.email).toBe("google.demo@guardsite.ai");
      expect(session.user.name).toBe("Utilisateur Google");
    });

    it("returns the same demo user on subsequent logins", () => {
      const first = authenticateGoogle("demo-google-token");
      const second = authenticateGoogle("demo-google-token");
      expect(second.user.id).toBe(first.user.id);
    });

    it("rejects an unknown token without creating a session", () => {
      expect(() => authenticateGoogle("forged-token")).toThrow(Response);
    });
  });

  describe("requestPasswordReset + confirmPasswordReset", () => {
    beforeEach(() => createUser("Alice", "alice@example.com", "password123"));

    it("generates a token and allows password reset", () => {
      const token = requestPasswordReset("alice@example.com");
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // randomBytes(32).toString("hex")

      const user = confirmPasswordReset(token, "newpassword456");
      expect(user.email).toBe("alice@example.com");
    });

    it("allows login with new password after reset", () => {
      const token = requestPasswordReset("alice@example.com");
      confirmPasswordReset(token, "newpassword456");

      const session = authenticateUser("alice@example.com", "newpassword456");
      expect(session.user.email).toBe("alice@example.com");
    });

    it("throws 404 for unknown email on reset request", () => {
      expect(() => requestPasswordReset("nobody@example.com")).toThrow(Response);
    });

    it("throws 400 for a used token", () => {
      const token = requestPasswordReset("alice@example.com");
      confirmPasswordReset(token, "newpassword456");
      expect(() => confirmPasswordReset(token, "another")).toThrow(Response);
    });

    it("throws 400 for a too-short token", () => {
      expect(() => confirmPasswordReset("short", "newpass")).toThrow(Response);
    });
  });

  describe("bypassAuth", () => {
    it("returns a session as the demo user", () => {
      const session = bypassAuth();
      expect(session.user.email).toBe("demo@guardsite.ai");
      expect(session.user.name).toBe("Démo GuardSite AI");
      expect(session.accessToken).toBeDefined();
    });
  });
});

describe("auth.schema", () => {
  it("loginSchema rejects empty email and short password", () => {
    expect(() => loginSchema.parse({ email: "", password: "123" })).toThrow();
    expect(() => loginSchema.parse({ email: "not-an-email", password: "123456" })).toThrow();
  });

  it("loginSchema accepts valid credentials", () => {
    expect(loginSchema.parse({ email: "alice@example.com", password: "password123" })).toEqual({
      email: "alice@example.com",
      password: "password123",
    });
  });

  it("registerSchema requires a name", () => {
    expect(() =>
      registerSchema.parse({ name: "", email: "a@b.com", password: "password123" }),
    ).toThrow();
  });

  it("resetPasswordSchema enforces minimum password length", () => {
    expect(() => resetPasswordSchema.parse({ password: "short" })).toThrow();
  });
});
