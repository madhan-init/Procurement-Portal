import { NextResponse } from "next/server";
import { requestOtp, verifyOtp } from "@/lib/services/auth";
import { normalizePhone } from "@/lib/phone";
import { setFarmerSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });

  if (body.action === "request") {
    return NextResponse.json(await requestOtp(phone));
  }

  if (body.action === "verify") {
    const result = await verifyOtp({
      phone,
      otp: String(body.otp ?? ""),
      name: body.name,
      village: body.village,
      language: body.language,
    });
    if (!result.ok) {
      if ("needsProfile" in result) return NextResponse.json({ needsProfile: true }, { status: 200 });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await setFarmerSession(result.farmer.id);
    const res = NextResponse.json({
      farmer: { id: result.farmer.id, name: result.farmer.name, language: result.farmer.language },
      isNew: result.isNew,
    });
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
