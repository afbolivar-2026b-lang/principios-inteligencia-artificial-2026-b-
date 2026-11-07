/* Crea video-datos.js para guia-video-completa.html a partir de la guía (docs/guia/guia-datos.js). */
const fs = require('fs'), path = require('path');
const GUIA = require('../guia/guia-datos.js');
const CAPS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brochure', 'funciones.json'), 'utf8'));
const DATA = GUIA.map(c => ({
  titulo: c.titulo, intro: c.intro, pasos: c.pasos,
  imgs: c.imgs.map(i => i[0]), imgsCap: c.grupo === 'Probador 3D' ? ['Prenda en 3D', 'Tela real en 3D', 'Lupa sobre la tela'] : c.imgs.map(i => i[1]),
  seq: c.grupo === 'Probador 3D' ? ['prenda', 'tela', 'lupa'] : undefined,
  fx: CAPS[c.grupo].map(f => [f, c.fx[f]])
}));
fs.writeFileSync(path.join(__dirname, 'video-datos.js'), '/* Generado por generar-datos-video.js */\nwindow.DATA = ' + JSON.stringify(DATA, null, 1) + ';\n');
console.log('capítulos', DATA.length, 'pasos', DATA.reduce((s, c) => s + c.pasos.length, 0), 'funciones', DATA.reduce((s, c) => s + c.fx.length, 0));
