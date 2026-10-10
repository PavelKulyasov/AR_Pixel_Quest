# Game State Specification

## Principle

Gameplay progression must be controlled by centralized state.

Do NOT use disconnected boolean conditions distributed throughout AR components.

---

# Episode 01 Example State

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

This structure may be improved during implementation as long as the behavioral requirements remain unchanged.

---

# Episode 01 States

```text
START
↓
SEARCH_CHARACTER
↓
MARKER_01_DETECTED
↓
CHARACTER_ACTIVE
↓
CHARACTER_CONFIRMED
↓
MARKER_02_UNLOCKED
↓
LOG_ACTIVE
↓
LOG_CONFIRMED
↓
MARKER_03_UNLOCKED
↓
FILE_ACTIVE
↓
FILE_CONFIRMED
↓
EPISODE_COMPLETE
```

---

# Marker States

Every gameplay marker should conceptually support:

```text
LOCKED
AVAILABLE
FOUND
COMPLETED
```

Example:

```text
MARKER_01 = AVAILABLE
MARKER_02 = LOCKED
MARKER_03 = LOCKED
```

After Marker 01 interaction:

```text
MARKER_01 = COMPLETED
MARKER_02 = AVAILABLE
MARKER_03 = LOCKED
```

---

# Critical Rule

Marker detection does NOT automatically mean that its gameplay content is available.

Example:

If the camera detects Marker 03 while Marker 03 is LOCKED:

```text
Marker detected
↓
Game state validation
↓
Marker is LOCKED
↓
Do NOT spawn story object
↓
Do NOT advance state
```

Optional UI:

> Объект обнаружен. Доступ запрещён. Завершите текущую последовательность.

---

# Persistence

For the first prototype, restarting the application may reset progress.

However, architecture should allow later persistence using:

```text
localStorage
```

Suggested storage key:

```text
pixelquest_episode_01_state
```

Persistence must not be required to complete the initial vertical slice.
