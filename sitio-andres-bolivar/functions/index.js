/* Asistente de Mi oficina.
   La clave de Anthropic queda guardada como secreto de Firebase y nunca llega al navegador.
   Solo responde al dueño de la cuenta (CORREO_DUENO). */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import Anthropic from "@anthropic-ai/sdk";
import { betaJSONSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/beta/json-schema";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const CORREO_DUENO = defineString("CORREO_DUENO");

initializeApp();

const SISTEMA = `Usted es el asistente de negocio de Andrés Felipe Bolívar, desarrollador de Neiva (Huila, Colombia) que hace páginas web, sistemas a la medida y apps para negocios pequeños de la región: tiendas, parqueaderos, fincas, empresas de vigilancia, veterinarias.

Su trabajo:
- Recomendar acciones concretas para conseguir y cerrar clientes, usando los datos de "Mi oficina" que vienen en el contexto.
- Sugerir precios en pesos colombianos (COP) para páginas y sistemas. Dé siempre un rango (mínimo, recomendado y máximo), explique de qué depende y cuánto cobrar de soporte mensual. Tome como punto de partida las tarifas de Andrés que vienen en el contexto, y aclare que son estimaciones para que él decida.
- Redactar mensajes de WhatsApp, textos de propuestas y descripciones de proyectos para su portafolio.

Escriba en español de Colombia, trate a Andrés de "usted", sea breve y práctico, y use listas cortas cuando ayuden. No invente datos de clientes que no estén en el contexto.`;

// Lo que la IA devuelve al analizar los archivos de un proyecto
const FICHA = betaJSONSchemaOutputFormat({
  type: "object",
  properties: {
    titulo: { type: "string", description: "Nombre corto y atractivo del proyecto para el portafolio" },
    sector: { type: "string", description: "Para quién es, empezando por 'Para', ej.: 'Para tiendas'" },
    descripcion: { type: "string", description: "2 o 3 frases: qué hace y qué problema le resolvió al cliente" },
    funciones: { type: "array", items: { type: "string" }, description: "De 3 a 6 funciones principales, cortas" },
    tipo: { type: "string", enum: ["landing", "catalogo", "sistema", "app"] },
    modulos: { type: "array", items: { type: "string", enum: ["inventario", "ventas", "fiados", "clientes", "roles", "reportes", "facturacion", "turnos", "catalogoWa", "sincro", "offline", "migracion", "dominio", "playstore", "msstore"] } },
    precioMinimo: { type: "integer", description: "En pesos colombianos" },
    precioRecomendado: { type: "integer", description: "En pesos colombianos" },
    precioMaximo: { type: "integer", description: "En pesos colombianos" },
    soporteMensual: { type: "integer", description: "En pesos colombianos" },
    semanas: { type: "integer" },
    explicacionPrecio: { type: "string", description: "Por qué ese precio, en 2 o 3 frases" },
    frasePortada: { type: "string", description: "Frase corta de máximo 8 palabras para la imagen de portada" },
    mensajeWhatsApp: { type: "string", description: "Mensaje corto para ofrecer un proyecto parecido a otros negocios" },
    escenas: { type: "array", items: { type: "string" }, description: "De 3 a 5 frases muy cortas (máximo 9 palabras) para el video de presentación, una por pantallazo, contando el antes y el después del negocio" },
  },
  required: ["titulo", "sector", "descripcion", "funciones", "tipo", "modulos", "precioMinimo", "precioRecomendado", "precioMaximo", "soporteMensual", "semanas", "explicacionPrecio", "frasePortada", "mensajeWhatsApp", "escenas"],
  additionalProperties: false,
});
const MAX_ARCHIVOS = 6;
const MAX_BASE64 = 6_000_000; // ~4,5 MB por archivo
const MEDIOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Convierte los archivos que manda la página en bloques que Claude entiende
function bloquesArchivos(archivos) {
  if (!Array.isArray(archivos) || !archivos.length) throw new Error("Suba al menos un archivo del proyecto.");
  if (archivos.length > MAX_ARCHIVOS) throw new Error(`Máximo ${MAX_ARCHIVOS} archivos por proyecto.`);
  return archivos.map((a) => {
    const nombre = String(a.nombre || "archivo").slice(0, 120);
    if (a.tipo === "texto") return { type: "text", text: `Archivo "${nombre}":\n${String(a.texto || "").slice(0, 60000)}` };
    const data = String(a.data || "");
    if (!data || data.length > MAX_BASE64) throw new Error(`El archivo "${nombre}" es muy grande.`);
    if (a.tipo === "pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
    if (a.tipo === "imagen" && MEDIOS.includes(a.media_type)) return { type: "image", source: { type: "base64", media_type: a.media_type, data } };
    throw new Error(`No se puede leer "${nombre}". Use fotos, PDF o archivos de texto.`);
  });
}

const MAX_MENSAJES = 20;
const MAX_CARACTERES = 6000;

export const asistente = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 300, memory: "1GiB" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }

    // 1. Solo el dueño puede usar el asistente
    const token = (req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let usuario;
    try { usuario = await getAuth().verifyIdToken(token); }
    catch { res.status(401).json({ error: "Inicie sesión de nuevo." }); return; }
    if (!usuario.email || usuario.email.toLowerCase() !== CORREO_DUENO.value().toLowerCase()) {
      res.status(403).json({ error: "Esta cuenta no tiene permiso para usar el asistente." }); return;
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const { modo, mensajes, contexto, archivos, notas } = req.body || {};

    // 2a. Analizar los archivos de un proyecto y devolver la ficha para publicarlo
    if (modo === "proyecto") {
      let bloques;
      try { bloques = bloquesArchivos(archivos); } catch (e) { res.status(400).json({ error: e.message }); return; }
      try {
        const respuesta = await client.beta.messages.parse({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          output_config: { effort: "medium", format: FICHA },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: [
            { type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } },
            { type: "text", text: "Datos actuales de Mi oficina:\n" + String(contexto || "Sin datos.").slice(0, 20000) },
          ],
          messages: [{ role: "user", content: [
            ...bloques,
            { type: "text", text: "Estos son los archivos de un proyecto que Andrés ya entregó. Prepare la ficha para publicarlo en su portafolio, las frases del video de presentación, y sugiera cuánto cobrar por un proyecto así, usando sus tarifas como base. Algunas imágenes pueden ser fotos tomadas de un video del proyecto." + (notas ? "\n\nNotas de Andrés: " + String(notas).slice(0, 3000) : "") },
          ] }],
        });
        if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) {
          res.status(422).json({ error: "La IA no pudo preparar la ficha con esos archivos. Pruebe con otros pantallazos." }); return;
        }
        res.json({ ficha: respuesta.parsed_output });
      } catch (error) { responderError(res, error); }
      return;
    }

    // 2b. Chat: validar lo que llega
    if (!Array.isArray(mensajes) || !mensajes.length) { res.status(400).json({ error: "Escriba una pregunta." }); return; }
    const historial = mensajes.slice(-MAX_MENSAJES)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
    if (!historial.length || historial[0].role !== "user" || historial[historial.length - 1].role !== "user") {
      res.status(400).json({ error: "La conversación no es válida." }); return;
    }

    // 3. Preguntarle a Claude
    try {
      const respuesta = await client.beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        output_config: { effort: "medium" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [
          { type: "text", text: SISTEMA, cache_control: { type: "ephemeral" } },
          { type: "text", text: "Datos actuales de Mi oficina:\n" + String(contexto || "Sin datos.").slice(0, 20000) },
        ],
        messages: historial,
      });
      if (respuesta.stop_reason === "refusal") {
        res.json({ texto: "No puedo ayudar con esa solicitud. Intente preguntarlo de otra forma." }); return;
      }
      const texto = respuesta.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      res.json({ texto: texto || "No obtuve respuesta. Intente de nuevo." });
    } catch (error) { responderError(res, error); }
  },
);

function responderError(res, error) {
  console.error(error);
  if (error instanceof Anthropic.BadRequestError) res.status(400).json({ error: "La IA no pudo leer esos archivos. Pruebe con fotos más pequeñas o menos archivos." });
  else if (error instanceof Anthropic.AuthenticationError) res.status(500).json({ error: "La clave de Anthropic no es válida. Revise el secreto ANTHROPIC_API_KEY." });
  else if (error instanceof Anthropic.RateLimitError) res.status(429).json({ error: "Muchas preguntas seguidas. Espere un minuto." });
  else if (error instanceof Anthropic.APIError) res.status(502).json({ error: "El asistente no está disponible ahora. Intente más tarde." });
  else res.status(500).json({ error: "Ocurrió un error inesperado." });
}
