// Shape + ceil-rule smoke against the running forecast service.
// Skips (with a visible note) when the service is down — `npm run forecast` first.
import { describe, it, expect } from "vitest";

const URL = process.env.FORECAST_SERVICE_URL ?? "http://localhost:8000";
const up = await fetch(`${URL}/health`).then((r) => r.ok).catch(() => false);

describe.skipIf(!up)("forecast service smoke", () => {
  it("serves shaped rows with suggested = ceil(predicted × 1.15)", async () => {
    const rows = await fetch(`${URL}/forecast?centre_id=1&days=5`).then((r) => r.json());
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.predicted_arrivals).toBeGreaterThanOrEqual(0);
      expect(r.suggested_capacity).toBe(Math.ceil(r.predicted_arrivals * 1.15));
    }
  });

  it("serves model-vs-baseline metrics", async () => {
    const m = await fetch(`${URL}/metrics`).then((r) => r.json());
    expect(m.model_mae).toBeGreaterThan(0);
    expect(m.baseline_mae).toBeGreaterThan(0);
    expect(m.holdout_days).toBe(14);
  });
});

if (!up) console.warn("[forecast-smoke] service not running — smoke tests skipped");
