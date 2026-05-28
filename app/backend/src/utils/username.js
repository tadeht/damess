import crypto from "crypto";
import { prisma } from "../config/prisma.js";

function toAsciiSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function createBaseUsername({ fullName, email }) {
  const emailBase = toAsciiSlug(String(email || "").split("@")[0]);

  if (emailBase.length >= 4) {
    return emailBase.slice(0, 12);
  }

  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lastName = toAsciiSlug(parts.at(-1));
  const initials = toAsciiSlug(parts.slice(0, -1).map((part) => part[0]).join(""));
  const nameBase = `${lastName}${initials}`;

  return (nameBase || emailBase || "user").slice(0, 12);
}

export function normalizeUsername(value) {
  return toAsciiSlug(value).slice(0, 32);
}

export async function createUniqueUsername({ fullName, email }) {
  const base = createBaseUsername({ fullName, email });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = crypto.randomInt(10000, 100000).toString();
    const username = `${base}${suffix}`;
    const existed = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!existed) {
      return username;
    }
  }

  return `user${Date.now()}`;
}
