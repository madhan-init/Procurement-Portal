// A throwaway copy of the pushed template DB per test file — the service seam
// is exercised against real SQLite, no mocks.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const template = path.resolve(process.cwd(), "prisma", "test-template.db");

export function testDb() {
  const file = path.resolve(process.cwd(), "prisma", `test-${crypto.randomUUID()}.db`);
  fs.copyFileSync(template, file);
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${file}?connection_limit=1&socket_timeout=30` } } });
  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      for (const suffix of ["", "-journal", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
    },
  };
}
