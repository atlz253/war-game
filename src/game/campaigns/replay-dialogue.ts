import { MissionDialogueController } from "./dialogue-controller";
import type { CampaignNarrative } from "./replay-narrative";
export class ReplayDialogue {
  public readonly controller: MissionDialogueController;
  private boundary = -1;
  public constructor(private readonly narrative: CampaignNarrative) {
    this.controller = new MissionDialogueController(narrative.mission, () => {});
  }
  public forward(boundary: number): void {
    if (this.boundary === boundary) return;
    this.boundary = boundary;
    this.controller.enqueue(
      this.narrative.occurrences
        .filter((occurrence) => occurrence.afterActionCount === boundary)
        .map((occurrence) => occurrence.eventId),
    );
    this.controller.present();
  }
  public seek(boundary: number): void {
    this.controller.cancel();
    this.boundary = boundary;
  }
  public dispose(): void {
    this.controller.dispose();
  }
}
