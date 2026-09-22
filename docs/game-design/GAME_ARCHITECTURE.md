# Game Architecture

## Objective

Build a reusable AR quest architecture rather than implementing each episode as a separate application.

Target conceptual architecture:

```text
AR ENGINE
    +
GAME STATE
    +
EPISODE CONFIGURATION
    +
MARKER MANAGER
    +
AR OBJECT MANAGER
    +
UI
    +
ANALYTICS
```

---

# Episode Structure

Future game structure:

```text
GAME

├── EPISODE 01
│   ├── MARKER 01
│   ├── MARKER 02
│   └── MARKER 03
│
├── EPISODE 02
│   ├── MARKER 04
│   ├── MARKER 05
│   └── MARKER 06
│
└── ...
```

The AR engine should remain reusable.

---

# Event Model

Core gameplay flow:

```text
MARKER_FOUND
      ↓
VALIDATE_GAME_STATE
      ↓
OBJECT_SPAWN
      ↓
OBJECT_INTERACTION
      ↓
GAME_STATE_CHANGE
      ↓
NEXT_OBJECT_UNLOCK
```

AR objects must NOT independently control the complete game progression.

They emit events.

The game controller decides what those events mean.

---

# Recommended Responsibility Separation

## Game State

Responsible for:

* current episode;
* current step;
* completed interactions;
* marker availability;
* episode completion.

## Marker Manager

Responsible for:

* marker detection;
* marker lost events;
* marker identity;
* preventing duplicate detection events.

It must NOT decide the story.

## AR Object Manager

Responsible for:

* spawning AR objects;
* hiding objects;
* object animation;
* cleanup.

It must NOT independently unlock story progression.

## Episode Controller

Responsible for:

* interpreting events;
* validating progression;
* changing game state;
* unlocking markers;
* triggering dialogue/UI.

## UI

Responsible for:

* system messages;
* tasks;
* dialogue;
* buttons;
* status.

## Analytics

Responsible for recording gameplay events without affecting gameplay.

---

# MVP Philosophy

Episode 01 is a vertical slice.

Do NOT over-engineer:

* networking;
* accounts;
* multiplayer synchronization;
* AI dialogue;
* complex physics;
* server persistence;
* sophisticated 3D animation.

Validate the gameplay architecture first.
