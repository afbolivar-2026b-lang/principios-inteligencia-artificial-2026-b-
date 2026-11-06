// Copia la página a www/ para meterla dentro de la app.
// Deja por fuera lo que no es de la página (reglas, funciones, documentos y la misma APK).
import { cpSync, rmSync, mkdirSync, existsSync, readdirSync } from "node:fs";
const ORIGEN = "../sitio-andres-bolivar", DESTINO = "www";
const FUERA = new Set(["functions", "descargas", "firebase.json", "firestore.rules", "storage.rules", "LEEME.md", "1000-FUNCIONES.md", "PENDIENTES.md", ".firebaserc"]);
rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO);
for (const f of readdirSync(ORIGEN)) {
  if (FUERA.has(f) || f.startsWith(".")) continue;
  cpSync(`${ORIGEN}/${f}`, `${DESTINO}/${f}`, { recursive: true });
}
if (!existsSync(`${DESTINO}/index.html`)) throw new Error("No se encontró index.html");
console.log("Página copiada en www/");
