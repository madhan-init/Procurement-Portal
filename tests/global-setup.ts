// Pushes the schema into a template SQLite file once; each test file copies it.
import { execSync } from "node:child_process";
import path from "node:path";

export default function setup() {
  const url = `file:${path.resolve(process.cwd(), "prisma", "test-template.db")}`;
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
}
