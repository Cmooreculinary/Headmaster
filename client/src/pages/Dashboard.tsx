import { ArrowRight, CheckCircle2, Circle, Flame, Radio, ShieldAlert } from 'lucide-react'
import { getCommandSummary } from '../lib/operations'
import { cn, formatTimestamp } from '../lib/utils'
import type { Duty, Incident, ReadinessItem, View } from '../types'

interface DashboardProps {
  duties: Duty[]
  incidents: Incident[]
  readiness: ReadinessItem[]
  onNavigate: (view: View) => void
  onToggleReadiness: (id: string) => void
}

export function Dashboard({
  duties,
  incidents,
  readiness,
  onNavigate,
  onToggleReadiness,
}: DashboardProps) {
  const summary = getCommandSummary(duties, incidents, readiness)
  const priorityQueue = duties
    .filter((duty) => duty.status !== 'complete')
    .sort((a, b) => {
      const order = { urgent: 0, important: 1, routine: 2 }
      return order[a.priority] - order[b.priority]
    })
    .slice(0, 4)

  const activeIncidents = incidents
    .filter((incident) => incident.status !== 'resolved')
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <section aria-labelledby="shift-overview-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-xs uppercase text-zinc-500">Live local snapshot</p>
            <h2 id="shift-overview-title" className="text-balance text-2xl font-bold text-white">
              Shift overview
            </h2>
          </div>
          <button type="button" onClick={() => onNavigate('radio')} className="secondary-button">
            <Radio aria-hidden="true" className="size-4 text-fire" />
            Open staff radio
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Open duties" value={summary.openDuties} detail="Assigned work in motion" />
          <Metric
            label="Urgent duties"
            value={summary.urgentDuties}
            detail="Needs immediate attention"
            hot={summary.urgentDuties > 0}
          />
          <Metric
            label="Active incidents"
            value={summary.activeIncidents}
            detail="Open or monitoring"
            hot={summary.activeIncidents > 0}
          />
          <Metric
            label="Readiness"
            value={`${summary.readyChecks}/${summary.readinessTotal}`}
            detail="Shift checks complete"
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section aria-labelledby="priority-title" className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <p className="font-mono text-xs uppercase text-fire">Ticket rail</p>
              <h2 id="priority-title" className="text-balance text-xl font-bold text-white">
                Priority queue
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('duties')}
              className="secondary-button"
            >
              Duty board
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>

          {priorityQueue.length === 0 ? (
            <EmptyState
              title="No open duties"
              message="Add the first assignment to build the shift plan."
              action="Add duty"
              onAction={() => onNavigate('duties')}
            />
          ) : (
            <ul className="divide-y divide-white/10">
              {priorityQueue.map((duty) => (
                <li key={duty.id} className="flex items-start gap-4 p-5">
                  <span
                    className={cn(
                      'mt-1 size-2 rounded-full bg-zinc-500',
                      duty.priority === 'urgent' && 'bg-fire',
                      duty.priority === 'important' && 'bg-amber-400',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{duty.title}</p>
                    <p className="mt-1 text-pretty text-sm text-zinc-400">
                      {duty.zone} · {duty.assignedTo}
                    </p>
                  </div>
                  <span className="rounded-trench border border-white/10 px-2 py-1 font-mono text-[11px] uppercase text-zinc-400">
                    {duty.status.replace('-', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="readiness-title" className="panel p-5">
          <p className="font-mono text-xs uppercase text-fire">Opening discipline</p>
          <h2 id="readiness-title" className="text-balance text-xl font-bold text-white">
            Readiness checks
          </h2>
          <p className="mt-1 text-pretty text-sm text-zinc-400">
            Stored only in this browser for the current prototype.
          </p>

          <ul className="mt-5 space-y-2">
            {readiness.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-trench border border-white/10 bg-obsidian p-3 hover:border-white/20 focus-within:border-fire focus-within:ring-2 focus-within:ring-fire/40">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => onToggleReadiness(item.id)}
                    className="peer sr-only"
                  />
                  {item.checked ? (
                    <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-400" />
                  ) : (
                    <Circle aria-hidden="true" className="size-5 shrink-0 text-zinc-600 peer-focus-visible:text-fire" />
                  )}
                  <span className={cn('text-sm text-zinc-200', item.checked && 'text-zinc-500 line-through')}>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="incident-snapshot-title" className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="font-mono text-xs uppercase text-fire">Awareness</p>
            <h2 id="incident-snapshot-title" className="text-balance text-xl font-bold text-white">
              Active incident snapshot
            </h2>
          </div>
          <button type="button" onClick={() => onNavigate('incidents')} className="secondary-button">
            <ShieldAlert aria-hidden="true" className="size-4" />
            Incident desk
          </button>
        </div>

        {activeIncidents.length === 0 ? (
          <EmptyState
            title="No active incidents"
            message="The desk is clear. Log operational incidents without protected student information."
            action="Open incident desk"
            onAction={() => onNavigate('incidents')}
          />
        ) : (
          <ul className="grid gap-px bg-white/10 sm:grid-cols-3">
            {activeIncidents.map((incident) => (
              <li key={incident.id} className="bg-steel-1 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] uppercase text-fire">{incident.severity}</span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {formatTimestamp(incident.createdAt)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 font-semibold text-white">{incident.summary}</p>
                <p className="mt-1 truncate text-sm text-zinc-400">{incident.location}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  hot = false,
}: {
  label: string
  value: number | string
  detail: string
  hot?: boolean
}) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-400">{label}</p>
        {hot && <Flame aria-hidden="true" className="size-4 text-fire" />}
      </div>
      <p className={cn('mt-3 font-mono text-4xl font-bold tabular-nums text-white', hot && 'text-fire')}>
        {value}
      </p>
      <p className="mt-2 text-pretty text-xs text-zinc-500">{detail}</p>
    </article>
  )
}

function EmptyState({
  title,
  message,
  action,
  onAction,
}: {
  title: string
  message: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="p-8 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-pretty text-sm text-zinc-400">{message}</p>
      <button type="button" onClick={onAction} className="primary-button mt-4">
        {action}
      </button>
    </div>
  )
}
