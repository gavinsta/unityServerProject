# Combat Overview

## Combat 'Field'

The field is simply columns of `CombatActor`s facing off against eachother.

`CombatColumns` are labelled from bottom of the screen to the top, while `CombatRows` are labelled from -4 to +4.

|  |Rows → |  |  |  |  |  |  |  |  |  |
|-|--|--|--|--|--|--|--|--|--|--|
|**Columns** ↓ |-4,3|-3,3 |-2,3 |-1,3|0,3 <br>(no man's land)|+1,3|+2,3|+3,3|+4,3
| |-4,2|-3,2|-2,2|-1,2|0,2|+1,2|+2,3|+3,3|+4,4
| |-4,1|-3,1|-2,1|-1,1|0,1|+1,1|2,1|3,1|4,1
| |-4,0|-3,0|-2,0|-1,0|0,0|+1,0|2,0|3,0|4,0

&#8595

## Turn Management

Turns happen simultaneously.

## Key Terms:
- ### `Ticket`
  A `Ticket` represents a turn's worth of actions from a character. 

  It is a bundle of `Order`s.
  
  This could be as simple as casting a spell or as complex as moving, 'locking on' to three targets, firing an arrow at the one with the lowest health, and then moving back to the original position.

  `CombatActor`s will all submit a single Ticket to the `CombatManager`.

- ### `Order`
  A single action. `Order`s are organized by [Priority](./mechanics/CombatStats.md#Priority), meaning they can be executed with several actions happening in between.

  [Speed](./mechanics/CombatStats.md#Priority)