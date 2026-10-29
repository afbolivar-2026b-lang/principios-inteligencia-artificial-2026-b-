// nova-ia: entiende un gasto o ingreso escrito, dictado o en la foto de un recibo, usando Gemini,
// y responde las preguntas de "Pregúntale a NOVA".
// Solo la llaman usuarios con sesión (verify_jwt). La clave GEMINI_API_KEY vive en los secretos
// de Supabase; la app nunca la ve.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODELO = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const CATEGORIAS_BASE = ["Comida", "Transporte", "Hogar", "Suscripciones", "Entretenimiento", "Salud",
  "Compras", "Educación", "Otros gastos", "Salario", "Otros ingresos"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function responder(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { ...CORS, "Content-Type": "application/json" } });
}

function llamarGemini(clave: string, cuerpo: unknown) {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": clave },
    body: JSON.stringify(cuerpo),
  });
}

// "Pregúntale a NOVA": responde preguntas sobre las finanzas de la persona con el resumen que manda la app.
async function conversar(clave: string, entrada: { pregunta?: string; historial?: { rol?: string; texto?: string }[]; contexto?: unknown }) {
  const pregunta = (entrada.pregunta || "").slice(0, 500).trim();
  if (!pregunta) return responder(400, { error: "Falta la pregunta" });
  const contexto = JSON.stringify(entrada.contexto ?? {}).slice(0, 40_000);
  const historial = (Array.isArray(entrada.historial) ? entrada.historial : []).slice(-6)
    .filter((t) => typeof t?.texto === "string" && t.texto.trim())
    .map((t) => ({ role: t.rol === "nova" ? "model" : "user", parts: [{ text: t.texto!.slice(0, 2000) }] }));

  const instrucciones = `Eres NOVA, el asistente de una app colombiana de finanzas personales.
Responde en español de Colombia, cálido y claro, en pocas frases (máximo unas 120 palabras), sin tecnicismos.
Usa solo los datos de la persona que vienen abajo en JSON; si algo no está en los datos, dilo con sencillez.
Valores en pesos colombianos con punto de miles y signo $ (ej: $1.250.000). Haz las cuentas con cuidado.
Puedes dar consejos prácticos de ahorro y presupuesto. No recomiendes productos financieros, inversiones ni bancos concretos.
No uses Markdown (nada de asteriscos ni #); para listas usa guiones simples.
Datos de la persona: ${contexto}`;

  let r: Response;
  try {
    r = await llamarGemini(clave, {
      systemInstruction: { parts: [{ text: instrucciones }] },
      contents: [...historial, { role: "user", parts: [{ text: pregunta }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }, // holgado: los modelos que "piensan" gastan parte de este cupo
    });
  } catch (_e) {
    return responder(502, { error: "No se pudo contactar a la IA" });
  }
  if (r.status === 429) return responder(429, { error: "limite" });
  if (!r.ok) {
    console.error("Gemini", r.status, (await r.text()).slice(0, 500));
    return responder(502, { error: "La IA no respondió bien" });
  }
  try {
    const datos = await r.json();
    const texto = (datos.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    if (!texto) return responder(502, { error: "La IA no respondió" });
    return responder(200, { respuesta: texto.slice(0, 4000) });
  } catch (_e) {
    return responder(502, { error: "La IA respondió algo que no se entendió" });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return responder(405, { error: "Usa POST" });

  const clave = Deno.env.get("GEMINI_API_KEY");
  if (!clave) return responder(503, { error: "sin_clave" });

  let entrada: {
    texto?: string; imagen?: string; mime?: string; categorias?: string[]; hoy?: string;
    pregunta?: string; historial?: { rol?: string; texto?: string }[]; contexto?: unknown;
  };
  try { entrada = await req.json(); } catch { return responder(400, { error: "JSON inválido" }); }

  if (typeof entrada.pregunta === "string") return conversar(clave, entrada);

  const texto = (entrada.texto || "").slice(0, 500).trim();
  const imagen = entrada.imagen || "";
  if (!texto && !imagen) return responder(400, { error: "Falta texto o imagen" });
  if (imagen.length > 6_000_000) return responder(413, { error: "La foto es muy grande" });
  const mime = /^image\/(jpeg|png|webp)$/.test(entrada.mime || "") ? entrada.mime! : "image/jpeg";
  const categorias = Array.isArray(entrada.categorias) && entrada.categorias.length
    ? entrada.categorias.filter((c) => typeof c === "string").slice(0, 40).map((c) => c.slice(0, 40))
    : CATEGORIAS_BASE;

  const instrucciones = `Eres el asistente de NOVA, una app colombiana de finanzas personales.
Convierte lo que te dan (una frase escrita o dictada, o la foto de un recibo) en UN movimiento de dinero.
Reglas:
- Moneda: pesos colombianos (COP), sin decimales. "mil", "k", "lucas" = ×1.000; "millón", "palo" = ×1.000.000. En recibos "30.000" es treinta mil.
- En un recibo usa el TOTAL pagado (no subtotal, IVA, efectivo recibido ni cambio). La descripción es el nombre del negocio.
- tipo: "ingreso" si recibió dinero (salario, le pagaron, vendió, le consignaron); si no, "gasto".
- categoria: exactamente una de: ${categorias.join(", ")}.
- descripcion: corta (máx. 40 caracteres), en español, con mayúscula inicial, sin el valor.
- etiquetas: palabras que vengan con # en la frase (sin el #, en minúscula); si no hay, lista vacía.
- dia: "hoy", "ayer" o "anteayer" según la frase; para recibos usa "hoy".
- Si no hay un valor claro, monto = 0.
Hoy es ${entrada.hoy || new Date().toISOString().slice(0, 10)}.`;

  const partes: unknown[] = [];
  if (texto) partes.push({ text: texto });
  if (imagen) partes.push({ inline_data: { mime_type: mime, data: imagen } });

  const cuerpo = {
    systemInstruction: { parts: [{ text: instrucciones }] },
    contents: [{ role: "user", parts: partes }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING", enum: ["gasto", "ingreso"] },
          monto: { type: "NUMBER" },
          descripcion: { type: "STRING" },
          categoria: { type: "STRING", enum: categorias },
          etiquetas: { type: "ARRAY", items: { type: "STRING" } },
          dia: { type: "STRING", enum: ["hoy", "ayer", "anteayer"] },
        },
        required: ["tipo", "monto", "descripcion", "categoria", "etiquetas", "dia"],
      },
    },
  };

  let r: Response;
  try {
    r = await llamarGemini(clave, cuerpo);
  } catch (_e) {
    return responder(502, { error: "No se pudo contactar a la IA" });
  }
  if (r.status === 429) return responder(429, { error: "limite" });
  if (!r.ok) {
    console.error("Gemini", r.status, (await r.text()).slice(0, 500));
    return responder(502, { error: "La IA no respondió bien" });
  }

  try {
    const datos = await r.json();
    const salida = JSON.parse(datos.candidates[0].content.parts[0].text);
    const monto = Math.round(Number(salida.monto) || 0);
    return responder(200, {
      tipo: salida.tipo === "ingreso" ? "ingreso" : "gasto",
      monto: monto > 0 && monto < 10_000_000_000 ? monto : 0,
      descripcion: String(salida.descripcion || "").slice(0, 60),
      categoria: categorias.includes(salida.categoria) ? salida.categoria : (salida.tipo === "ingreso" ? "Otros ingresos" : "Otros gastos"),
      etiquetas: Array.isArray(salida.etiquetas) ? salida.etiquetas.map((e: unknown) => String(e).toLowerCase().replace(/^#/, "").slice(0, 30)).slice(0, 10) : [],
      dia: ["hoy", "ayer", "anteayer"].includes(salida.dia) ? salida.dia : "hoy",
    });
  } catch (_e) {
    return responder(502, { error: "La IA respondió algo que no se entendió" });
  }
});
