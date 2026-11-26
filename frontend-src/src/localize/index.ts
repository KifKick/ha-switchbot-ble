import type { HomeAssistant } from "../types";
import { en, type Strings } from "./en";
import { pl } from "./pl";

const LANGUAGES: Record<string, Strings> = { en, pl };

/** Dotted key paths of the string tree, e.g. "lock.modes" or "common.save". */
type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string | readonly string[]
    ? `${P}${K}`
    : T[K] extends Record<string, string>
      ? `${P}${K}` | `${P}${K}.${string}`
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type StringKey = Leaves<Strings>;
export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export function language(hass?: HomeAssistant): "en" | "pl" {
  const lang = hass?.locale?.language || hass?.language || "en";
  return lang.startsWith("pl") ? "pl" : "en";
}

function lookup(tree: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], tree);
}

/** Translator bound to the user's language, falling back to English, then the key. */
export function localize(hass?: HomeAssistant): Translate {
  const strings = LANGUAGES[language(hass)];
  return (key, vars = {}) => {
    let s = lookup(strings, key) ?? lookup(en, key);
    if (typeof s !== "string") return key;
    for (const [k, v] of Object.entries(vars)) s = (s as string).replace(`{${k}}`, String(v));
    return s as string;
  };
}

/** Arrays such as weekday names. */
export function localizeList(hass: HomeAssistant | undefined, key: "lock.states" | "keypad.weekdays"): readonly string[] {
  const strings = LANGUAGES[language(hass)];
  return (lookup(strings, key) ?? lookup(en, key)) as readonly string[];
}

export function locale(hass?: HomeAssistant): string {
  return language(hass) === "pl" ? "pl-PL" : "en-GB";
}

export function formatDateTime(hass: HomeAssistant | undefined, iso?: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(locale(hass), { dateStyle: "short", timeStyle: "short" });
}
