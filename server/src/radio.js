export const RADIO_CHANNELS = new Set(['GENERAL', 'ADMIN', 'DUTY', 'EMERGENCY', 'FACILITIES'])
export const MAX_AUDIO_BYTES = 2_000_000

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const ALLOWED_AUDIO_TYPES = ['audio/webm', 'audio/mp4', 'audio/ogg']

export function parseAllowedOrigins(value) {
  if (!value?.trim()) return DEFAULT_ORIGINS
  return [...new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean))]
}

export function normalizeDisplayName(value) {
  if (typeof value !== 'string') return 'Staff'
  const normalized = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0)
      // Allow printable ASCII and higher Unicode code points; strip DEL and C1 controls (U+007F–U+009F).
      return code >= 32 && (code < 127 || code > 159)
    })
    .join('')
    .trim()
    .slice(0, 40)
  return normalized || 'Staff'
}

export function normalizeChannel(value) {
  if (typeof value !== 'string') return null
  const channel = value.trim().toUpperCase()
  return RADIO_CHANNELS.has(channel) ? channel : null
}

export function normalizeText(value) {
  if (typeof value !== 'string') return null
  const text = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0)
      // Allow tab, LF, CR, printable ASCII, and higher Unicode; strip DEL and C1 controls (U+007F–U+009F).
      return code === 9 || code === 10 || code === 13 || (code >= 32 && (code < 127 || code > 159))
    })
    .join('')
    .trim()
  if (!text || text.length > 280) return null
  return text
}

export function isAllowedAudioType(value) {
  return typeof value === 'string' && ALLOWED_AUDIO_TYPES.some((type) => value.startsWith(type))
}

export function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  return null
}
