# Episode 01 — Technical Specification

## Platform

Current Pixel Quest WebAR project using 8th Wall.

Implementation must preserve existing working project functionality unless replacement is explicitly required.

---

# Core Technical Goal

Validate:

```text
marker
→ AR object
→ player interaction
→ state change
→ next marker
→ final state
```

---

# Required Systems

Episode 01 requires:

1. Game state controller.
2. Marker detection.
3. Marker availability validation.
4. AR object spawning.
5. Player interaction.
6. UI message system.
7. Episode progression.
8. Completion state.
9. Basic analytics events.

---

# Recommended Module Responsibilities

Conceptually:

```text
app.js
│
├── game-state
├── episode-01
├── marker-manager
├── ar-object-manager
├── ui
└── analytics
```

Exact filenames may be adapted to the existing repository structure.

Do NOT restructure working project files unnecessarily.

---

# Game State

Centralized game state is required.

Example:

```javascript
const gameState = {
  episode: 1,
  step: 'START',

  marker01Found: false,
  characterInteracted: false,

  marker02Found: false,
  logRead: false,

  marker03Found: false,
  fileRead: false,

  completed: false
}
```

---

# Marker Event Example

Conceptual event:

```javascript
onMarkerFound(markerId)
```

The handler must:

1. identify the marker;
2. check current game state;
3. check whether marker is AVAILABLE;
4. spawn content only when allowed;
5. avoid duplicate progression.

---

# Interaction Example

Conceptual:

```javascript
onCharacterAnswer('YES')
```

Expected result:

```text
characterInteracted = true
MARKER_01 → COMPLETED
MARKER_02 → AVAILABLE
step → MARKER_02_UNLOCKED
```

---

# Locked Marker Rule

Do NOT implement:

```javascript
if (marker2Found) {
  showTerminal()
}
```

Implement state validation conceptually equivalent to:

```javascript
if (
  markerId === 'MARKER_02' &&
  markerState.MARKER_02 === 'AVAILABLE'
) {
  showTerminal()
}
```

---

# Tracking Loss

When tracking is lost:

* hide/pause AR representation if required;
* keep gameplay progress;
* do NOT reset the episode.

When tracking returns:

* restore object according to current state.

---

# Duplicate Events

Repeated image-target events must not:

* unlock content twice;
* duplicate UI;
* duplicate analytics completion events;
* trigger final sequence multiple times.

---

# UI Layers

UI should conceptually separate:

## SYSTEM

Examples:

```text
Ошибка.
Доступ запрещён.
Сигнал обнаружен.
```

## CHARACTER

Character dialogue.

## TASK

Current player objective.

## STATUS

Optional debug/player progress information.

---

# Timing

Recommended configurable defaults:

```javascript
const timings = {
  systemMessage: 1000,
  anomalyAppear: 500,
  anomalyDisappear: 800,
  sceneTransition: 1000
}
```

Avoid scattering hard-coded timeout values throughout the project.

---

# Persistence

Persistence is optional for MVP.

Architecture should permit later use of:

```javascript
localStorage
```

Suggested key:

```text
pixelquest_episode_01_state
```

---

# Performance

Episode should not continuously instantiate duplicate AR entities.

Reuse or clean up entities where appropriate.

Avoid unnecessary heavy assets during prototype stage.

---

# Mobile Requirement

The interaction must work with touch input.

Buttons must be large enough for mobile use.

Important dialogue must remain readable without requiring precise AR positioning.

---

# MVP Non-Requirements

Do NOT add unless required by existing architecture:

* backend;
* login;
* multiplayer synchronization;
* AI NPC;
* speech recognition;
* networking;
* complex physics;
* cloud save;
* branching endings;
* Protocol 17 gameplay;
* Back Logs gameplay.
