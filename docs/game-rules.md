# Game Rules: v1 Scenario

## Objective and board

The v1 scenario is a two-sided skirmish on a 12×8 square grid. Blue is human-controlled; Red is AI-controlled. A side wins immediately when every enemy unit is destroyed. Control points are visible capturable objects and appear in the HUD, but do not yet contribute to victory.

## Starting armies

Each side begins with the following units. Values are scenario configuration data, not scene constants.

| Unit | Count | Health | Movement points | Attack range | Base damage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Infantry | 3 | 10 | 4 | 1 | 3 |
| Tank | 1 | 16 | 5 | 1 | 5 |

## Turn and unit actions

Sides alternate turns. During its turn, a side may issue legal orders to its units in any order and then submit `EndTurnAction`.

A unit may spend movement points to move through legal cells, then take one main action: attack, capture, or wait. A unit that has taken its main action cannot move or take another main action until its side's next turn. Movement uses all eight neighbouring cells; every step costs one movement point. A diagonal step cannot pass between two occupied or impassable orthogonal cells. Attack range uses adjacent cells in all eight directions. Movement, range, occupancy, ownership, and action availability are validated by `validateAction`.

Terrain and control-point modifiers must be expressed as scenario data when introduced. The initial balance does not hardwire terrain combat or movement effects.

## Events and visibility

Accepted actions emit ordered domain events, such as movement, attack, damage, capture, destruction, turn end, and victory. The Canvas event log displays human-readable versions of the most recent events. The renderer may animate an event, but an animation never changes rules state.
