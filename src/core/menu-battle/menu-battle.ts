import type { MapUnitPlacement } from "../maps/map-definition";
import { createGameStateFromMap, createMapDefinition, createUnits } from "../maps/map-definition";
import type { GameState, SideId, TerrainPlacement, UnitType } from "../model/game-state";

export interface MenuBattleConfig {
  readonly visibleWidth: number;
  readonly height: number;
  readonly stripWidth: number;
  readonly minWaveSize: number;
  readonly maxWaveSize: number;
  readonly terrainDensity: number;
}
export interface MenuBattlePolicy {
  readonly randomState: number;
  readonly config: MenuBattleConfig;
  readonly waves: Readonly<Record<SideId, number>>;
}
export const MENU_BATTLE_CONFIG: MenuBattleConfig = {
  visibleWidth: 14,
  height: 8,
  stripWidth: 2,
  minWaveSize: 2,
  maxWaveSize: 3,
  terrainDensity: 0.12,
};
const RANDOM_MULTIPLIER = 1664525;
const RANDOM_INCREMENT = 1013904223;
const RANDOM_RANGE = 4294967296;
const FRONTLINE_TYPES: readonly UnitType[] = ["infantry", "tank"];
const WAVE_TYPES: readonly UnitType[] = ["infantry", "tank", "artillery"];
const CORRIDOR_MARGIN = 2;

function random(seed: number): number {
  return (Math.imul(seed, RANDOM_MULTIPLIER) + RANDOM_INCREMENT) >>> 0;
}

export function createMenuBattle(seed: number, config = MENU_BATTLE_CONFIG): GameState {
  validateConfig(config);
  const width = config.visibleWidth + config.stripWidth * 2;
  const terrain: TerrainPlacement[] = [];
  let randomState = seed >>> 0;
  for (let y = 0; y < config.height; y++) {
    for (let x = config.stripWidth; x < width - config.stripWidth; x++) {
      randomState = random(randomState);
      const inCorridor = y >= CORRIDOR_MARGIN && y < config.height - CORRIDOR_MARGIN;
      if (!inCorridor && randomState / RANDOM_RANGE < config.terrainDensity) {
        terrain.push({ type: randomState % 2 === 0 ? "forest" : "mountain", position: { x, y } });
      }
    }
  }
  let state: GameState = {
    ...createGameStateFromMap({
      ...createMapDefinition("menu-demonstration", "Menu battle", width, config.height),
      terrain,
    }),
    menuBattle: { randomState, config, waves: { blue: 0, red: 0 } },
  };
  state = { ...state, board: { ...state.board, menuDeploymentWidth: config.stripWidth } };
  return reinforceMenuSide(reinforceMenuSide(state, "blue"), "red");
}

function validateConfig(config: MenuBattleConfig): void {
  const sizes = [
    config.visibleWidth,
    config.height,
    config.stripWidth,
    config.minWaveSize,
    config.maxWaveSize,
  ];
  if (
    sizes.some((size) => !Number.isSafeInteger(size) || size <= 0) ||
    config.height <= CORRIDOR_MARGIN * 2 ||
    config.minWaveSize > config.maxWaveSize ||
    config.maxWaveSize > config.stripWidth * config.height ||
    !Number.isFinite(config.terrainDensity) ||
    config.terrainDensity < 0 ||
    config.terrainDensity > 1
  ) {
    throw new Error("Invalid menu battle generation configuration.");
  }
}

export function reinforceMenuSide(state: GameState, side: SideId): GameState {
  const policy = state.menuBattle;
  if (!policy) return state;
  const { config } = policy;
  let randomState = random(policy.randomState);
  const count = config.minWaveSize + (randomState % (config.maxWaveSize - config.minWaveSize + 1));
  const available = [];
  const startX = side === "blue" ? 0 : state.board.width - config.stripWidth;
  for (let y = 0; y < config.height; y++) {
    for (let x = startX; x < startX + config.stripWidth; x++) {
      if (!Object.values(state.units).some((u) => u.position.x === x && u.position.y === y))
        available.push({ x, y });
    }
  }
  if (available.length < count) throw new Error("Reserved menu deployment strip exhausted.");
  const placements: MapUnitPlacement[] = [];
  for (let index = 0; index < count; index++) {
    randomState = random(randomState);
    const position = available.splice(randomState % available.length, 1)[0];
    randomState = random(randomState);
    const types = index === 0 ? FRONTLINE_TYPES : WAVE_TYPES;
    const type = types[randomState % types.length];
    if (!position || !type) throw new Error("Invalid menu wave placement.");
    placements.push({ side, type, position });
  }
  const wave = policy.waves[side] + 1;
  const units = Object.fromEntries(
    Object.values(createUnits(placements)).map((unit) => {
      const id = `menu-${side}-wave-${wave}-${unit.id}`;
      return [id, { ...unit, id }];
    }),
  );
  return {
    ...state,
    units: { ...state.units, ...units },
    menuBattle: {
      ...policy,
      randomState,
      waves: { ...policy.waves, [side]: wave },
    },
  };
}
