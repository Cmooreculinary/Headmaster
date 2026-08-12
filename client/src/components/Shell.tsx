import type { ReactNode } from 'react'
import {
  ClipboardCheck,
  LayoutDashboard,
  Radio,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/utils'
import type { View } from '../types'

const navigation: Array<{ id: View; label: string; icon: LucideIcon }> = [
  { id: 'dashboard', label: 'Command', icon: LayoutDashboard },
  { id: 'duties', label: 'Duty board', icon: ClipboardCheck },
  { id: 'incidents', label: 'Incident desk', icon: ShieldAlert },
  { id: 'radio', label: 'Walkie-talkie', icon: Radio },
]

interface ShellProps {
  activeView: View
  children: ReactNode
  onNavigate: (view: View) => void
}

export function Shell({ activeView, children, onNavigate }: ShellProps) {
  const current = navigation.find((item) => item.id === activeView) ?? navigation[0]

  return (
    <div className="min-h-dvh bg-obsidian text-zinc-100">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-overlay -translate-y-24 rounded-trench bg-fire px-4 py-2 font-semibold text-white focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-nav hidden w-64 border-r border-white/10 bg-steel-1 lg:flex lg:flex-col">
        <div className="border-b border-white/10 p-6">
          <p className="font-mono text-xs uppercase text-fire">School operations</p>
          <p className="mt-1 font-display text-4xl leading-none text-white">Headmaster</p>
          <p className="mt-2 text-sm text-zinc-400">Command Center</p>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = item.id === activeView
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-trench border px-3 py-3 text-left text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-fire focus:ring-offset-2 focus:ring-offset-obsidian',
                  active
                    ? 'border-fire bg-fire/10 text-white'
                    : 'border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs leading-5 text-zinc-500">
          Prototype: no protected student information.
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-nav border-b border-white/10 bg-obsidian/95 px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase text-fire lg:hidden">Headmaster</p>
              <h1 className="text-balance font-display text-3xl leading-none text-white sm:text-4xl">
                {current.label}
              </h1>
            </div>
            <div className="hidden items-center gap-2 border-l border-white/10 pl-4 sm:flex">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="font-mono text-xs text-zinc-400">LOCAL OPS READY</span>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-nav grid grid-cols-4 border-t border-white/10 bg-steel-1 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        {navigation.map((item) => {
          const Icon = item.icon
          const active = item.id === activeView
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-trench px-1 text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-fire',
                active ? 'bg-fire/10 text-fire' : 'text-zinc-400',
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
