import { randomUUID, randomBytes } from "node:crypto";

export function newId(): string {
  return randomUUID();
}

export function newSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function isoInDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
