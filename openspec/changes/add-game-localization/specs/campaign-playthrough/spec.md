## MODIFIED Requirements

### Requirement: Stable playthrough snapshot
A playthrough SHALL use a snapshot of the authored campaign including dialogue translations, selected narrative language ID, resolved mission maps and participant configuration taken at start. Later editor, locale catalog, or language preference changes SHALL NOT affect that playthrough, including retry and next mission. Progression SHALL remain within the current session without requiring mid-mission or cross-reload resume.

#### Scenario: Campaign edited during a run
- **WHEN** a stored campaign or map changes after a playthrough starts
- **THEN** continuing or retrying the playthrough uses its original definitions

#### Scenario: Language changes during a run
- **WHEN** locale files or the stored preferred language change after launch
- **THEN** subsequent dialogue, retry, and next mission retain the run's original language and translation content
