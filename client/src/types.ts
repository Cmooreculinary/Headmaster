export type View = 'dashboard' | 'duties' | 'incidents' | 'radio'

export type Priority = 'routine' | 'important' | 'urgent'
export type DutyStatus = 'open' | 'in-progress' | 'complete'

export interface Duty {
  id: string
  title: string
  zone: string
  assignedTo: string
  priority: Priority
  status: DutyStatus
  createdAt: string
}

export type Severity = 'low' | 'moderate' | 'high'
export type IncidentStatus = 'open' | 'monitoring' | 'resolved'

export interface Incident {
  id: string
  summary: string
  location: string
  notes: string
  severity: Severity
  status: IncidentStatus
  createdAt: string
}

export interface ReadinessItem {
  id: string
  label: string
  checked: boolean
}

export interface RadioMessage {
  id: string
  sender: string
  text?: string
  audioUrl?: string
  type: 'text' | 'voice' | 'system'
  receivedAt: string
}

export const RADIO_CHANNELS = ['GENERAL', 'ADMIN', 'DUTY', 'EMERGENCY', 'FACILITIES'] as const
export type RadioChannel = (typeof RADIO_CHANNELS)[number]
