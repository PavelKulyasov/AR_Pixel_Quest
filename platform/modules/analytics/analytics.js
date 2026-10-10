export function createAnalytics(episode, sink = payload => console.info('[AR Quest]', payload)) {
  const seen = new Set()
  return (event, currentStep, once = true) => {
    if (once && seen.has(event)) return
    if (once) seen.add(event)
    // Diagnostics must never interrupt progression.
    try { sink({episode, event, timestamp: Date.now(), currentStep}) } catch (_) { /* optional sink */ }
  }
}