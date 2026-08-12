import { describe, expect, it } from 'vitest'
import { getCommandSummary, nextDutyStatus, nextIncidentStatus } from './operations'
import type { Duty, Incident, ReadinessItem } from '../types'

const duty = (overrides: Partial<Duty>): Duty => ({
  id: 'duty-1',
  title: 'Gate check',
  zone: 'North gate',
  assignedTo: 'Staff',
  priority: 'routine',
  status: 'open',
  createdAt: '2026-08-12T08:00:00.000Z',
  ...overrides,
})

const incident = (overrides: Partial<Incident>): Incident => ({
  id: 'incident-1',
  summary: 'Operational note',
  location: 'Hall',
  notes: '',
  severity: 'low',
  status: 'open',
  createdAt: '2026-08-12T08:00:00.000Z',
  ...overrides,
})

describe('command summary', () => {
  it('counts only active work and incidents', () => {
    const duties = [
      duty({ priority: 'urgent' }),
      duty({ id: 'duty-2', status: 'complete' }),
    ]
    const incidents = [incident({}), incident({ id: 'incident-2', status: 'resolved' })]
    const readiness: ReadinessItem[] = [
      { id: 'one', label: 'One', checked: true },
      { id: 'two', label: 'Two', checked: false },
    ]

    expect(getCommandSummary(duties, incidents, readiness)).toEqual({
      openDuties: 1,
      urgentDuties: 1,
      activeIncidents: 1,
      readyChecks: 1,
      readinessTotal: 2,
    })
  })

  it('cycles duty and incident workflow states', () => {
    expect(nextDutyStatus('open')).toBe('in-progress')
    expect(nextDutyStatus('in-progress')).toBe('complete')
    expect(nextDutyStatus('complete')).toBe('open')
    expect(nextIncidentStatus('open')).toBe('monitoring')
    expect(nextIncidentStatus('monitoring')).toBe('resolved')
    expect(nextIncidentStatus('resolved')).toBe('open')
  })
})
