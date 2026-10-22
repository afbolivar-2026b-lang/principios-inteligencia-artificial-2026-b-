// Copia la página a www/ para meterla dentro de la app.
// Deja por fuera lo que solo sirve en Netlify (la misma APK, su página de descarga y la configuración).
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from "node:fs";
const ORIGEN = "../control-turnos-guardia", DESTINO = "www";
const FUERA = new Set(["descargas", "descargar.html", "netlify.toml", "firestore.rules", "LEEME.md"]);
rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO);
for (const f of readdirSync(ORIGEN)) {
  if (FUERA.has(f) || f.startsWith(".")) continue;
  cpSync(`${ORIGEN}/${f}`, `${DESTINO}/${f}`, { recursive: true });
}
if (!existsSync(`${DESTINO}/index.html`)) throw new Error("No se encontró index.html");
console.log("Página copiada en www/");
