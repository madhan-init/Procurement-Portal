// Pushes the schema into a template SQLite file once; each test file copies it.
import { execSync } from "node:child_process";
import path from "node:path";

export default function setup() {
  const url = `file:${path.resolve(process.cwd(), "prisma", "test-template.db")}`;
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: {
      ...process.env,
      DATABASE_URL: url,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "Yes, reset dev.db freely",
    },
    stdio: "inherit",
  });
}
