// Shared by the offline recording generator and the game adapter.
export const formatSpeech = text => text.replace(/^SYSTEM:/, 'Система.').replace(/^UNKNOWN USER:/, 'Неизвестный пользователь.')
export const speechParts = text => text.split(/\n+|(?<=[.!?])\s+/).map(part => part.trim()).filter(Boolean)
export const speechKey = (speaker, text) => JSON.stringify([speaker, text.trim().replace(/\s+/g, ' ')])
