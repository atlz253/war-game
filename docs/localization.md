# Localization

Choose LANGUAGE from the main menu. Selection applies immediately, is local to this browser, and survives reloads. English is the default when preferences are corrupt or a pack is unavailable. A failed preference save reports that the language remains active for this session.

## Dictionary files

Place one JSON file per language in `src/game/localization/locales/<id>.json`. Files are discovered automatically; no registry edit is needed. For example:

```json
{
  "schemaVersion": 1,
  "id": "fr",
  "name": "Français",
  "strings": { "common.back": "RETOUR" }
}
```

The stable ID uses lowercase letters/numbers separated by single hyphens and must match the filename. Windows reserved filenames are rejected. The Unicode display name can change independently of the ID. `en.json` defines every canonical key and must contain nonempty values. Other dictionaries may omit keys or leave whitespace-only values; each missing value falls back to English. Unknown keys and invalid placeholder sets are rejected with filename diagnostics. Invalid or missing English fails the build.

Use named placeholders, for example `Turn {turn}: {name}`. Translations must preserve the same set of placeholder names; their order may differ. Parameter values are inserted literally. This format has no plural rules, rich text, automatic translation, RTL layout engine or automatic language detection.

Authored campaign/mission/map names and external diagnostic details remain verbatim. Interface language never changes actions, scoring, AI input or multiplayer protocols.

## DEV authoring

In LANGUAGE, select a language and choose EDIT LANGUAGE, or choose CREATE LANGUAGE and enter a unique stable ID. RENAME changes the display name only. Click a dictionary key to edit its value using the Canvas text dialog; Unicode, newlines and clipboard paste are supported. The English source and fallback status appear alongside each key. PREVIOUS/NEXT page through the dictionary. ADD STRING is available only while editing English and requires a unique nonempty key and nonempty source value.

SAVE writes the submitted snapshot to the project directory through `/__dev-localizations`. Writes are validated, bounded and atomic. Duplicate creation, unsafe paths and missing update targets are rejected. Failure retains both the file and the unsaved draft. BACK offers SAVE, DISCARD or CANCEL for unsaved changes. Edits made after a submitted save stay dirty. File changes refresh clean views; dirty drafts remain open with a notice. Discard loads the latest external version. Restarting the server reads the saved files. Production builds discover those same files and expose language selection without authoring or the source-write endpoint.

Buttons wrap and fit labels inside their bounds; long dictionary values are previewed in rows and edited in scrolling Canvas dialogs. Language management uses the same scaled presentation viewport as the existing settings, with no DOM controls.
