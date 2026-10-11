## MODIFIED Requirements

### Requirement: Dialogue authoring
Each dialogue event SHALL have a stable identity, one trigger and an ordered nonempty list of lines. Each line SHALL have a stable event-local identity and contain a nonempty English speaker name and text. The editor SHALL support adding, editing, removing and reordering events and lines in English, and editing translations for existing lines. Reordering SHALL preserve translations by line identity; removing a line SHALL remove its translations. Dialogue SHALL have no branching, gameplay choices or required portrait.

#### Scenario: Multiple speakers
- **WHEN** an author saves a valid dialogue containing lines from two named characters
- **THEN** runtime displays their names and texts in authored order

#### Scenario: Reorder translated lines
- **WHEN** an author moves an English line within its event
- **THEN** all translations stay attached to that line and follow its new position

#### Scenario: Add and delete English lines
- **WHEN** an author adds a line and removes another line in English
- **THEN** the new line receives a unique stable ID and initially uses English fallback in other languages
- **AND** the removed line's translation entries are removed

### Requirement: Replay dialogue history
Completed campaign mission records SHALL snapshot dialogue definitions, translations, the selected narrative language ID, and ordered occurrences, including selection-triggered occurrences positioned between accepted actions. Playback SHALL use that record without live campaign or locale content, live selection triggers, AI or network inference. Older action-only and English narrative records SHALL remain readable; legacy narrative defaults to English.

#### Scenario: Selection between actions
- **WHEN** a mission records a selection dialogue between its first and second accepted actions
- **THEN** forward replay shows that dialogue at the same boundary even if the campaign is edited later

#### Scenario: Seek and replay
- **WHEN** replay seeks backward or to a nonadjacent frame while dialogue is open
- **THEN** the modal and stale callbacks are canceled and the target frame renders immediately
- **AND** subsequent forward traversal shows recorded occurrences for the traversed boundary in their stored order

#### Scenario: Translation changes after recording
- **WHEN** source translations change or their language pack is removed after a translated mission is recorded
- **THEN** replay dialogue retains the recorded language and text with English fallback from its snapshot
- **AND** replay controls use the viewer's current interface language

## ADDED Requirements

### Requirement: Localized dialogue presentation
Dialogue speaker and text SHALL resolve independently from the snapshotted language translations by line identity, falling back to the English source for absent or whitespace-only fields. Translation SHALL preserve event triggers, line order, modal input barriers, pause position, and deterministic results.

#### Scenario: Partial dialogue translation
- **WHEN** the selected language has translated text but no translated speaker for a line
- **THEN** the dialogue displays translated text with the English speaker

#### Scenario: Missing dialogue locale
- **WHEN** no dictionary exists for the selected language in the campaign
- **THEN** all dialogue lines display their English source in the same event order
