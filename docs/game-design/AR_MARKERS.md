# AR Marker System

## Episode 01 Markers

Episode 01 uses exactly three gameplay markers.

| ID        | Object            | Initial state |
| --------- | ----------------- | ------------- |
| MARKER_01 | Unknown Character | AVAILABLE     |
| MARKER_02 | System Terminal   | LOCKED        |
| MARKER_03 | Character File    | LOCKED        |

---

# Marker Detection

When a marker is detected:

```text
marker detected
↓
identify marker
↓
check game state
↓
check marker state
↓
spawn allowed content
```

---

# Marker Lost

Losing tracking must NOT reset gameplay progression.

If appropriate, UI may display:

> Объект потерян. Наведите камеру на маркер.

When tracking returns, the relevant object may reappear according to its current state.

---

# Repeated Detection

Completed markers must not repeat story progression.

Possible behavior:

```text
Object already investigated.
```

Or silently restore the previously completed visual state.

---

# Physical Design

Markers should eventually look like part of the Pixel Quest environment rather than obvious developer/debug markers.

For prototype testing, simple temporary image targets are acceptable.

The technical marker identity must never be exposed to players as:

```text
MARKER_01
MARKER_02
MARKER_03
```

These identifiers are internal only.
