# Episode 01 — AR Objects

## Object 01 — Unknown Character

Internal ID:

```text
anomaly_character
```

Marker:

```text
MARKER_01
```

Minimum visual requirement:

* static 3D character or simple placeholder;
* visible AR placement;
* simple appearance;
* simple disappearance.

Possible states:

```text
HIDDEN
APPEARING
IDLE
TALKING
DISAPPEARING
```

Complex animation is NOT required for MVP.

---

# Object 02 — System Terminal

Internal ID:

```text
system_terminal
```

Marker:

```text
MARKER_02
```

Purpose:

Display system log and reveal administrator access.

The terminal may be:

* simple AR plane;
* 3D frame;
* HTML overlay anchored to AR interaction.

A complex 3D terminal is NOT required.

---

# Object 03 — Character File

Internal ID:

```text
character_file
```

Marker:

```text
MARKER_03
```

Purpose:

Reveal corrupted character metadata and trigger system intrusion.

The file may use HTML/UI for readable text.

---

# Recommended MVP Division

Use AR for:

* character presence;
* terminal appearance;
* file appearance;
* visual anomalies/glitches.

Use HTML/UI for:

* readable text;
* dialogue;
* buttons;
* tasks;
* system warnings;
* status.

This minimizes development cost while validating the gameplay.
