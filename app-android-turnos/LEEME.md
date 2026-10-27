# App de Android del control de turnos

La app es la misma página de `../control-turnos-guardia`, metida en una APK con Capacitor.

Para armar una versión nueva:

```bash
npm ci
node preparar.mjs
npx cap add android
rm -rf android/app/src/main/res/mipmap-anydpi-v26 && cp -r recursos/res/* android/app/src/main/res/
mkdir -p ~/.android && cp firma/debug.keystore ~/.android/debug.keystore   # misma firma = se actualiza sin desinstalar
cd android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../../control-turnos-guardia/descargas/ControlTurnos.apk
```

Sube `versionCode` y `versionName` en `android/app/build.gradle` en cada versión nueva.
