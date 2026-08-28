import { cookies } from "next/headers";
import { asLang, type Lang } from "./i18n";

/** Current UI language: explicit toggle cookie, else "en". */
export async function getLang(): Promise<Lang> {
  return asLang((await cookies()).get("sih_lang")?.value);
}
