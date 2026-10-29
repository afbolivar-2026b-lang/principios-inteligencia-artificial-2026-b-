import { Hammer } from 'lucide-react'

export function Pendiente({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <section className="mx-4 mt-8 rounded-lg border border-border bg-surface p-6 text-center shadow-card">
      <Hammer aria-hidden="true" className="mx-auto size-10 text-text-muted" />
      <h1 className="mt-3 text-lg font-semibold">{titulo}</h1>
      <p className="mt-1 text-sm text-text-muted">{texto}</p>
    </section>
  )
}
