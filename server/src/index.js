import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { Server } from 'socket.io'
import {
  isAllowedAudioType,
  MAX_AUDIO_BYTES,
  normalizeChannel,
  normalizeDisplayName,
  normalizeText,
  parseAllowedOrigins,
  toBuffer,
} from './radio.js'

const port = Number.parseInt(process.env.PORT || '4000', 10)
const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS)

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535')
}

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(express.json({ limit: '32kb' }))
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
)

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'headmaster-radio' })
})

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origin is not allowed'))
    },
    methods: ['GET', 'POST'],
    credentials: false,
  },
  maxHttpBufferSize: MAX_AUDIO_BYTES + 100_000,
  transports: ['websocket', 'polling'],
})

function roomName(channel) {
  return `radio:${channel}`
}

function emitPresence(channel) {
  const room = roomName(channel)
  const count = io.sockets.adapter.rooms.get(room)?.size ?? 0
  io.to(room).emit('radio:presence', { channel, count })
}

function acknowledge(callback, payload) {
  if (typeof callback === 'function') callback(payload)
}

io.on('connection', (socket) => {
  socket.data.channel = null
  socket.data.displayName = 'Staff'
  socket.data.lastVoiceAt = 0

  socket.on('radio:join', (payload = {}, callback) => {
    const channel = normalizeChannel(payload.channel)
    if (!channel) {
      socket.emit('radio:error', { message: 'Unknown radio channel.' })
      acknowledge(callback, { ok: false, message: 'Unknown radio channel.' })
      return
    }

    const previousChannel = socket.data.channel
    if (previousChannel) socket.leave(roomName(previousChannel))

    socket.data.channel = channel
    socket.data.displayName = normalizeDisplayName(payload.displayName)
    socket.join(roomName(channel))

    if (previousChannel && previousChannel !== channel) emitPresence(previousChannel)
    emitPresence(channel)
    acknowledge(callback, { ok: true, channel })
  })

  socket.on('radio:text', (payload = {}, callback) => {
    const channel = normalizeChannel(payload.channel)
    const text = normalizeText(payload.text)
    if (!channel || channel !== socket.data.channel || !text) {
      acknowledge(callback, { ok: false, message: 'Invalid channel message.' })
      return
    }

    const event = {
      id: randomUUID(),
      sender: socket.data.displayName,
      text,
      sentAt: new Date().toISOString(),
    }
    socket.to(roomName(channel)).emit('radio:text', event)
    acknowledge(callback, { ok: true, id: event.id, sentAt: event.sentAt })
  })

  socket.on('radio:voice', (payload = {}, callback) => {
    const channel = normalizeChannel(payload.channel)
    const audio = toBuffer(payload.data)
    const now = Date.now()

    if (!channel || channel !== socket.data.channel) {
      acknowledge(callback, { ok: false, message: 'Invalid radio channel.' })
      return
    }
    if (!isAllowedAudioType(payload.mimeType) || !audio || audio.length === 0) {
      acknowledge(callback, { ok: false, message: 'Unsupported voice payload.' })
      return
    }
    if (audio.length > MAX_AUDIO_BYTES) {
      acknowledge(callback, { ok: false, message: 'Voice burst exceeds the 2 MB limit.' })
      return
    }
    if (now - socket.data.lastVoiceAt < 500) {
      acknowledge(callback, { ok: false, message: 'Release the radio before transmitting again.' })
      return
    }

    socket.data.lastVoiceAt = now
    socket.to(roomName(channel)).emit('radio:voice', {
      id: randomUUID(),
      sender: socket.data.displayName,
      mimeType: payload.mimeType,
      data: audio,
      sentAt: new Date(now).toISOString(),
    })
    acknowledge(callback, { ok: true })
  })

  socket.on('disconnect', () => {
    if (socket.data.channel) emitPresence(socket.data.channel)
  })
})

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Headmaster radio listening on port ${port}`)
  console.log(`Allowed browser origins: ${allowedOrigins.join(', ')}`)
})

function shutdown(signal) {
  console.log(`${signal} received; closing radio server`)
  io.close(() => {
    httpServer.close((error) => {
      if (error) {
        console.error('Server shutdown failed', error)
        process.exitCode = 1
      }
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
