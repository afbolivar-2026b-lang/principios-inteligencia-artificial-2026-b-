// El botón "Atrás" del celular cierra la ventana o la pantalla que está abierta, en vez de sacar al usuario de la app
// (y hacerle perder lo que estaba escribiendo). Cada ventana abierta agrega una entrada al historial; "Atrás" cierra solo la de más arriba.
interface Registro {
  cerrar: () => void
}

const pila: Registro[] = []
let ignorar = 0
let escuchando = false

function alVolver() {
  if (ignorar > 0) { ignorar--; return } // lo provocamos nosotros al cerrar por la X o con Escape
  pila.pop()?.cerrar()
}

/** Devuelve la función que hay que llamar cuando la ventana se cierra por otra vía (X, Escape, guardar). */
export function registrarAtras(cerrar: () => void): () => void {
  const registro: Registro = { cerrar }
  pila.push(registro)
  history.pushState({ nova: true }, '')
  if (!escuchando) { window.addEventListener('popstate', alVolver); escuchando = true }
  return () => {
    const i = pila.indexOf(registro)
    if (i === -1) return // ya se cerró con "Atrás"
    pila.splice(i, 1)
    ignorar++
    history.back()
  }
}
