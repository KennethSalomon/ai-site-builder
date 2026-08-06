/**
 * Logger minimal par niveaux (dev/prod).
 *
 * - `debug` : masqué en production (NODE_ENV=production) pour limiter le
 *   volume et éviter de logguer des données inutiles.
 * - `info` / `warn` / `error` : toujours visibles.
 *
 * Les fonctions console natives sont capturées au chargement pour rester
 * insensibles à un éventuel wrapper global (error-capture).
 */

type Level = "debug" | "info" | "warn" | "error";

const rawConsole = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

function isEnabled(level: Level): boolean {
  if (level === "debug") return process.env["NODE_ENV"] !== "production";
  return true;
}

function write(level: Level, args: unknown[]) {
  if (!isEnabled(level)) return;
  const fn = rawConsole[level];
  fn(`[guardsite:${level}]`, ...args);
}

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
