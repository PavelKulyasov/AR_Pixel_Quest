// Capture clicks before action handlers: selecting a side tile never activates it.
export function createButtonCarousel(rail) {
  let selected = null
  let frame = null
  let start = null
  let dragged = false
  let disposed = false
  const buttons = () => [...rail.querySelectorAll('button')].filter(button => button.getClientRects().length && !button.hidden)
  const distance = button => {
    const r = rail.getBoundingClientRect(), b = button.getBoundingClientRect()
    return b.left + b.width / 2 - r.left - r.width / 2
  }
  function update() {
    frame = null
    const items = buttons()
    selected = items.reduce((best, item) => !best || Math.abs(distance(item)) < Math.abs(distance(best)) ? item : best, null)
    for (const item of rail.querySelectorAll('button')) {
      const centered = item === selected && Math.abs(distance(item)) <= 3
      item.dataset.centered = String(centered)
      item.setAttribute('aria-description', centered ? 'Нажмите для действия' : 'Нажмите, чтобы переместить в центр')
    }
  }
  function center(button, smooth = true) {
    rail.scrollTo({left: rail.scrollLeft + distance(button), behavior: smooth ? 'smooth' : 'instant'})
    update()
  }
  function refresh(preferred = null) {
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      if (disposed) return
      const items = buttons()
      const target = items.includes(preferred) ? preferred : items.includes(selected) ? selected : items[0]
      if (target) center(target, false)
      else update()
    })
  }
  function click(event) {
    const button = event.target.closest('button')
    if (!button || !rail.contains(button)) return
    if (dragged) { dragged = false; event.preventDefault(); event.stopImmediatePropagation(); return }
    if (Math.abs(distance(button)) > 3) {
      event.preventDefault(); event.stopImmediatePropagation(); center(button)
    }
  }
  function down(event) { start = {x: event.clientX, y: event.clientY}; dragged = false }
  function move(event) {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) dragged = true
  }
  function up() { start = null }
  function key(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const items = buttons(); if (!items.length) return
    const current = items.indexOf(event.target.closest('button'))
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1)))
    event.preventDefault(); items[index].focus({preventScroll: true}); center(items[index])
  }
  const resize = () => refresh()
  const listeners = {click, pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, keydown: key, scroll: update}
  for (const [type, fn] of Object.entries(listeners)) rail.addEventListener(type, fn, true)
  const observer = new ResizeObserver(resize)
  observer.observe(rail)
  return {refresh, dispose() {
    disposed = true; observer.disconnect()
    if (frame !== null) cancelAnimationFrame(frame)
    for (const [type, fn] of Object.entries(listeners)) rail.removeEventListener(type, fn, true)
  }}
}
