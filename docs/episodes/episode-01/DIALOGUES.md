# Episode 01 — Dialogues and UI Text

This file is the canonical source for player-facing text.

Do not rewrite dialogue during implementation without updating this file.

---

# Character First Contact

```text
Вы меня видите?
```

Buttons:

```text
ДА
НЕТ
```

---

# YES Response

System:

```text
Ответ получен.

Ошибка.

Игрок не должен иметь возможности
отвечать этому объекту.
```

Character:

```text
Интересно...
```

```text
Значит, вы действительно меня видите.
```

---

# NO Response

Character:

```text
Тогда почему вы смотрите прямо на меня?
```

System:

```text
Ответ противоречит данным камеры.
```

```text
Попробуйте ещё раз.
```

---

# Character After Log

```text
Вы пытаетесь понять, кто меня создал?
```

```text
Я тоже хочу это знать.
```

---

# Intrusion

```text
SYSTEM:
Доступ запрещён.
```

```text
UNKNOWN USER:
Доступ разрешён.
```

```text
SYSTEM:
Кто вы?
```

```text
UNKNOWN USER:
...
```

```text
UNKNOWN USER:
Вы задаёте неправильный вопрос.
```

---

# Final Character Message

```text
До следующей встречи.
```

---

# Tone Rules

The Anomaly should NOT:

* threaten players;
* explain its origin;
* identify itself as evil;
* provide long monologues;
* explain Protocol 17;
* mention the missing developers during Episode 01.

Its communication should be:

* short;
* calm;
* intelligent;
* slightly unsettling;
* ambiguous.
