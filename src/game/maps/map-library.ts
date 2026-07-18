import {
  deserializeMapDefinition,
  type MapDefinition,
  serializeMapDefinition,
} from "../../core/maps/map-definition";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "ai-war-game.maps.v1";
const COPY_SUFFIX = " Copy";
const FIRST_DUPLICATE_SUFFIX = 2;
const EMPTY_MAP_LIST = "[]";
const EMPTY_NAME_LENGTH = 0;
const ID_DUPLICATE_SEPARATOR = "-";
const NAME_DUPLICATE_SEPARATOR = " ";

export class BrowserMapLibrary {
  public constructor(private readonly storage: StorageLike) {}

  public list(): readonly MapDefinition[] {
    const storedMaps = this.storage.getItem(STORAGE_KEY) ?? EMPTY_MAP_LIST;
    const parsed: unknown = JSON.parse(storedMaps);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((map) => deserializeMapDefinition(JSON.stringify(map)));
  }

  public save(map: MapDefinition): void {
    const maps = this.list();
    const existingIndex = maps.findIndex((item) => item.id === map.id);
    const nextMaps = [...maps];

    if (existingIndex >= 0) {
      nextMaps[existingIndex] = map;
    } else {
      nextMaps.push(map);
    }

    this.persist(nextMaps);
  }

  public isNameAvailable(id: string, name: string): boolean {
    const trimmedName = name.trim();

    return (
      trimmedName.length > EMPTY_NAME_LENGTH &&
      !this.list().some((map) => map.id !== id && map.name === trimmedName)
    );
  }

  public copy(id: string): MapDefinition {
    const map = this.requireMap(id);
    const copy = {
      ...map,
      id: createUniqueId(map.id, this.list()),
      name: createUniqueName(`${map.name}${COPY_SUFFIX}`, this.list()),
    };

    this.save(copy);
    return copy;
  }

  public delete(id: string): void {
    this.persist(this.list().filter((map) => map.id !== id));
  }

  public import(serializedMap: string): MapDefinition {
    const imported = deserializeMapDefinition(serializedMap);
    const maps = this.list();
    const storedMap = {
      ...imported,
      id: createUniqueId(imported.id, maps),
      name: createUniqueName(imported.name, maps),
    };

    this.save(storedMap);
    return storedMap;
  }

  public export(id: string): string {
    return serializeMapDefinition(this.requireMap(id));
  }

  private requireMap(id: string): MapDefinition {
    const map = this.list().find((item) => item.id === id);

    if (!map) {
      throw new Error(`Map '${id}' does not exist in the local library.`);
    }

    return map;
  }

  private persist(maps: readonly MapDefinition[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }
}

export function getBrowserMapLibrary(): BrowserMapLibrary {
  return new BrowserMapLibrary(window.localStorage);
}

function createUniqueId(preferredId: string, maps: readonly MapDefinition[]): string {
  return createUniqueValue(
    preferredId,
    maps.map((map) => map.id),
    ID_DUPLICATE_SEPARATOR,
  );
}

function createUniqueName(preferredName: string, maps: readonly MapDefinition[]): string {
  return createUniqueValue(
    preferredName,
    maps.map((map) => map.name),
    NAME_DUPLICATE_SEPARATOR,
  );
}

function createUniqueValue(
  preferredValue: string,
  existingValues: readonly string[],
  separator: string,
): string {
  if (!existingValues.includes(preferredValue)) {
    return preferredValue;
  }

  let suffix = FIRST_DUPLICATE_SUFFIX;
  let candidate = `${preferredValue}${separator}${suffix}`;

  while (existingValues.includes(candidate)) {
    suffix += 1;
    candidate = `${preferredValue}${separator}${suffix}`;
  }

  return candidate;
}
