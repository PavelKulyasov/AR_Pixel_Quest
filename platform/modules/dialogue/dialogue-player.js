export function createDialoguePlayer({ui, dialogues, actions = []}) {
  return {
    show(id) {
      if (!dialogues[id]) throw new Error('Unknown dialogue: ' + id)
      ui.render({...dialogues[id], showText: true, actions})
    },
  }
}
