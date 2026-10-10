import { t } from "../localization/runtime";
import type { StorageLike } from "../maps/map-library";
import {
  deserializeRecordedMatch,
  type RecordedMatch,
  serializeRecordedMatch,
} from "./recorded-match";

const STORAGE_KEY = "ai-war-game.replays.v1";
const EMPTY_REPLAY_LIST = "[]";
const ID_SEPARATOR = "-";
const NAME_SEPARATOR = " ";
const FIRST_DUPLICATE_SUFFIX = 2;

export class BrowserReplayLibrary {
  public constructor(private readonly storage: StorageLike) {}

  public list(): readonly RecordedMatch[] {
    const parsed = parseStoredReplays(this.storage.getItem(STORAGE_KEY));

    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap(deserializeStoredReplay);
  }

  public get(id: string): RecordedMatch | undefined {
    return this.list().find((replay) => replay.id === id);
  }

  public save(recordedMatch: RecordedMatch): void {
    const replays = this.list();
    const index = replays.findIndex((replay) => replay.id === recordedMatch.id);
    const nextReplays = [...replays];

    if (index < 0) nextReplays.push(recordedMatch);
    else nextReplays[index] = recordedMatch;

    this.persist(nextReplays);
  }

  public delete(id: string): void {
    this.persist(this.list().filter((replay) => replay.id !== id));
  }

  public import(serialized: string): RecordedMatch {
    const replay = deserializeRecordedMatch(serialized);
    const existing = this.list();
    const imported = {
      ...replay,
      id: createUniqueValue(
        replay.id,
        existing.map((item) => item.id),
        ID_SEPARATOR,
      ),
      name: createUniqueValue(
        replay.name,
        existing.map((item) => item.name),
        NAME_SEPARATOR,
      ),
    };

    this.save(imported);
    return imported;
  }

  public export(id: string): string {
    const replay = this.get(id);

    if (!replay)
      throw new Error(
        t("replay-library.replay.does.not.exist.in.the.local.library", { value1: String(id) }),
      );

    return serializeRecordedMatch(replay);
  }

  private persist(replays: readonly RecordedMatch[]): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(replays));
  }
}

function parseStoredReplays(value: string | null): unknown {
  try {
    return JSON.parse(value ?? EMPTY_REPLAY_LIST);
  } catch {
    return [];
  }
}

function deserializeStoredReplay(value: unknown): readonly RecordedMatch[] {
  try {
    return [deserializeRecordedMatch(JSON.stringify(value))];
  } catch {
    return [];
  }
}

export function getBrowserReplayLibrary(): BrowserReplayLibrary {
  return new BrowserReplayLibrary(window.localStorage);
}

function createUniqueValue(
  preferred: string,
  values: readonly string[],
  separator: string,
): string {
  if (!values.includes(preferred)) return preferred;

  let suffix = FIRST_DUPLICATE_SUFFIX;
  let candidate = `${preferred}${separator}${suffix}`;

  while (values.includes(candidate)) {
    suffix += 1;
    candidate = `${preferred}${separator}${suffix}`;
  }

  return candidate;
}
