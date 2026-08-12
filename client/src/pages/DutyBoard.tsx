import { useState, type FormEvent } from 'react'
import { ClipboardPlus, RotateCw } from 'lucide-react'
import { nextDutyStatus } from '../lib/operations'
import { cn, formatTimestamp, makeId } from '../lib/utils'
import type { Duty, DutyStatus, Priority } from '../types'

type DutyFilter = 'active' | 'all' | 'complete'

interface DutyBoardProps {
  duties: Duty[]
  onChange: (value: Duty[] | ((current: Duty[]) => Duty[])) => void
}

export function DutyBoard({ duties, onChange }: DutyBoardProps) {
  const [filter, setFilter] = useState<DutyFilter>('active')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    zone: '',
    assignedTo: '',
    priority: 'routine' as Priority,
  })

  const visibleDuties = duties
    .filter((duty) => {
      if (filter === 'active') return duty.status !== 'complete'
      if (filter === 'complete') return duty.status === 'complete'
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = form.title.trim()
    const zone = form.zone.trim()
    const assignedTo = form.assignedTo.trim()

    if (!title || !zone || !assignedTo) {
      setError('Task, zone, and assignee are required.')
      return
    }

    const duty: Duty = {
      id: makeId('duty'),
      title,
      zone,
      assignedTo,
      priority: form.priority,
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    onChange((current) => [duty, ...current])
    setForm({ title: '', zone: '', assignedTo: '', priority: 'routine' })
    setError('')
    setFilter('active')
  }

  function advanceStatus(id: string) {
    onChange((current) =>
      current.map((duty) =>
        duty.id === id ? { ...duty, status: nextDutyStatus(duty.status) } : duty,
      ),
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section aria-labelledby="new-duty-title" className="panel h-fit p-5">
        <p className="font-mono text-xs uppercase text-fire">New assignment</p>
        <h2 id="new-duty-title" className="text-balance text-2xl font-bold text-white">
          Add to the rail
        </h2>
        <p className="mt-2 text-pretty text-sm text-zinc-400">
          Keep each duty specific enough to hand off without another meeting.
        </p>

        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <div>
            <label className="field-label" htmlFor="duty-title">Task</label>
            <input
              id="duty-title"
              className="field"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={100}
              required
              aria-describedby={error ? 'duty-form-error' : undefined}
              aria-invalid={Boolean(error) && !form.title.trim()}
              placeholder="Example: Verify west gate coverage"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="duty-zone">Zone</label>
            <input
              id="duty-zone"
              className="field"
              value={form.zone}
              onChange={(event) => setForm({ ...form, zone: event.target.value })}
              maxLength={60}
              required
              aria-describedby={error ? 'duty-form-error' : undefined}
              aria-invalid={Boolean(error) && !form.zone.trim()}
              placeholder="Building or duty area"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="duty-assignee">Assigned to</label>
            <input
              id="duty-assignee"
              className="field"
              value={form.assignedTo}
              onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}
              maxLength={60}
              required
              aria-describedby={error ? 'duty-form-error' : undefined}
              aria-invalid={Boolean(error) && !form.assignedTo.trim()}
              placeholder="Staff call sign or role"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="duty-priority">Priority</label>
            <select
              id="duty-priority"
              className="field"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}
            >
              <option value="routine">Routine</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {error && (
            <p id="duty-form-error" className="text-pretty text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="primary-button w-full">
            <ClipboardPlus aria-hidden="true" className="size-4" />
            Add duty
          </button>
        </form>
      </section>

      <section aria-labelledby="duty-list-title" className="panel overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-fire">Operations</p>
              <h2 id="duty-list-title" className="text-balance text-2xl font-bold text-white">
                Duty board
              </h2>
            </div>
            <div aria-label="Filter duties" className="flex gap-1 rounded-trench border border-white/10 bg-obsidian p-1">
              {(['active', 'all', 'complete'] as DutyFilter[]).map((option) => (
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

        {visibleDuties.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-white">No {filter} duties</p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-zinc-400">
              {filter === 'active'
                ? 'Use the assignment form to put the first duty on the rail.'
                : 'Change the filter to review another part of the duty board.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {visibleDuties.map((duty) => (
              <DutyRow key={duty.id} duty={duty} onAdvance={() => advanceStatus(duty.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DutyRow({ duty, onAdvance }: { duty: Duty; onAdvance: () => void }) {
  const statusLabel: Record<DutyStatus, string> = {
    open: 'Start duty',
    'in-progress': 'Mark complete',
    complete: 'Reopen duty',
  }

  return (
    <li className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-trench border border-white/10 px-2 py-1 font-mono text-[11px] uppercase text-zinc-400',
                duty.priority === 'urgent' && 'border-fire/60 text-fire',
                duty.priority === 'important' && 'border-amber-400/40 text-amber-300',
              )}
            >
              {duty.priority}
            </span>
            <span className="font-mono text-[11px] uppercase text-zinc-500">
              {duty.status.replace('-', ' ')}
            </span>
          </div>
          <h3 className="mt-2 truncate text-lg font-bold text-white">{duty.title}</h3>
          <p className="mt-1 text-pretty text-sm text-zinc-400">
            {duty.zone} · {duty.assignedTo} · {formatTimestamp(duty.createdAt)}
          </p>
        </div>
        <button type="button" onClick={onAdvance} className="secondary-button shrink-0">
          <RotateCw aria-hidden="true" className="size-4" />
          {statusLabel[duty.status]}
        </button>
      </div>
    </li>
  )
}
