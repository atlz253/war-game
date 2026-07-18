export interface MapNameEditState {
  readonly originalName: string;
  readonly value: string;
}

export const MAP_NAME_INPUT_MAX_LENGTH = 32;

const EMPTY_NAME_LENGTH = 0;
const LAST_CHARACTER_OFFSET = 1;

export function createMapNameEditState(name: string): MapNameEditState {
  return { originalName: name, value: name };
}

export function appendMapNameCharacter(name: string, character: string): string {
  if (name.length >= MAP_NAME_INPUT_MAX_LENGTH || character.length === EMPTY_NAME_LENGTH) {
    return name;
  }

  return `${name}${character}`.slice(0, MAP_NAME_INPUT_MAX_LENGTH);
}

export function deleteLastMapNameCharacter(name: string): string {
  return name.slice(0, -LAST_CHARACTER_OFFSET);
}

export function isMapNameInputValid(name: string): boolean {
  return name.trim().length > EMPTY_NAME_LENGTH;
}

export function confirmMapNameEdit(state: MapNameEditState): string | null {
  const name = state.value.trim();
  return isMapNameInputValid(name) ? name : null;
}

export function cancelMapNameEdit(state: MapNameEditState): string {
  return state.originalName;
}
