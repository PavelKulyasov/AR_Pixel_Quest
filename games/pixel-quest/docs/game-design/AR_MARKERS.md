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

At each valid observation of an unlocked or completed marker, copy its current position, rotation and scale into the object's scene anchor. The physical markers must remain stationary: they are the references used to correct world-tracking drift. When a marker disappears, retain the last valid pose. When it returns, correct the anchor from the newly observed pose without replaying the story.

Losing image tracking must not hide the placed object or reset gameplay progression. Finishing an individual marker interaction also leaves its object visible. Hide all placed objects when the episode completes; remove them when the episode component is disposed.

Objects stay in the AR world, not attached to the camera. They can leave the camera's field of view and become visible again when the player looks back. World tracking is explicitly enabled. It can drift while the marker is out of view; accurate relocalization requires seeing the same stationary marker again. This is not a persistent spatial anchor or a guarantee of drift-free tracking on a long walk.

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
