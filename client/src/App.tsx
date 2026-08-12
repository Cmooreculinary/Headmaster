import { useState } from 'react'
import { Shell } from './components/Shell'
import { usePersistentState } from './hooks/usePersistentState'
import { Dashboard } from './pages/Dashboard'
import { DutyBoard } from './pages/DutyBoard'
import { IncidentDesk } from './pages/IncidentDesk'
import { WalkieTalkie } from './pages/WalkieTalkie'
import type { Duty, Incident, ReadinessItem, View } from './types'

const readinessDefaults: ReadinessItem[] = [
  { id: 'brief', label: 'Leadership brief confirmed', checked: false },
  { id: 'coverage', label: 'Duty coverage confirmed', checked: false },
  { id: 'entry', label: 'Entry points checked', checked: false },
  { id: 'comms', label: 'Emergency communications checked', checked: false },
]

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [duties, setDuties] = usePersistentState<Duty[]>('headmaster:duties', [])
  const [incidents, setIncidents] = usePersistentState<Incident[]>('headmaster:incidents', [])
  const [readiness, setReadiness] = usePersistentState<ReadinessItem[]>(
    'headmaster:readiness',
    readinessDefaults,
  )

  return (
    <Shell activeView={activeView} onNavigate={setActiveView}>
      {activeView === 'dashboard' && (
        <Dashboard
          duties={duties}
          incidents={incidents}
          readiness={readiness}
          onNavigate={setActiveView}
          onToggleReadiness={(id) =>
            setReadiness((items) =>
              items.map((item) =>
                item.id === id ? { ...item, checked: !item.checked } : item,
              ),
            )
          }
        />
      )}
      {activeView === 'duties' && <DutyBoard duties={duties} onChange={setDuties} />}
      {activeView === 'incidents' && (
        <IncidentDesk incidents={incidents} onChange={setIncidents} />
      )}
      {activeView === 'radio' && <WalkieTalkie />}
    </Shell>
  )
}
