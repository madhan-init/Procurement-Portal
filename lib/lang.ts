import type { Lang } from "./i18n";

/** UI language. Hindi is deferred for now (user decision 2026-08-28):
 *  the dictionary and Devanagari font stay in the repo for a quick re-add,
 *  but every surface renders English. Restore by re-reading the sih_lang
 *  cookie here and re-adding the toggles. */
export async function getLang(): Promise<Lang> {
  return "en";
}
