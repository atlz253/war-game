import type Phaser from "phaser";
import type { MissionDefinition } from "../../core/campaigns/definition";
import { initialSignals } from "../../core/campaigns/signals";
import type { GameState } from "../../core/model/game-state";
import { CampaignModal } from "../ui/components/CampaignModal";
import { MissionDialogueController } from "./dialogue-controller";
import type { CampaignRun } from "./playthrough";
export function narrativeSnapshot(narrative?: MissionDialogueController, run?: CampaignRun) {
  return narrative && run
    ? {
        narrative: {
          campaignId: run.campaign.id,
          campaignName: run.campaign.name,
          localeId: run.localeId ?? "en",
          mission: narrative.mission,
          occurrences: narrative.journal.occurrences,
        },
      }
    : {};
}
export function createBattleNarrative(
  scene: Phaser.Scene,
  mission: MissionDefinition,
  state: GameState,
  continuation: () => void,
  localeId = "en",
) {
  const narrative = new MissionDialogueController(mission, continuation, localeId);
  const modal = new CampaignModal(scene, narrative);
  scene.cameras.main.ignore(modal.container);
  for (const signal of initialSignals(state)) narrative.signal(signal, 0);
  return { narrative, modal };
}
