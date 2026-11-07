#!/usr/bin/env bash
# Arma el APK de Aurea Atelier sin Gradle: aapt2 + javac + d8 + zipalign + apksigner.
# Uso: ANDROID_SDK=/opt/android-sdk KEYSTORE=ruta.jks KS_PASS=clave ./build.sh 1.0.0 1
set -euo pipefail
cd "$(dirname "$0")"
VERSION="${1:?versión, por ejemplo 1.0.0}"; CODE="${2:?número de versión, por ejemplo 1}"
SDK="${ANDROID_SDK:-/opt/android-sdk}"; BT="$SDK/build-tools/35.0.0"; JAR="$SDK/platforms/android-34/android.jar"
OUT=build; rm -rf "$OUT"; mkdir -p "$OUT/obj" "$OUT/gen" "$OUT/dex"
sed -i "s/static final String VERSION = \"[^\"]*\"/static final String VERSION = \"$VERSION\"/" src/co/aurea/atelier/MainActivity.java
"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link -I "$JAR" --manifest AndroidManifest.xml -o "$OUT/base.apk" "$OUT/res.zip" \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "$CODE" --version-name "$VERSION" --java "$OUT/gen"
javac -nowarn -source 1.8 -target 1.8 -bootclasspath "$JAR" -Xlint:-options -d "$OUT/obj" $(find src "$OUT/gen" -name '*.java')
"$BT/d8" --min-api 24 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/obj" -name '*.class')
cp "$OUT/base.apk" "$OUT/sin-firma.apk"
(cd "$OUT/dex" && zip -q -j ../sin-firma.apk classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/sin-firma.apk" "$OUT/alineado.apk"
"$BT/apksigner" sign --ks "${KEYSTORE:?ruta del keystore}" --ks-pass "pass:${KS_PASS:?clave del keystore}" --v4-signing-enabled false --out ../descargas/aurea-atelier.apk "$OUT/alineado.apk"
"$BT/apksigner" verify --print-certs ../descargas/aurea-atelier.apk | head -3
rm -rf "$OUT"
echo "APK listo: descargas/aurea-atelier.apk ($VERSION)"
