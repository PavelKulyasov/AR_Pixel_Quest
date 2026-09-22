# Episode 01 — State Flow

## Main State Machine

```text
START
  ↓
SEARCH_CHARACTER
  ↓
MARKER_01_DETECTED
  ↓
CHARACTER_ACTIVE
  ↓
WAITING_CHARACTER_ANSWER
  ├── NO ──→ WAITING_CHARACTER_ANSWER
  │
  └── YES
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
SYSTEM_INTRUSION
       ↓
EPISODE_COMPLETE
```

---

# Marker State Progression

## Start

```text
MARKER_01 = AVAILABLE
MARKER_02 = LOCKED
MARKER_03 = LOCKED
```

## After Character Interaction

```text
MARKER_01 = COMPLETED
MARKER_02 = AVAILABLE
MARKER_03 = LOCKED
```

## After System Log

```text
MARKER_01 = COMPLETED
MARKER_02 = COMPLETED
MARKER_03 = AVAILABLE
```

## Final

```text
MARKER_01 = COMPLETED
MARKER_02 = COMPLETED
MARKER_03 = COMPLETED
```

---

# Invalid Progression

If player detects MARKER_02 before it becomes AVAILABLE:

```text
Do not spawn terminal.
Do not modify progression.
```

If player detects MARKER_03 before it becomes AVAILABLE:

```text
Do not spawn character file.
Do not modify progression.
```

Optional UI:

```text
Объект обнаружен.

Доступ запрещён.

Завершите текущую последовательность.
```

---

# Final State

Required final state:

```javascript
gameState.completed = true
gameState.step = 'EPISODE_COMPLETE'
```

This state must be reached exactly once per run.
