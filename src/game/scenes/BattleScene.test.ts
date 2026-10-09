import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class {},
  },
}));

import { BattleScene } from "./BattleScene";

describe("BattleScene", () => {
  it("blocks HUD orders during movement and pause without overriding ownership locks", () => {
    const scene = new BattleScene();
    const state = scene as unknown as {
      inputLocked: boolean;
      presenter: { busy: boolean };
      pauseMenu: { isOpen: boolean };
      isActiveSideHuman: () => boolean;
      canHumanIssueOrders: () => boolean;
      submitAction: (action: { type: "end-turn" }) => void;
      applyAcceptedAction: ReturnType<typeof vi.fn>;
    };
    state.isActiveSideHuman = () => true;
    state.applyAcceptedAction = vi.fn();
    state.presenter = { busy: true };
    state.pauseMenu = { isOpen: false };
    expect(state.canHumanIssueOrders()).toBe(false);
    state.submitAction({ type: "end-turn" });
    expect(state.applyAcceptedAction).not.toHaveBeenCalled();
    state.presenter.busy = false;
    state.pauseMenu.isOpen = true;
    expect(state.canHumanIssueOrders()).toBe(false);
    state.pauseMenu.isOpen = false;
    state.inputLocked = true;
    expect(state.canHumanIssueOrders()).toBe(false);
    state.inputLocked = false;
    expect(state.canHumanIssueOrders()).toBe(true);
  });
  it("forgets the previous pause menu before a scene instance starts another match", () => {
    const scene = new BattleScene();
    const stalePauseMenu = {};
    const sceneState = scene as unknown as {
      pauseMenu?: typeof stalePauseMenu;
      resetRenderingState: () => void;
    };

    sceneState.pauseMenu = stalePauseMenu;
    sceneState.resetRenderingState();

    expect(sceneState.pauseMenu).toBeUndefined();
  });
});
