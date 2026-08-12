import { useState, type FormEvent } from 'react'
import { AlertTriangle, RotateCw, ShieldPlus } from 'lucide-react'
import { nextIncidentStatus } from '../lib/operations'
import { cn, formatTimestamp, makeId } from '../lib/utils'
import type { Incident, IncidentStatus, Severity } from '../types'

type IncidentFilter = 'active' | 'all' | 'resolved'

interface IncidentDeskProps {
  incidents: Incident[]
  onChange: (value: Incident[] | ((current: Incident[]) => Incident[])) => void
}

export function IncidentDesk({ incidents, onChange }: IncidentDeskProps) {
  const [filter, setFilter] = useState<IncidentFilter>('active')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    summary: '',
    location: '',
    notes: '',
    severity: 'low' as Severity,
  })

  const visibleIncidents = incidents
    .filter((incident) => {
      if (filter === 'active') return incident.status !== 'resolved'
      if (filter === 'resolved') return incident.status === 'resolved'
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const summary = form.summary.trim()
    const location = form.location.trim()

    if (!summary || !location) {
      setError('Summary and location are required.')
      return
    }

    const incident: Incident = {
      id: makeId('incident'),
      summary,
      location,
      notes: form.notes.trim(),
      severity: form.severity,
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    onChange((current) => [incident, ...current])
    setForm({ summary: '', location: '', notes: '', severity: 'low' })
    setError('')
    setFilter('active')
  }

  function advanceStatus(id: string) {
    onChange((current) =>
      current.map((incident) =>
        incident.id === id
          ? { ...incident, status: nextIncidentStatus(incident.status) }
          : incident,
      ),
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <section aria-labelledby="new-incident-title" className="panel h-fit p-5">
        <div className="rounded-trench border border-amber-400/30 bg-amber-400/5 p-3">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-300" />
            <p className="text-pretty text-sm leading-6 text-amber-100">
              Prototype only. Do not enter student names, medical details, contact details, or other protected records.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="font-mono text-xs uppercase text-fire">New record</p>
          <h2 id="new-incident-title" className="text-balance text-2xl font-bold text-white">
            Log an incident
          </h2>
        </div>

        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label className="field-label" htmlFor="incident-summary">Operational summary</label>
            <input
              id="incident-summary"
              className="field"
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              maxLength={120}
              required
              aria-describedby={error ? 'incident-form-error incident-boundary' : 'incident-boundary'}
              aria-invalid={Boolean(error) && !form.summary.trim()}
              placeholder="Brief, non-identifying description"
            />
            <p id="incident-boundary" className="mt-1.5 text-pretty text-xs text-zinc-500">
              Describe the operational situation, not an individual student.
            </p>
          </div>
          <div>
            <label className="field-label" htmlFor="incident-location">Location</label>
            <input
              id="incident-location"
              className="field"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              maxLength={80}
              required
              aria-describedby={error ? 'incident-form-error' : undefined}
              aria-invalid={Boolean(error) && !form.location.trim()}
              placeholder="Building or zone"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="incident-severity">Severity</label>
            <select
              id="incident-severity"
              className="field"
              value={form.severity}
              onChange={(event) => setForm({ ...form, severity: event.target.value as Severity })}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="incident-notes">Response notes</label>
            <textarea
              id="incident-notes"
              className="field min-h-28 resize-y"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              maxLength={500}
              placeholder="Actions taken; no protected details"
            />
          </div>

          {error && (
            <p id="incident-form-error" className="text-pretty text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary-button w-full">
            <ShieldPlus aria-hidden="true" className="size-4" />
            Log incident
          </button>
        </form>
      </section>

      <section aria-labelledby="incident-list-title" className="panel overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-fire">Operational awareness</p>
              <h2 id="incident-list-title" className="text-balance text-2xl font-bold text-white">
                Incident desk
              </h2>
            </div>
            <div aria-label="Filter incidents" className="flex gap-1 rounded-trench border border-white/10 bg-obsidian p-1">
              {(['active', 'all', 'resolved'] as IncidentFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={cn(
                    'rounded-trench px-3 py-1.5 text-xs font-semibold capitalize text-zinc-400 focus:outline-none focus:ring-2 focus:ring-fire',
                    filter === option && 'bg-white/10 text-white',
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleIncidents.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-white">No {filter} incidents</p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-zinc-400">
              {filter === 'active'
                ? 'The active desk is clear. Use the form when an operational record is needed.'
                : 'Change the filter to review another incident state.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {visibleIncidents.map((incident) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                onAdvance={() => advanceStatus(incident.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function IncidentRow({ incident, onAdvance }: { incident: Incident; onAdvance: () => void }) {
  const statusLabel: Record<IncidentStatus, string> = {
    open: 'Begin monitoring',
    monitoring: 'Mark resolved',
    resolved: 'Reopen incident',
  }

  return (
    <li className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-trench border border-white/10 px-2 py-1 font-mono text-[11px] uppercase text-zinc-400',
                incident.severity === 'high' && 'border-fire/60 text-fire',
                incident.severity === 'moderate' && 'border-amber-400/40 text-amber-300',
              )}
            >
              {incident.severity}
            </span>
            <span className="font-mono text-[11px] uppercase text-zinc-500">{incident.status}</span>
          </div>
          <h3 className="mt-2 text-pretty text-lg font-bold text-white">{incident.summary}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {incident.location} · {formatTimestamp(incident.createdAt)}
          </p>
          {incident.notes && (
            <p className="mt-3 whitespace-pre-wrap text-pretty text-sm leading-6 text-zinc-300">
              {incident.notes}
            </p>
          )}
        </div>
        <button type="button" onClick={onAdvance} className="secondary-button shrink-0">
          <RotateCw aria-hidden="true" className="size-4" />
          {statusLabel[incident.status]}
        </button>
      </div>
    </li>
  )
}
