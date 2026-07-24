# Game Rules: v1 Scenario

## Objective and board

The v1 scenario is a two-sided skirmish on a 12×8 square grid. Blue is human-controlled; Red is AI-controlled. A side wins immediately when every enemy unit is destroyed. Control points are visible capturable objects and appear in the HUD, but do not yet contribute to victory.

## Starting armies

Each side begins with the following units. Values are scenario configuration data, not scene constants.

| Unit | Count | Health | Movement points | Attack range | Base damage | Ammo |
| --- | ---: | ---: | ---: | ---: | ---: |
| Infantry | 3 | 10 | 4 | 1 | 3 | 6 |
| Tank | 1 | 16 | 5 | 1 | 5 | 5 |
| Artillery | 1 | 8 | 3 | 2–4 | 4 | 4 |

## Turn and unit actions

Sides alternate turns. During its turn, a side may issue legal orders to its units in any order and then submit `EndTurnAction`.

A unit may spend movement points to move through legal cells, then take one main action: attack, capture, or wait. A unit that has taken its main action cannot move or take another main action until its side's next turn. Movement uses all eight neighbouring cells; every step costs one movement point. A diagonal step cannot pass between two occupied or impassable orthogonal cells. Infantry and tanks attack only adjacent cells in the same row or column. Artillery attacks any cell in its Chebyshev range of 2–4, including diagonals, and cannot attack after moving during the same turn. Intermediate mountain cells block an artillery shot, but a target may occupy a mountain cell. Every attack and counterattack consumes one ammo; a unit with no ammo cannot fire or counterattack. Movement, range, occupancy, ownership, line of fire, ammunition, and action availability are validated by `validateAction`.

## Terrain and defence

Grass is the implicit base terrain. Mountains are sparse map placements: infantry may enter and move through them at the normal movement cost, while tanks and artillery cannot enter or path through them. For a tank or artillery unit, a mountain is also impassable when applying the diagonal corner rule.

The built-in `skirmish-12x8` map contains two central mountains at `(4,2)` and `(7,5)`, two neutral central control points at `(5,3)` and `(6,4)`, and rear supply points owned by Blue at `(0,4)` and Red at `(11,3)`.

Every mountain reduces damage received by the occupying unit by 1. Every control point reduces damage received by the occupying unit by 1, independent of point ownership. These bonuses use the shared deterministic combat calculation and cannot reduce an attack below 1 damage. Mountains and control points cannot occupy the same cell in a valid map.

At the start of a side's turn, each damaged unit standing on a control point owned by that side restores 2 HP, up to its maximum health. Units on those points also fully restore their ammo. These automatic effects do not spend movement points or a main action.

## Events and visibility

Accepted actions emit ordered domain events, such as movement, attack, damage, healing, capture, destruction, turn end, and victory. The Canvas event log displays human-readable versions of the most recent events. The renderer may animate an event, but an animation never changes rules state.
