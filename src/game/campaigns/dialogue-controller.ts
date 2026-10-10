import type { DialogueLine, MissionDefinition } from "../../core/campaigns/definition";
import { emptyJournal, type MissionSignal, matchSignal } from "../../core/campaigns/signals";
import { t } from "../localization/runtime";
import { localizedDialogueLine } from "./localized-dialogue";
export class MissionDialogueController {
  public journal = emptyJournal();
  private queue: DialogueLine[] = [];
  private visible = false;
  private paused = false;
  private disposed = false;
  private completedLines = 0;
  public get position(): string {
    return t("dialogue-controller.line", {
      value1: String(this.completedLines + 1),
      value2: String(this.completedLines + this.queue.length),
    });
  }
  public constructor(
    public readonly mission: MissionDefinition,
    private readonly continuation: () => void,
    private readonly localeId = "en",
  ) {}
  public get blocked(): boolean {
    return this.queue.length > 0;
  }
  public get current(): DialogueLine | undefined {
    return this.visible ? this.queue[0] : undefined;
  }
  public signal(signal: MissionSignal, boundary: number): void {
    if (this.disposed) return;
    const oldLength = this.journal.occurrences.length;
    this.journal = matchSignal(this.mission, this.journal, signal, boundary);
    this.enqueue(this.journal.occurrences.slice(oldLength).map((o) => o.eventId));
  }
  public enqueue(ids: readonly string[]): void {
    if (this.disposed) return;
    if (!this.queue.length) this.completedLines = 0;
    for (const id of ids) {
      const event = this.mission.events.find((event) => event.id === id);
      if (event)
        this.queue.push(
          ...event.lines.map((line) => localizedDialogueLine(event, line, this.localeId)),
        );
    }
  }
  public present(): void {
    if (!this.disposed) this.visible = this.blocked;
  }
  public pause(paused: boolean): void {
    this.paused = paused;
  }
  public next(): void {
    if (!this.visible || this.paused || this.disposed) return;
    this.queue.shift();
    this.completedLines++;
    if (this.queue.length) return;
    this.visible = false;
    this.continuation();
  }
  public cancel(): void {
    this.queue = [];
    this.visible = false;
  }
  public dispose(): void {
    this.cancel();
    this.disposed = true;
  }
}
