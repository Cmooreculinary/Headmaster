import type { Duty, Incident, ReadinessItem } from '../types'

export function getCommandSummary(
  duties: Duty[],
  incidents: Incident[],
  readiness: ReadinessItem[],
) {
  return {
    openDuties: duties.filter((duty) => duty.status !== 'complete').length,
    urgentDuties: duties.filter(
      (duty) => duty.priority === 'urgent' && duty.status !== 'complete',
    ).length,
    activeIncidents: incidents.filter((incident) => incident.status !== 'resolved').length,
    readyChecks: readiness.filter((item) => item.checked).length,
    readinessTotal: readiness.length,
  }
}

export function nextDutyStatus(status: Duty['status']): Duty['status'] {
  if (status === 'open') return 'in-progress'
  if (status === 'in-progress') return 'complete'
  return 'open'
}

export function nextIncidentStatus(status: Incident['status']): Incident['status'] {
  if (status === 'open') return 'monitoring'
  if (status === 'monitoring') return 'resolved'
  return 'open'
}
