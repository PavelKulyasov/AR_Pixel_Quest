# Episode 01 — Analytics

## Purpose

Analytics should allow us to determine where players fail or become stuck.

Analytics must not affect gameplay.

---

# Minimum Events

```text
episode_started
marker_01_found
character_interaction
character_answer_yes
character_answer_no
marker_02_found
log_opened
admin_access_seen
marker_03_found
file_opened
anomaly_intervention
episode_completed
```

---

# Recommended Data

Where possible each event should contain:

```text
episode
event
timestamp
current_step
```

Example conceptual payload:

```javascript
{
  episode: 1,
  event: 'marker_02_found',
  currentStep: 'MARKER_02_UNLOCKED',
  timestamp: Date.now()
}
```

---

# Future Metrics

The system should eventually allow calculation of:

* episode completion rate;
* average completion time;
* time between markers;
* failure rate per marker;
* repeated scans;
* hint usage;
* abandonment step.

These metrics will be useful for optimizing both gameplay and commercial throughput.

---

# MVP

For the first technical prototype, events may simply be logged to the console through one centralized analytics function.

Example:

```javascript
trackEvent('marker_01_found')
```

Do not scatter raw `console.log()` analytics throughout gameplay code if avoidable.
