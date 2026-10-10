import { localeKey, t } from "./runtime";

const messages: Readonly<Record<string, string>> = {
  "Locale ID already exists.": localeKey("language.error.duplicate"),
  "Unknown English key.": localeKey("language.error.unknown"),
  "Only English can add keys.": localeKey("language.error.englishOnly"),
  "Key must be unique and nonempty.": localeKey("language.error.uniqueKey"),
  "Invalid locale schema or ID.": localeKey("language.error.invalidId"),
  "Invalid locale name or dictionary.": localeKey("language.error.invalidName"),
  "Locale catalog refresh failed.": localeKey("language.error.refresh"),
};
export function localeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (messages[message]) return t(messages[message]);
  if (message.startsWith("Invalid string: "))
    return t("language.error.invalidString", { key: message.slice("Invalid string: ".length) });
  if (message.startsWith("Empty English string: "))
    return t("language.error.emptyString", { key: message.slice("Empty English string: ".length) });
  if (message.startsWith("Unknown English key: "))
    return t("language.error.unknownString", {
      key: message.slice("Unknown English key: ".length),
    });
  if (message.startsWith("Incompatible placeholders: "))
    return t("language.error.placeholders", {
      key: message.slice("Incompatible placeholders: ".length),
    });
  return message;
}
