# Pixel Quest AR — Project Documentation

## Project

**Marketing title:** PIXEL QUEST: НЕ ИГРА
**Internal storyline:** Протокол №17

This directory contains the canonical game-design, narrative, and technical documentation for the Pixel Quest AR quest.

The documentation must be treated as the **source of truth** when implementing game mechanics.

---

## Current Development Goal

The current development milestone is:

> Build Episode 01 — «Первый сбой» as a vertical slice of the future AR quest engine.

The goal is NOT to build the entire game.

The goal is to validate the complete gameplay pipeline:

Marker detection → AR object → interaction → game state change → next marker → final event.

---

## Documentation Structure

### `/lore`

Global story rules and world mythology.

These files describe facts that must remain consistent between all episodes.

### `/game-design`

Reusable game systems:

* game state;
* marker states;
* episode architecture;
* AR interaction architecture.

These systems should NOT contain Episode 01-specific story logic unless explicitly stated.

### `/episodes`

Individual episodes.

Each episode contains:

* scenario;
* technical specification;
* dialogues;
* state flow;
* AR objects;
* analytics;
* acceptance criteria.

---

## Development Principle

Do not hard-code the entire game as one linear script.

The architecture should support:

```text
Game Engine
    +
Episode Configuration
    +
Game State
    +
AR Objects
    +
UI
```

Future episodes must be able to reuse the same engine.

---

## Current Episode

Implementation priority:

`/episodes/episode-01/`

Episode:

**Episode 01 — Первый сбой**

Target duration:

**5–8 minutes**

Prototype duration may be:

**3–5 minutes**

---

## Important Rule for Codex

Before changing gameplay logic:

1. Read `GAME_ARCHITECTURE.md`.
2. Read `GAME_STATE.md`.
3. Read the relevant episode documentation.
4. Preserve existing working 8th Wall functionality unless the change explicitly requires replacing it.
5. Do not invent new lore or gameplay rules when documentation already defines them.
6. If implementation conflicts with documentation, report the conflict before changing the intended game design.
