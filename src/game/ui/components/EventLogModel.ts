export const EVENT_LOG_VISIBLE_ENTRY_COUNT = 26;

export class EventLogModel {
  private readonly visibleEntryCount: number;
  private readonly allEntries: string[] = [];
  private startIndex = 0;

  public constructor(visibleEntryCount: number) {
    this.visibleEntryCount = visibleEntryCount;
  }

  public get entries(): readonly string[] {
    return this.allEntries;
  }

  public get visibleEntries(): readonly string[] {
    return this.allEntries.slice(this.startIndex, this.startIndex + this.visibleEntryCount);
  }

  public get scrollProgress(): number {
    const maximumStartIndex = this.getMaximumStartIndex();
    return maximumStartIndex === 0 ? 1 : this.startIndex / maximumStartIndex;
  }

  public get hasOverflow(): boolean {
    return this.getMaximumStartIndex() > 0;
  }

  public push(entry: string): void {
    const wasAtLatest = this.startIndex === this.getMaximumStartIndex();
    this.allEntries.push(entry);
    if (wasAtLatest) this.scrollToLatest();
  }

  public setEntries(entries: readonly string[]): void {
    this.allEntries.length = 0;
    this.allEntries.push(...entries);
    this.scrollToLatest();
  }

  public scrollBy(entryCount: number): void {
    this.startIndex = Math.min(
      Math.max(this.startIndex + entryCount, 0),
      this.getMaximumStartIndex(),
    );
  }

  public scrollToLatest(): void {
    this.startIndex = this.getMaximumStartIndex();
  }

  private getMaximumStartIndex(): number {
    return Math.max(this.allEntries.length - this.visibleEntryCount, 0);
  }
}
