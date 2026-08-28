import { cookies } from "next/headers";

const FARMER_COOKIE = "sih_farmer";
const ADMIN_COOKIE = "sih_admin";
const OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/" };

// Mock cookie sessions (hackathon scope): the value is the farmer id.
export async function setFarmerSession(farmerId: number) {
  (await cookies()).set(FARMER_COOKIE, String(farmerId), OPTS);
}

export async function getFarmerId(): Promise<number | null> {
  const v = (await cookies()).get(FARMER_COOKIE)?.value;
  const id = v ? Number(v) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function clearFarmerSession() {
  (await cookies()).delete(FARMER_COOKIE);
}

export async function setAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, "ok", OPTS);
}

export async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(ADMIN_COOKIE)?.value === "ok";
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
