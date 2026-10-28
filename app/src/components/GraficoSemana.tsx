import { diaSemana } from '../dates'
import { formatoCOP } from '../money'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function GraficoSemana({ dias, hoy }: { dias: number[]; hoy: string }) {
  const hoyIdx = diaSemana(hoy)
  const max = Math.max(...dias, 1)
  return (
    <section aria-labelledby="titulo-semana" className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <h2 id="titulo-semana" className="text-center text-lg font-semibold">Gasto de esta semana</h2>
      <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
        {DIAS.map((d, i) => {
          const valor = dias[i]
          const futuro = i > hoyIdx
          const alto = valor > 0 ? Math.max(14, Math.round((valor / max) * 100)) : 6
          const intensidad = valor > 0 ? 0.4 + 0.6 * (valor / max) : 1
          return (
            <div key={d} className="flex flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end justify-center">
                <div
                  className={`w-7 rounded-sm ${valor > 0 ? 'bg-accent' : 'bg-border'}`}
                  style={{ height: `${alto}%`, opacity: futuro ? 0.5 : intensidad }}
                />
              </div>
              <span className={`text-xs ${i === hoyIdx ? 'font-bold text-accent' : 'text-text-muted'}`}>{d}</span>
            </div>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Gasto por día de esta semana</caption>
        <tbody>
          {DIAS.map((d, i) => (
            <tr key={d}><th scope="row">{d}</th><td>{formatoCOP(dias[i])}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
