import { PieChart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { mesDe, nombreMes } from '../dates'
import type { Categoria, Movimiento } from '../db'
import { formatoCOP } from '../money'
import { gastoPorCategoria, serieMensual, sumarMeses } from '../reportes'
import { SelectorMes } from './SelectorMes'

const COLORES = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-chart-6)']
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function Analisis({ movs, cats, hoy }: { movs: Movimiento[]; cats: Categoria[]; hoy: string }) {
  const mesActual = mesDe(hoy)
  const [mes, setMes] = useState(mesActual)
  const rebanadas = useMemo(() => gastoPorCategoria(movs, cats, mes), [movs, cats, mes])
  const serie = useMemo(() => serieMensual(movs, mes, 6), [movs, mes])
  const total = rebanadas.reduce((a, r) => a + r.monto, 0)
  const actual = serie[serie.length - 1]
  const anterior = serie[serie.length - 2]
  const cambio = anterior.gastos > 0 ? Math.round(((actual.gastos - anterior.gastos) / anterior.gastos) * 100) : null
  const maximo = Math.max(1, ...serie.flatMap((p) => [p.gastos, p.ingresos]))
  const color = (i: number, id: string) => (id === 'otras' ? 'var(--color-border-input)' : COLORES[i % COLORES.length])

  let acumulado = 0
  return (
    <>
      <header className="px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <h1 className="text-2xl font-bold">Análisis</h1>
      </header>
      <main className="flex flex-col gap-3 px-4">
        <SelectorMes mes={mes} mesMax={mesActual} onCambiar={setMes} />

        <section aria-labelledby="t-cat" className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 id="t-cat" className="text-lg font-semibold">En qué se fue la plata</h2>
          {rebanadas.length === 0 ? (
            <div className="py-6 text-center">
              <PieChart aria-hidden="true" className="mx-auto size-10 text-text-muted" />
              <p className="mt-3 font-semibold">No hay gastos en {nombreMes(`${mes}-01`).toLowerCase()}</p>
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-4">
              <div className="relative size-44">
                <svg viewBox="0 0 42 42" role="img" aria-label={`Gastos de ${nombreMes(`${mes}-01`)}: ${formatoCOP(total)} en ${rebanadas.length} grupos`} className="size-full -rotate-90">
                  <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--color-border)" strokeWidth="5" />
                  {rebanadas.map((r, i) => {
                    const inicio = acumulado
                    acumulado += r.porcentaje
                    const largo = Math.max(0, r.porcentaje - (rebanadas.length > 1 ? 0.8 : 0))
                    return (
                      <circle key={r.id} cx="21" cy="21" r="15.9155" fill="none" stroke={color(i, r.id)} strokeWidth="5"
                        strokeDasharray={`${largo} ${100 - largo}`} strokeDashoffset={-inicio} />
                    )
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-text-muted">Gastaste</span>
                  <span className={`font-extrabold ${formatoCOP(total).length <= 8 ? 'text-lg' : formatoCOP(total).length <= 11 ? 'text-base' : formatoCOP(total).length <= 14 ? 'text-sm' : 'text-xs'}`}>{formatoCOP(total)}</span>
                </div>
              </div>
              <ul className="flex w-full flex-col gap-1">
                {rebanadas.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 py-1">
                    <span aria-hidden="true" className="size-4 flex-none rounded-sm" style={{ background: color(i, r.id) }} />
                    <span className="min-w-0 flex-1 truncate">{r.nombre}</span>
                    <span className="text-sm text-text-muted">{r.porcentaje} %</span>
                    <span className="w-24 text-right font-semibold">{formatoCOP(r.monto)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="t-mes" className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <h2 id="t-mes" className="text-lg font-semibold">Mes a mes</h2>
          {cambio !== null ? (
            <p className="mt-1 text-sm text-text-muted">
              {nombreMes(`${mes}-01`)}: gastaste {formatoCOP(actual.gastos)}, {cambio === 0 ? 'lo mismo que' : `un ${Math.abs(cambio)} % ${cambio < 0 ? 'menos' : 'más'} que en`} {nombreMes(`${sumarMeses(mes, -1)}-01`).toLowerCase()}.
            </p>
          ) : null}
          <div aria-hidden="true" className="mt-4 grid grid-cols-6 gap-2">
            {serie.map((p) => (
              <div key={p.mes} className="flex flex-col items-center gap-1">
                <div className="flex h-28 items-end gap-1">
                  <div className="w-3 rounded-sm bg-success" style={{ height: `${Math.max(p.ingresos > 0 ? 4 : 2, (p.ingresos / maximo) * 100)}%`, opacity: p.ingresos > 0 ? 1 : 0.4 }} />
                  <div className="w-3 rounded-sm bg-chart-3" style={{ height: `${Math.max(p.gastos > 0 ? 4 : 2, (p.gastos / maximo) * 100)}%`, opacity: p.gastos > 0 ? 1 : 0.4 }} />
                </div>
                <span className={`text-xs ${p.mes === mes ? 'font-bold text-accent' : 'text-text-muted'}`}>{MESES[Number(p.mes.slice(5)) - 1]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1"><span aria-hidden="true" className="size-3 rounded-sm bg-success" /> Ingresos</span>
            <span className="flex items-center gap-1"><span aria-hidden="true" className="size-3 rounded-sm bg-chart-3" /> Gastos</span>
          </div>
          <div className="sr-only">
          <table>
            <caption>Ingresos y gastos de los últimos 6 meses</caption>
            <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th></tr></thead>
            <tbody>
              {serie.map((p) => <tr key={p.mes}><th scope="row">{nombreMes(`${p.mes}-01`)}</th><td>{formatoCOP(p.ingresos)}</td><td>{formatoCOP(p.gastos)}</td></tr>)}
            </tbody>
          </table>
          </div>
        </section>
      </main>
    </>
  )
}
