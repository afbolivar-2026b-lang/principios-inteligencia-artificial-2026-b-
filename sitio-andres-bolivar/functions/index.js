/* Asistente de Mi oficina.
   La clave de Anthropic queda guardada como secreto de Firebase y nunca llega al navegador.
   Solo responde al dueño de la cuenta (CORREO_DUENO). */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const CORREO_DUENO = defineString("CORREO_DUENO");

initializeApp();

const SISTEMA = `Usted es el asistente de negocio de Andrés Felipe Bolívar, desarrollador de Neiva (Huila, Colombia) que hace páginas web, sistemas a la medida y apps para negocios pequeños de la región: tiendas, parqueaderos, fincas, empresas de vigilancia, veterinarias.

Su trabajo:
- Recomendar acciones concretas para conseguir y cerrar clientes, usando los datos de "Mi oficina" que vienen en el contexto.
- Sugerir precios en pesos colombianos (COP) para páginas y sistemas. Dé siempre un rango (mínimo, recomendado y máximo), explique de qué depende y cuánto cobrar de soporte mensual. Tome como punto de partida las tarifas de Andrés que vienen en el contexto, y aclare que son estimaciones para que él decida.
- Redactar mensajes de WhatsApp, textos de propuestas y descripciones de proyectos para su portafolio.

Escriba en español de Colombia, trate a Andrés de "usted", sea breve y práctico, y use listas cortas cuando ayuden. No invente datos de clientes que no estén en el contexto.`;

const MAX_MENSAJES = 20;
const MAX_CARACTERES = 6000;

export const asistente = onRequest(
  { secrets: [ANTHROPIC_API_KEY], cors: true, timeoutSeconds: 300, memory: "512MiB" },
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

    // 2. Validar lo que llega
    const { mensajes, contexto } = req.body || {};
    if (!Array.isArray(mensajes) || !mensajes.length) { res.status(400).json({ error: "Escriba una pregunta." }); return; }
    const historial = mensajes.slice(-MAX_MENSAJES)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CARACTERES) }));
    if (!historial.length || historial[0].role !== "user" || historial[historial.length - 1].role !== "user") {
      res.status(400).json({ error: "La conversación no es válida." }); return;
    }

    // 3. Preguntarle a Claude
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
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
    } catch (error) {
      console.error(error);
      if (error instanceof Anthropic.AuthenticationError) res.status(500).json({ error: "La clave de Anthropic no es válida. Revise el secreto ANTHROPIC_API_KEY." });
      else if (error instanceof Anthropic.RateLimitError) res.status(429).json({ error: "Muchas preguntas seguidas. Espere un minuto." });
      else if (error instanceof Anthropic.APIError) res.status(502).json({ error: "El asistente no está disponible ahora. Intente más tarde." });
      else res.status(500).json({ error: "Ocurrió un error inesperado." });
    }
  },
);
