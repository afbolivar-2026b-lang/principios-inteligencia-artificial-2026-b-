/* Renderiza guia-video.html cuadro a cuadro (30 fps) y lo codifica con ffmpeg. Uso: node renderizar.js salida.mp4 [desde] [hasta].
   Sirva una carpeta con guia-video.html, capturas/, f3d/ (cuadros del 3D) y pdf/ (páginas de la guía) en http://localhost:8766. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const [OUT, FROM, TO] = [process.argv[2], +(process.argv[3] || 0), process.argv[4] ? +process.argv[4] : null];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/guia-video.html'); await p.evaluate(() => preload());
  const D = await p.evaluate(() => DURATION);
  const end = TO ?? D, fps = 30, n0 = Math.round(FROM * fps), n1 = Math.round(end * fps);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = n0; i < n1; i++) {
    await p.evaluate(t => { renderAt(t); return Promise.all([...document.images].filter(im => im.offsetParent && !im.complete).map(im => im.decode().catch(() => {}))); }, i / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log('cuadro', i, 'de', n1, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('DURATION', D, 'errores', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
