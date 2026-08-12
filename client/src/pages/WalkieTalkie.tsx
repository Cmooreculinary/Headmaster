import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Headphones, Mic, Radio, Send, Signal, Volume2 } from 'lucide-react'
import { io, type Socket } from 'socket.io-client'
import { usePersistentState } from '../hooks/usePersistentState'
import { cn, formatTimestamp, makeId } from '../lib/utils'
import { RADIO_CHANNELS, type RadioChannel, type RadioMessage } from '../types'

type ConnectionState = 'connecting' | 'online' | 'offline'

interface VoicePayload {
  id: string
  sender: string
  mimeType: string
  data: ArrayBuffer | Uint8Array
  sentAt: string
}

const serverUrl =
  import.meta.env.VITE_RADIO_SERVER_URL ??
  (import.meta.env.DEV ? 'http://localhost:4000' : window.location.origin)

export function WalkieTalkie() {
  const [callSign, setCallSign] = usePersistentState('headmaster:call-sign', '')
  const [channel, setChannel] = usePersistentState<RadioChannel>('headmaster:channel', 'GENERAL')
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [onlineCount, setOnlineCount] = useState(0)
  const [messages, setMessages] = useState<RadioMessage[]>([])
  const [text, setText] = useState('')
  const [isTalking, setIsTalking] = useState(false)
  const [error, setError] = useState('')
  const [speakerEnabled, setSpeakerEnabled] = useState(true)

  const socketRef = useRef<Socket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const maxTimerRef = useRef<number | null>(null)
  const audioUrlsRef = useRef<string[]>([])
  const speakerEnabledRef = useRef(speakerEnabled)
  const callSignRef = useRef(callSign)
  const channelRef = useRef(channel)

  useEffect(() => {
    speakerEnabledRef.current = speakerEnabled
  }, [speakerEnabled])

  useEffect(() => {
    callSignRef.current = callSign
    channelRef.current = channel
  }, [callSign, channel])

  useEffect(() => {
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 8_000,
      reconnectionDelayMax: 5_000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnection('online')
      setError('')
      socket.emit('radio:join', {
        channel: channelRef.current,
        displayName: callSignRef.current.trim() || 'Staff',
      })
    })
    socket.on('disconnect', () => {
      setConnection('offline')
      setOnlineCount(0)
    })
    socket.on('connect_error', () => {
      setConnection('offline')
      setError('Radio server is unavailable. Check the server URL and try again.')
    })
    socket.on('radio:presence', (payload: { channel: RadioChannel; count: number }) => {
      if (payload.channel === channelRef.current) setOnlineCount(payload.count)
    })
    socket.on('radio:text', (payload: { id: string; sender: string; text: string; sentAt: string }) => {
      const message: RadioMessage = {
        id: payload.id,
        sender: payload.sender,
        text: payload.text,
        type: 'text',
        receivedAt: payload.sentAt,
      }
      setMessages((current) => [message, ...current].slice(0, 50))
    })
    socket.on('radio:voice', async (payload: VoicePayload) => {
      const bytes = payload.data instanceof Uint8Array ? payload.data : new Uint8Array(payload.data)
      const audioBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      const blob = new Blob([audioBytes], { type: payload.mimeType })
      const audioUrl = URL.createObjectURL(blob)
      audioUrlsRef.current.push(audioUrl)
      const message: RadioMessage = {
        id: payload.id,
        sender: payload.sender,
        audioUrl,
        type: 'voice',
        receivedAt: payload.sentAt,
      }
      setMessages((current) => [message, ...current].slice(0, 50))

      if (speakerEnabledRef.current) {
        const audio = new Audio(audioUrl)
        try {
          await audio.play()
        } catch {
          setError('A voice burst arrived. Use the play button in the activity log to hear it.')
        }
      }
    })
    socket.on('radio:error', (payload: { message: string }) => {
      setError(payload.message)
    })

    return () => {
      socket.disconnect()
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (maxTimerRef.current !== null) window.clearTimeout(maxTimerRef.current)
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  useEffect(() => {
    const socket = socketRef.current
    if (!socket?.connected) return
    setMessages([])
    socket.emit('radio:join', {
      channel,
      displayName: callSign.trim() || 'Staff',
    })
  }, [callSign, channel])

  async function startTalking(event?: PointerEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
    event?.preventDefault()
    if (isTalking) return
    if (!callSign.trim()) {
      setError('Enter a call sign before transmitting.')
      return
    }
    if (!socketRef.current?.connected) {
      setError('The radio must be online before transmitting.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('This browser does not support microphone recording.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      )
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (dataEvent) => {
        if (dataEvent.data.size > 0) chunksRef.current.push(dataEvent.data)
      }
      recorder.onerror = () => {
        setError('The microphone recording failed. Release and try again.')
        stopTalking()
      }
      recorder.onstop = async () => {
        if (maxTimerRef.current !== null) {
          window.clearTimeout(maxTimerRef.current)
          maxTimerRef.current = null
        }
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setIsTalking(false)

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        if (blob.size === 0) return
        if (blob.size > 2_000_000) {
          setError('Voice burst was too large. Keep transmissions under 20 seconds.')
          return
        }
        if (!socketRef.current?.connected) return

        const data = await blob.arrayBuffer()
        socketRef.current?.emit(
          'radio:voice',
          { channel, mimeType: blob.type, data },
          (ack: { ok: boolean; message?: string }) => {
            if (!ack?.ok) {
              setError(ack?.message || 'Voice burst could not be sent.')
              return
            }
            const message: RadioMessage = {
              id: makeId('voice'),
              sender: `${callSign.trim()} (you)`,
              type: 'system',
              text: 'Voice burst sent',
              receivedAt: new Date().toISOString(),
            }
            setMessages((current) => [message, ...current].slice(0, 50))
          },
        )
      }

      recorder.start()
      setError('')
      setIsTalking(true)
      maxTimerRef.current = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
        setError('Maximum 20-second transmission reached and sent.')
      }, 20_000)
    } catch (cause) {
      setIsTalking(false)
      const denied = cause instanceof DOMException && cause.name === 'NotAllowedError'
      setError(
        denied
          ? 'Microphone permission was denied. Allow microphone access in browser settings.'
          : 'The microphone could not be opened. Check that another app is not using it.',
      )
    }
  }

  function stopTalking() {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    else setIsTalking(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) void startTalking(event)
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      stopTalking()
    }
  }

  function sendText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    if (!callSign.trim()) {
      setError('Enter a call sign before sending.')
      return
    }
    if (!socketRef.current?.connected) {
      setError('The radio must be online before sending.')
      return
    }

    socketRef.current.emit(
      'radio:text',
      { channel, text: message },
      (ack: { ok: boolean; id?: string; sentAt?: string; message?: string }) => {
        if (!ack?.ok) {
          setError(ack?.message || 'Message could not be sent.')
          return
        }
        const sentMessage: RadioMessage = {
          id: ack.id || makeId('text'),
          sender: `${callSign.trim()} (you)`,
          text: message,
          type: 'text',
          receivedAt: ack.sentAt || new Date().toISOString(),
        }
        setMessages((current) => [sentMessage, ...current].slice(0, 50))
        setText('')
        setError('')
      },
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section aria-labelledby="radio-console-title" className="panel overflow-hidden">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-fire">Push-to-talk</p>
              <h2 id="radio-console-title" className="text-balance font-display text-4xl text-white sm:text-5xl">
                Staff radio
              </h2>
            </div>
            <ConnectionBadge state={connection} />
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="call-sign">Call sign</label>
              <input
                id="call-sign"
                className="field"
                value={callSign}
                onChange={(event) => setCallSign(event.target.value.slice(0, 40))}
                placeholder="Example: Headmaster"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="radio-channel">Channel</label>
              <select
                id="radio-channel"
                className="field font-mono"
                value={channel}
                onChange={(event) => setChannel(event.target.value as RadioChannel)}
                disabled={isTalking}
              >
                {RADIO_CHANNELS.map((radioChannel) => (
                  <option key={radioChannel} value={radioChannel}>{radioChannel}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-trench border border-white/10 bg-obsidian p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Signal aria-hidden="true" className="size-5 text-fire" />
                <div>
                  <p className="font-mono text-xs uppercase text-zinc-500">Current channel</p>
                  <p className="font-mono text-xl font-bold text-white">{channel}</p>
                </div>
              </div>
              <p className="font-mono text-sm tabular-nums text-zinc-400">
                {onlineCount} online
              </p>
            </div>
          </div>

          <button
            type="button"
            className={cn(
              'flex min-h-48 w-full touch-none select-none flex-col items-center justify-center gap-3 rounded-trench border-2 border-fire bg-fire/10 px-6 text-center text-white focus:outline-none focus:ring-2 focus:ring-fire focus:ring-offset-4 focus:ring-offset-obsidian disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600',
              isTalking && 'bg-fire text-white',
            )}
            disabled={connection !== 'online'}
            aria-pressed={isTalking}
            onPointerDown={(event) => void startTalking(event)}
            onPointerUp={stopTalking}
            onPointerCancel={stopTalking}
            onPointerLeave={(event) => {
              if (event.buttons > 0) stopTalking()
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
          >
            <Mic aria-hidden="true" className="size-10" />
            <span className="font-display text-4xl leading-none sm:text-5xl">
              {isTalking ? 'Transmitting' : 'Hold to talk'}
            </span>
            <span className="text-pretty text-sm text-zinc-300">
              Release to send · 20 seconds maximum
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSpeakerEnabled((value) => !value)}
            aria-pressed={speakerEnabled}
            className="secondary-button w-full"
          >
            {speakerEnabled ? <Volume2 aria-hidden="true" className="size-4" /> : <Headphones aria-hidden="true" className="size-4" />}
            Auto-play received voice: {speakerEnabled ? 'On' : 'Off'}
          </button>

          {error && (
            <p role="alert" className="rounded-trench border border-red-400/30 bg-red-400/5 p-3 text-pretty text-sm text-red-200">
              {error}
            </p>
          )}

          <form onSubmit={sendText} className="flex gap-2">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="radio-text">Text fallback</label>
              <input
                id="radio-text"
                className="field"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={280}
                placeholder="Send a short channel message"
              />
            </div>
            <button type="submit" className="primary-button shrink-0" aria-label="Send channel message">
              <Send aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </section>

      <section aria-labelledby="radio-log-title" className="panel overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <p className="font-mono text-xs uppercase text-fire">Channel traffic</p>
          <h2 id="radio-log-title" className="text-balance text-2xl font-bold text-white">
            Activity log
          </h2>
          <p className="mt-1 text-pretty text-sm text-zinc-400">
            Voice and text are relayed live and are not stored by the server.
          </p>
        </div>

        {messages.length === 0 ? (
          <div className="p-10 text-center">
            <Radio aria-hidden="true" className="mx-auto size-8 text-zinc-600" />
            <p className="mt-4 font-semibold text-white">Channel is quiet</p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-zinc-400">
              Set a call sign, confirm the channel, then hold the transmit button or send a text check.
            </p>
          </div>
        ) : (
          <ul className="max-h-[680px] divide-y divide-white/10 overflow-y-auto" aria-live="polite">
            {messages.map((message) => (
              <li key={message.id} className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-semibold text-white">{message.sender}</p>
                  <time className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500">
                    {formatTimestamp(message.receivedAt)}
                  </time>
                </div>
                {message.type === 'voice' && message.audioUrl ? (
                  <audio className="mt-3 w-full" controls preload="metadata" src={message.audioUrl}>
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-pretty text-sm text-zinc-300">{message.text}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-white/10 bg-obsidian p-4">
          <p className="text-pretty text-xs leading-5 text-zinc-500">
            This MVP has no identity verification or emergency-service integration. Do not rely on it as the sole safety channel.
          </p>
        </div>
      </section>
    </div>
  )
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <div className="flex items-center gap-2 rounded-trench border border-white/10 bg-obsidian px-3 py-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-2 rounded-full bg-amber-400',
          state === 'online' && 'bg-emerald-400',
          state === 'offline' && 'bg-red-400',
        )}
      />
      <span className="font-mono text-xs uppercase text-zinc-300">{state}</span>
    </div>
  )
}
