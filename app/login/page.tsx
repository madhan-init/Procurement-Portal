import { getLang } from "@/lib/lang";
import LoginClient from "./login-client";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  return <LoginClient lang={await getLang()} />;
}
