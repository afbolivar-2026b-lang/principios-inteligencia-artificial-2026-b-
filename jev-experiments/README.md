# Experimentos con Jev

[Jev](https://docs.typesafe.ai) (TypeSafe) es un modelo de decisión de tipo "Sistema 1": no genera texto, sino que recibe un estado y preguntas tipadas (`Choice`, `Noul`, `Score`) y responde con valores tipados y probabilidades calibradas. Es rápido (~150 ms) y barato (los tokens de salida son gratis).

Esta carpeta reúne cuatro experimentos de la comunidad como submódulos de git. Cada uno muestra un caso de uso distinto.

| # | Caso de uso | Submódulo | Stack | Repositorio |
|---|---|---|---|---|
| 1 | Ventas: enrutamiento de leads | [`jev-playground`](jev-playground/) | Python + servidor MCP | [deepdave98/jev-playground](https://github.com/deepdave98/jev-playground) |
| 2 | Soporte: enrutamiento de tickets | [`jev-demo-router`](jev-demo-router/) | Python + Flask | [Zafer-Liu/jev-demo-router](https://github.com/Zafer-Liu/jev-demo-router) |
| 3 | Clasificación de documentos financieros | [`jev-doc-classification`](jev-doc-classification/) | TypeScript + Bun (OpenRouter) | [lucassarcanjo/jev-doc-classification](https://github.com/lucassarcanjo/jev-doc-classification) |
| 4 | Contabilidad con IA en el escritorio | [`jev-clerk`](jev-clerk/) | Python (macOS) | [stas4000/jev-clerk](https://github.com/stas4000/jev-clerk) |

## 1. Enrutamiento de leads y ventas — `jev-playground`

Flujos de go-to-market (GTM) resueltos con Jev y comparados con Claude, organizados por semanas:

- Triage y enrutamiento de leads
- Riesgo de negocios (deal risk scoring)
- Clasificación de respuestas (reply triage)
- MEDDPICC a partir de resúmenes de llamadas
- Detección de cuentas duplicadas
- Reactivación de negocios perdidos
- Un servidor MCP para usar estos flujos desde un agente

## 2. Enrutamiento de tickets de soporte — `jev-demo-router`

Cada ticket (en inglés o chino) pasa por una sola llamada a Jev con tres preguntas: qué departamento lo atiende (`Choice`), si es urgente (`Noul`) y qué tan frustrado está el cliente (`Score` de 0 a 2). Si la confianza es ≥ 0.75 el ticket se despacha solo; si no, va a una cola humana.

Resultado reportado con 100 tickets: 100/100 departamentos correctos, 98 % despachado automáticamente sin errores, y las 2 escalaciones eran correctas pero con baja confianza. Costo: ~$0.0019 por 100 tickets.

## 3. Clasificación de documentos financieros — `jev-doc-classification`

CLI que clasifica PDFs financieros (facturas, recibos, extractos bancarios, etc.) y muestra una probabilidad por cada tipo de documento, no solo una etiqueta. Usa Jev a través de OpenRouter, sin prompts en JSON ni capa de parseo.

## 4. Experimento de contabilidad con IA — `jev-clerk`

Un "auxiliar contable" que opera un escritorio Mac real: abre la factura en PDF, la lee y la registra en Frappe Books. Usa dos modelos a dos velocidades:

- **Sistema 1 (Jev)** toma cada decisión del siguiente paso a partir del texto OCR de la pantalla.
- **Sistema 2 (un modelo profundo)** no toca la pantalla: cada 10 facturas lee el registro de decisiones y reescribe el *playbook* de Jev.
- **El árbitro** es la base de datos contable: una factura solo cuenta si quedó registrada con proveedor, fecha y monto correctos.

En la corrida grabada (90 iteraciones) pasó de 0/9 facturas correctas con el playbook inicial a 9/9 con el playbook v8, con un costo total de Jev de $0.24.

## Uso

Para clonar este repositorio con los submódulos incluidos:

```sh
git clone --recurse-submodules <url-de-este-repo>
# o, si ya está clonado:
git submodule update --init --recursive
```

Cada submódulo tiene su propio README con instrucciones de instalación y las llaves de API que necesita.
