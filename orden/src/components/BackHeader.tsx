import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { navigate } from '../app/router'

export function BackHeader({ to, label, right }: { to: string; label: string; right?: ReactNode }) {
  return (
    <div className="-ml-2 flex items-center justify-between pt-1">
      <button type="button" onClick={() => navigate(to)} className="flex h-11 items-center gap-0.5 pr-3 pl-1 text-callout font-medium text-accent-text">
        <ChevronLeft className="size-5" /> {label}
      </button>
      {right}
    </div>
  )
}
