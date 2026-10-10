import type { DialogueEvent, DialogueLine } from "../../core/campaigns/definition";
export function localizedDialogueLine(
  event: DialogueEvent,
  line: DialogueLine,
  localeId: string,
): DialogueLine {
  const translated = line.id ? event.localizations?.[localeId]?.[line.id] : undefined;
  return {
    ...line,
    speaker: translated?.speaker?.trim() ? translated.speaker : line.speaker,
    text: translated?.text?.trim() ? translated.text : line.text,
  };
}
