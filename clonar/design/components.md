# Componentes: app de gastos personal

Diseño propio, móvil primero (ancho máximo del contenido: 480 px). Íconos: Lucide (licencia ISC). Fuente: Inter (licencia OFL), con números tabulares para que los montos queden alineados. Todos los textos se escriben desde cero.

Reglas generales:
- Área táctil mínima de 44 × 44 px.
- El foco con teclado se ve como un anillo de 2 px en `focus`, separado 2 px del componente.
- Los montos siempre en pesos sin centavos, con punto de miles: `$18.000`. Los gastos van en `text` y los ingresos en `success` con un signo `+`.
- El color nunca es la única señal: "excedido" lleva también un ícono y un texto.
- En modo privacidad, cada monto se muestra como `$ ••••`, con `aria-label="monto oculto"`.

```
Button
  variantes  primario (bg accent, texto on-accent), secundario (bg surface, borde border, texto text),
             fantasma (sin fondo, texto accent), peligro (bg danger, texto on-accent)
  tamaños    sm 36px, md 44px, lg 52px (ancho completo en formularios)
  estados    normal, presionado (oscurece 8 %), focus-visible, deshabilitado (opacidad 45 %), cargando (spinner y etiqueta oculta solo visualmente)
  tokens     radius md, texto base/600, padding horizontal 16
  a11y       <button> real; al cargar, aria-busy="true" y la etiqueta se conserva para lectores de pantalla
  se usa en  todas

BotonFlotante (+)
  variantes  —
  tamaño     56px, círculo, abajo a la derecha, 16px sobre la barra de pestañas
  estados    normal, presionado, focus-visible
  tokens     bg accent, ícono on-accent, shadow pop
  a11y       aria-label="Agregar movimiento"
  se usa en  S02, S07

HojaInferior
  variantes  opciones (S03), formulario (S06)
  estados    abierta, cerrándose; se cierra con deslizar hacia abajo, con el fondo o con Escape
  tokens     bg bg, radius lg arriba, shadow pop, fondo oscurecido rgba(0,0,0,.4)
  a11y       role="dialog", aria-modal, el foco queda atrapado adentro y vuelve al botón que la abrió
  se usa en  S03, S06

CampoMonto
  variantes  grande (S06, texto display), normal (S09, S10)
  estados    vacío ("$0" en text-muted), con valor, error ("Escribe un monto mayor a 0" en danger), deshabilitado
  tokens     borde border-input, radius md, alto 52px; números tabulares
  comportamiento  teclado numérico (inputmode="numeric"); pone el punto de miles mientras se escribe; acepta "18k" y "18 mil" al pegar
  a11y       <label> visible, el error se enlaza con aria-describedby
  se usa en  S06, S08, S09, S10

CampoTexto
  variantes  normal, frase (S06: "Ej.: almuerzo 18 mil en efectivo")
  estados    vacío, con valor, foco, error, deshabilitado
  tokens     igual que CampoMonto, alto 44px
  se usa en  S06, S08, S10, S12

SelectorCategoria
  variantes  cuadrícula de chips con ícono (S06), lista (S09, S12)
  estados    normal, seleccionado (bg accent-soft, borde accent, check), focus-visible
  tokens     radius pill, texto sm/500
  a11y       role="radiogroup"; se navega con flechas
  se usa en  S06, S08, S09, S12

SelectorFecha
  variantes  rápido (Hoy, Ayer, Otra fecha) y calendario
  estados    hoy (por defecto), otra fecha
  a11y       el calendario es el nativo del navegador (<input type="date">)
  se usa en  S06, S08

SelectorMedioPago
  variantes  chips: Efectivo, Tarjeta, Nequi, Daviplata, PSE, Transferencia, Otro
  estados    ninguno (opcional), seleccionado
  nota       nombres genéricos de medios de pago, sin logos de marcas
  se usa en  S06, S08

FilaMovimiento
  variantes  gasto, ingreso, gasto fijo (con ícono de repetir)
  estados    normal, presionado, monto oculto (modo privacidad)
  contenido  ícono de la categoría · descripción (text) y categoría (text-muted, xs) · monto a la derecha
  a11y       un <button> que abre S08; aria-label con la frase completa: "Almuerzo, Comida, 18.000 pesos, hoy"
  se usa en  S02, S07

EncabezadoDia
  variantes  Hoy, Ayer, fecha ("lun 27 oct")
  contenido  fecha a la izquierda y total del día a la derecha, en text-muted xs
  se usa en  S07

BarraProgreso
  variantes  normal (accent), alerta desde el umbral (warning y texto "Vas en el 82 %"), excedido (danger, ícono de alerta y "Te pasaste por $12.000")
  tokens     alto 8px, radius pill, fondo border
  a11y       role="progressbar" con aria-valuenow y una etiqueta en texto
  se usa en  S02, S09, S10

TarjetaResumen
  variantes  mes actual
  contenido  "Puedes gastar" (display) · gastado e ingresado (sm) · BarraProgreso del total
  estados    con datos, sin presupuesto ("Pon un presupuesto para ver cuánto te queda"), oculto (privacidad)
  tokens     bg surface, radius lg, padding 16
  se usa en  S02

EstadoVacio
  variantes  movimientos, presupuestos, metas, reportes
  contenido  ícono Lucide de 40px en text-muted, una frase y un botón primario
  se usa en  S02, S07, S09, S10, S11

Grafico
  variantes  torta por categoría, barras por mes
  estados    vacío (EstadoVacio), con datos
  a11y       cada gráfico tiene al lado una tabla con los mismos datos
  se usa en  S11

GrabadoraVoz
  estados    lista ("Toca y habla"), escuchando (anillo animado en accent), procesando (spinner), error de permiso ("Activa el micrófono en los ajustes de Chrome"), sin internet (lleva al formulario manual)
  a11y       aria-live="polite" anuncia cada cambio de estado
  se usa en  S04

VisorCamara
  estados    listo, procesando, no se pudo leer ("Prueba con más luz o escribe el gasto"), permiso negado
  se usa en  S05

Interruptor
  estados    encendido, apagado, focus-visible, deshabilitado
  a11y       role="switch" con aria-checked
  se usa en  S13

TecladoPin
  estados    normal, error (vibra y muestra "PIN incorrecto"), bloqueado 30 s después de 5 intentos
  se usa en  S14

Aviso (toast)
  variantes  éxito ("Guardado"), error, con acción ("Borrado · Deshacer")
  duración   4 s; con acción, 6 s
  a11y       role="status"
  se usa en  todas

BarraPestanas
  pestañas   Inicio, Movimientos, Presupuestos, Reportes, Ajustes
  estados    activa (accent, ícono relleno), inactiva (text-muted)
  tokens     alto 64px, bg bg, borde superior border
  a11y       <nav> con aria-current="page"
  se usa en  todas las pantallas principales
```
