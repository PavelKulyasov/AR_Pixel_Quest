// Delays count active search time, after the introductory dialogue.
export const searchConfig = {
  target_id: 'null_head', hold_ms: 500, search_radius: .35,
  hints: [
    {after_ms: 15000, content_id: 'search_listen'},
    {after_ms: 25000, content_id: 'search_direction'},
    {after_ms: 40000, content_id: 'search_highlight'},
  ],
  stages: {search_listen: 1, search_direction: 2, search_highlight: 3},
  directions: {
    left: '← Поверни камеру влево', right: 'Поверни камеру вправо →',
    up: '↑ Подними камеру', down: '↓ Опусти камеру',
    center: 'Удерживай голову в рамке полсекунды',
    unavailable: 'Покажи камере карточку огня, чтобы восстановить ориентир',
  },
}
