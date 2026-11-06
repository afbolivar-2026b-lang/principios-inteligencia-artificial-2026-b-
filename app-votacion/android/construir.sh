#!/usr/bin/env bash
# © Opita Digital — Todos los derechos reservados.
# Construye la APK de Android de la app de campaña (sin Gradle).
#
# Uso:
#   android/construir.sh --version-code 2 --version-name 1.1 \
#       [--nombre "Neiva Primero"] [--url https://www.sucampana.com] [--notas "Qué cambió"]
#
# Requiere: Java 17+, Android SDK (build-tools 34 y platforms android-34).
# La firma se guarda en android/firma/ (NO la suba a GitHub y guarde una copia):
# sin ella no se pueden publicar actualizaciones de la misma app.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
SDK="${ANDROID_HOME:-/opt/android-sdk}"
BT="$SDK/build-tools/34.0.0"
# d8 de cmdline-tools es más nuevo y compatible con Java 17/21
D8="$SDK/cmdline-tools/latest/bin/d8"; [ -x "$D8" ] || D8="$BT/d8"
JAR="$SDK/platforms/android-34/android.jar"

VCODE=1; VNAME="1.0"; NOMBRE="Campaña"; URL=""; NOTAS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --version-code) VCODE="$2"; shift 2 ;;
    --version-name) VNAME="$2"; shift 2 ;;
    --nombre) NOMBRE="$2"; shift 2 ;;
    --url) URL="$2"; shift 2 ;;
    --notas) NOTAS="$2"; shift 2 ;;
    *) echo "Opción desconocida: $1"; exit 1 ;;
  esac
done
[ -f "$JAR" ] || { echo "No se encontró el Android SDK en $SDK"; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp -r "$DIR/res" "$TMP/res"
esc() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e "s/'/\\\\'/g" -e 's/"/\\"/g'; }
cat > "$TMP/res/values/strings.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$(esc "$NOMBRE")</string>
    <string name="url_inicial">$(esc "$URL")</string>
</resources>
XML

echo "1/5 Recursos…"
"$BT/aapt2" compile --dir "$TMP/res" -o "$TMP/res.zip"
mkdir -p "$TMP/gen" "$TMP/clases" "$TMP/dex"
"$BT/aapt2" link -I "$JAR" --manifest "$DIR/AndroidManifest.xml" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VCODE" --version-name "$VNAME" \
  --java "$TMP/gen" -o "$TMP/base.apk" "$TMP/res.zip"

echo "2/5 Compilando Java…"
if ! javac -nowarn -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -d "$TMP/clases" \
  $(find "$TMP/gen" "$DIR/src" -name '*.java') > "$TMP/javac.log" 2>&1; then
  grep -v -E '^Picked up|warning: \[options\]|^[0-9]+ warnings?$' "$TMP/javac.log"; echo "Error al compilar"; exit 1
fi

echo "3/5 Convirtiendo a DEX…"
find "$TMP/clases" -name '*.class' > "$TMP/clases.txt"
"$D8" --min-api 24 --lib "$JAR" --output "$TMP/dex" @"$TMP/clases.txt"
[ -s "$TMP/dex/classes.dex" ] || { echo "Error: no se generó classes.dex"; exit 1; }
( cd "$TMP/dex" && if command -v zip >/dev/null; then zip -q "$TMP/base.apk" classes.dex; else jar uf "$TMP/base.apk" classes.dex; fi )

echo "4/5 Alineando y firmando…"
"$BT/zipalign" -f 4 "$TMP/base.apk" "$TMP/alineada.apk"
FIRMA="$DIR/firma"; mkdir -p "$FIRMA"
if [ ! -f "$FIRMA/opita-campana.jks" ]; then
  CLAVE="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
  printf '%s' "$CLAVE" > "$FIRMA/clave.txt"; chmod 600 "$FIRMA/clave.txt"
  keytool -genkeypair -v -keystore "$FIRMA/opita-campana.jks" -alias opita -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$CLAVE" -keypass "$CLAVE" \
    -dname "CN=Opita Digital, O=Opita Digital, L=Neiva, C=CO" >/dev/null 2>&1
  echo "   Se creó una firma nueva en android/firma/. ¡Guarde una copia!"
fi
CLAVE="$(cat "$FIRMA/clave.txt")"
"$BT/apksigner" sign --ks "$FIRMA/opita-campana.jks" --ks-key-alias opita \
  --ks-pass "pass:$CLAVE" --key-pass "pass:$CLAVE" --out "$TMP/firmada.apk" "$TMP/alineada.apk"
"$BT/apksigner" verify "$TMP/firmada.apk"

echo "5/5 Publicando en public/descargas/…"
SALIDA="$DIR/../public/descargas"; mkdir -p "$SALIDA"
cp "$TMP/firmada.apk" "$SALIDA/campana.apk"
node -e '
const [codigo, nombre, notas, bytes] = process.argv.slice(1);
const v = { versionCode: Number(codigo), versionName: nombre, notas, fecha: new Date().toISOString(), bytes: Number(bytes) };
require("fs").writeFileSync(process.argv[5], JSON.stringify(v, null, 2) + "\n");
' "$VCODE" "$VNAME" "$NOTAS" "$(wc -c < "$SALIDA/campana.apk")" "$SALIDA/version.json"
echo "Listo: public/descargas/campana.apk (versión $VNAME, código $VCODE)"
