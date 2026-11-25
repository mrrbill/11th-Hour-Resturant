import { useNavigate } from 'react-router-dom'
import { BackIcon } from './icons'
import { CornerCircles, label } from './ui'

export function StepHeader({ step, title, backTo }: { step: string; title: string; backTo: string }) {
  const navigate = useNavigate()
  return (
    <header className="on-dark relative overflow-hidden bg-brand px-4 pb-6 pt-4 text-white">
      <CornerCircles small />
      <div className="relative mx-auto max-w-xl">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Back"
        >
          <BackIcon className="h-6 w-6" />
        </button>
        <p className={`${label} mt-2 text-white/80`}>{step}</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold">{title}</h1>
      </div>
    </header>
  )
}
