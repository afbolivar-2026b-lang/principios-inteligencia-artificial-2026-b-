import { Component, type ReactNode } from 'react'
import { descargarDatosCrudos } from '../crudo'

interface Estado {
  fallo: boolean
  descargando: boolean
  mensaje: string
}

/** Última red de seguridad: si algo se rompe al dibujar la app, muestra esto en vez de una pantalla en blanco. */
export class LimiteDeError extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { fallo: false, descargando: false, mensaje: '' }

  static getDerivedStateFromError(): Partial<Estado> {
    return { fallo: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Nova: error al dibujar la pantalla', error) // solo queda en la consola de este celular
  }

  private descargar = async () => {
    this.setState({ descargando: true, mensaje: '' })
    try {
      await descargarDatosCrudos()
      this.setState({ descargando: false, mensaje: 'Listo: se descargó una copia de tus datos.' })
    } catch {
      this.setState({ descargando: false, mensaje: 'No pude leer los datos. Cierra la app y vuelve a abrirla.' })
    }
  }

  render() {
    if (!this.state.fallo) return this.props.children
    return (
      <main role="alert" className="mx-auto flex min-h-dvh max-w-content flex-col justify-center gap-4 bg-bg p-6 text-text">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p>Nova tuvo un problema al mostrar la pantalla. <strong>Tus datos siguen guardados en este celular.</strong></p>
        <button type="button" onClick={() => this.setState({ fallo: false })} className="h-[52px] rounded-md bg-accent font-semibold text-on-accent">Intentar de nuevo</button>
        <button type="button" onClick={() => location.reload()} className="h-[52px] rounded-md border border-border-input font-semibold">Recargar la app</button>
        <button type="button" onClick={this.descargar} disabled={this.state.descargando} className="h-[52px] rounded-md border border-border-input font-semibold disabled:opacity-45">
          {this.state.descargando ? 'Preparando…' : 'Descargar una copia de mis datos'}
        </button>
        <p role="status" className="text-sm text-text-muted">{this.state.mensaje}</p>
      </main>
    )
  }
}
