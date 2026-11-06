/*!
 * © Opita Digital — Todos los derechos reservados.
 * Generador mínimo de PDF (sin librerías) y reporte de la campaña:
 * resumen con indicadores y gráficas, y el listado de personas registradas.
 */
'use strict';

// ---------- Motor PDF ----------
const ANCHOS = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584]; // Helvetica, caracteres 32–126

const WIN_ANSI = { '–': 0x96, '—': 0x97, '•': 0x95, '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92, '…': 0x85, '€': 0x80 };
const BASE = (ch) => ch.normalize('NFD')[0];

function aWinAnsi(texto) {
  const bytes = [];
  for (const ch of String(texto)) {
    const c = ch.codePointAt(0);
    if (WIN_ANSI[ch]) bytes.push(WIN_ANSI[ch]);
    else if (c >= 32 && c <= 255) bytes.push(c);
    else if (c > 255) {
      const b = BASE(ch).codePointAt(0);
      bytes.push(b < 256 ? b : 63);
    }
  }
  return bytes;
}

const FUENTES = { normal: 'F1', negrita: 'F2', serif: 'F3', serifNegrita: 'F4', serifCursiva: 'F5' };
const FACTOR = { F1: 1, F2: 1.06, F3: 0.93, F4: 0.98, F5: 0.9 };

function anchoTexto(texto, tam, fuente = 'F1') {
  let w = 0;
  for (const ch of String(texto)) {
    const b = BASE(ch).codePointAt(0);
    w += b >= 32 && b <= 126 ? ANCHOS[b - 32] : 556;
  }
  return (w / 1000) * tam * (FACTOR[fuente] || 1);
}

function recortar(texto, ancho, tam, fuente) {
  let t = String(texto ?? '');
  if (anchoTexto(t, tam, fuente) <= ancho) return t;
  while (t.length > 1 && anchoTexto(`${t}…`, tam, fuente) > ancho) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => v.toFixed(3)).join(' ');
};

class Documento {
  constructor(ancho = 595.28, alto = 841.89) {
    this.W = ancho;
    this.H = alto;
    this.paginas = [];
  }

  nuevaPagina() {
    this.ops = [];
    this.paginas.push(this.ops);
    return this;
  }

  // Coordenadas desde la esquina superior izquierda
  rect(x, y, w, h, { relleno, borde, grosor = 0.6 } = {}) {
    const p = `${x.toFixed(2)} ${(this.H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`;
    if (relleno && borde) this.ops.push(`${hex(relleno)} rg ${hex(borde)} RG ${grosor} w ${p} B`);
    else if (relleno) this.ops.push(`${hex(relleno)} rg ${p} f`);
    else if (borde) this.ops.push(`${hex(borde)} RG ${grosor} w ${p} S`);
  }

  linea(x1, y1, x2, y2, { color = '#E4DCCB', grosor = 0.6 } = {}) {
    this.ops.push(`${hex(color)} RG ${grosor} w ${x1.toFixed(2)} ${(this.H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.H - y2).toFixed(2)} l S`);
  }

  texto(x, y, contenido, { tam = 10, fuente = 'normal', color = '#1F2937', alinear = 'izq', ancho, rotar = 0 } = {}) {
    const f = FUENTES[fuente] || fuente;
    let t = String(contenido ?? '');
    if (ancho) t = recortar(t, ancho, tam, f);
    const w = anchoTexto(t, tam, f);
    let xx = x;
    if (alinear === 'der') xx = x - w;
    else if (alinear === 'centro') xx = x - w / 2;
    const bytes = aWinAnsi(t).map((b) => {
      const c = String.fromCharCode(b);
      return c === '(' || c === ')' || c === '\\' ? `\\${c}` : b < 32 || b > 126 ? `\\${b.toString(8).padStart(3, '0')}` : c;
    }).join('');
    const yy = this.H - y;
    const matriz = rotar
      ? `${Math.cos(rotar).toFixed(4)} ${Math.sin(rotar).toFixed(4)} ${(-Math.sin(rotar)).toFixed(4)} ${Math.cos(rotar).toFixed(4)} ${xx.toFixed(2)} ${yy.toFixed(2)} Tm`
      : `1 0 0 1 ${xx.toFixed(2)} ${yy.toFixed(2)} Tm`;
    this.ops.push(`BT ${hex(color)} rg /${f} ${tam} Tf ${matriz} (${bytes}) Tj ET`);
    return w;
  }

  guardar(metadatos = {}) {
    const objetos = [];
    const agregar = (contenido) => { objetos.push(contenido); return objetos.length; };
    const fuentes = {
      F1: 'Helvetica', F2: 'Helvetica-Bold', F3: 'Times-Roman', F4: 'Times-Bold', F5: 'Times-Italic',
    };
    const idsFuentes = Object.entries(fuentes).map(([k, base]) =>
      [k, agregar(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`)]);
    const recursos = `<< /Font << ${idsFuentes.map(([k, id]) => `/${k} ${id} 0 R`).join(' ')} >> >>`;
    const idPaginas = objetos.length + 1 + this.paginas.length * 2;
    const idsPagina = [];
    for (const ops of this.paginas) {
      const flujo = Buffer.from(ops.join('\n'), 'latin1');
      const idContenido = agregar(`<< /Length ${flujo.length} >>\nstream\n${flujo.toString('latin1')}\nendstream`);
      idsPagina.push(agregar(`<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources ${recursos} /Contents ${idContenido} 0 R >>`));
    }
    agregar(`<< /Type /Pages /Kids [${idsPagina.map((i) => `${i} 0 R`).join(' ')}] /Count ${idsPagina.length} >>`);
    const idCatalogo = agregar(`<< /Type /Catalog /Pages ${idPaginas} 0 R >>`);
    const lit = (t) => `(${aWinAnsi(t).map((b) => { const c = String.fromCharCode(b); return '()\\'.includes(c) ? `\\${c}` : b > 126 ? `\\${b.toString(8)}` : c; }).join('')})`;
    const idInfo = agregar(`<< /Title ${lit(metadatos.titulo || 'Reporte')} /Author ${lit('Opita Digital')} /Creator ${lit('Opita Digital')} /Producer ${lit('Opita Digital')} >>`);

    let salida = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objetos.forEach((o, i) => {
      offsets.push(Buffer.byteLength(salida, 'latin1'));
      salida += `${i + 1} 0 obj\n${o}\nendobj\n`;
    });
    const xref = Buffer.byteLength(salida, 'latin1');
    salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    salida += `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(salida, 'latin1');
  }
}

// ---------- Reporte de la campaña ----------
const C = {
  noche: '#0E1B2C', oro: '#C9A45C', oroOscuro: '#9C7A35', marfil: '#FAF6EE', linea: '#E4DCCB',
  tinta: '#1F2937', tenue: '#7B8290', dato: '#2A5C9E', blanco: '#FFFFFF', marca: '#EFEBE3',
};
const SERIES = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100'];
const fmt = new Intl.NumberFormat('es-CO');

function topeBonito(max) {
  if (max <= 4) return 4;
  const paso = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * paso >= max) return m * paso;
  return 10 * paso;
}

function marcaAgua(doc) {
  doc.texto(120, 560, 'OPITA DIGITAL', { tam: 64, fuente: 'negrita', color: '#F4F1EA', rotar: Math.PI / 6 });
}

function pie(doc, n, total) {
  doc.linea(40, doc.H - 34, doc.W - 40, doc.H - 34, { color: C.linea });
  doc.texto(40, doc.H - 22, 'Desarrollado por Opita Digital · © Todos los derechos reservados', { tam: 7, color: '#A7ABB3' });
  doc.texto(doc.W - 40, doc.H - 22, `Página ${n} de ${total}`, { tam: 7, color: '#A7ABB3', alinear: 'der' });
}

function bloque(doc, x, y, w, h, titulo, subtitulo) {
  doc.rect(x, y, w, h, { relleno: C.blanco, borde: C.linea });
  doc.texto(x + 12, y + 20, titulo, { tam: 11, fuente: 'serifNegrita', color: C.noche });
  if (subtitulo) doc.texto(x + w - 12, y + 19, subtitulo.toUpperCase(), { tam: 6.5, fuente: 'negrita', color: C.tenue, alinear: 'der' });
}

function columnas(doc, x, y, w, h, datos, { color = C.dato, valores = false, cadaEtiqueta = 1 } = {}) {
  const max = topeBonito(Math.max(1, ...datos.map((d) => d.valor)));
  const izq = 22; const abajo = 14;
  const aw = w - izq; const ah = h - abajo - (valores ? 10 : 0);
  const y0 = y + h - abajo;
  for (const t of [0, max / 2, max]) {
    const yy = y0 - (t / max) * ah;
    if (t) doc.linea(x + izq, yy, x + w, yy, { color: '#EEE8DC', grosor: 0.5 });
    doc.texto(x + izq - 4, yy + 2.5, fmt.format(t), { tam: 6, color: C.tenue, alinear: 'der' });
  }
  const banda = aw / datos.length;
  const ancho = Math.max(1.5, banda * 0.72);
  datos.forEach((d, i) => {
    const bh = (d.valor / max) * ah;
    const bx = x + izq + i * banda + (banda - ancho) / 2;
    if (bh > 0) doc.rect(bx, y0 - bh, ancho, bh, { relleno: color });
    if (valores && d.valor) doc.texto(bx + ancho / 2, y0 - bh - 3, fmt.format(d.valor), { tam: 6.5, fuente: 'negrita', color: '#3B4759', alinear: 'centro' });
    if (i % cadaEtiqueta === 0 || i === datos.length - 1) {
      doc.texto(bx + ancho / 2, y0 + 9, d.etiqueta, { tam: 6, color: C.tenue, alinear: 'centro' });
    }
  });
  doc.linea(x + izq, y0, x + w, y0, { color: '#9AA0AA', grosor: 0.6 });
}

function barrasH(doc, x, y, w, datos, { color = C.dato, alto = 15, etiqueta = 70 } = {}) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  datos.forEach((d, i) => {
    const yy = y + i * alto;
    doc.texto(x, yy + 8, d.etiqueta, { tam: 7.5, color: C.tinta, ancho: etiqueta - 6 });
    const bw = ((w - etiqueta - 26) * d.valor) / max;
    doc.rect(x + etiqueta, yy + 1.5, w - etiqueta - 26, alto - 6, { relleno: '#F1ECE2' });
    if (bw > 0) doc.rect(x + etiqueta, yy + 1.5, bw, alto - 6, { relleno: color });
    doc.texto(x + w, yy + 8, fmt.format(d.valor), { tam: 7.5, fuente: 'negrita', color: C.tinta, alinear: 'der' });
  });
}

/**
 * datos: { nombre, candidato, filtroTexto, stats (de registros.estadisticas), lista (registros), encuesta, generado }
 */
function crearReportePDF(datos) {
  const doc = new Documento();
  const { stats: s } = datos;
  const M = 40;
  const W = doc.W - M * 2;

  // ===== Página 1: resumen =====
  doc.nuevaPagina();
  marcaAgua(doc);
  doc.rect(0, 0, doc.W, 118, { relleno: C.noche });
  doc.rect(M, 0, 60, 2, { relleno: C.oro });
  doc.texto(M, 34, 'REPORTE DE CAMPAÑA', { tam: 7.5, fuente: 'negrita', color: C.oro });
  doc.texto(M, 68, datos.nombre || 'Campaña', { tam: 28, fuente: 'serif', color: '#F4EFE6', ancho: W - 150 });
  if (datos.candidato) doc.texto(M, 88, datos.candidato, { tam: 11, fuente: 'serifCursiva', color: C.oro });
  doc.texto(M, 106, `Generado el ${datos.generado} · ${datos.filtroTexto}`, { tam: 7.5, color: '#A9B1BF', ancho: W });
  doc.texto(doc.W - M, 68, fmt.format(s.total), { tam: 30, fuente: 'serif', color: C.oro, alinear: 'der' });
  doc.texto(doc.W - M, 84, 'PERSONAS REGISTRADAS', { tam: 6.5, fuente: 'negrita', color: '#A9B1BF', alinear: 'der' });

  // Indicadores
  const crec = s.semanaAnterior > 0 ? Math.round(((s.semana - s.semanaAnterior) / s.semanaAnterior) * 100) : null;
  const kpis = [
    ['En el periodo', fmt.format(s.enPeriodo), 'nuevas personas'],
    ['Hoy', fmt.format(s.hoy), 'registros'],
    ['Últimos 7 días', fmt.format(s.semana), 'registros'],
    ['Crecimiento semanal', crec === null ? '—' : `${crec > 0 ? '+' : ''}${crec}%`, 'vs. semana anterior'],
    ['Edad promedio', s.edadPromedio ?? '—', 'años'],
    ['Comunas', fmt.format(s.totalComunas), 'con presencia'],
    ['Barrios', fmt.format(s.totalBarrios), 'alcanzados'],
    ['Votos en encuestas', fmt.format(datos.votos || 0), 'en total'],
  ];
  const kw = W / 4; const kh = 54; let y = 134;
  kpis.forEach(([t, v, n], i) => {
    const x = M + (i % 4) * kw; const yy = y + Math.floor(i / 4) * (kh + 8);
    doc.rect(x + 3, yy, kw - 6, kh, { relleno: C.marfil, borde: C.linea });
    doc.texto(x + 13, yy + 15, t.toUpperCase(), { tam: 6.5, fuente: 'negrita', color: C.tenue, ancho: kw - 26 });
    doc.texto(x + 13, yy + 38, String(v), { tam: 19, fuente: 'serifNegrita', color: C.noche });
    doc.texto(x + 13, yy + 48, n, { tam: 6.5, color: C.tenue });
  });
  y += kh * 2 + 24;

  // Registros por día
  const porDia = s.porDia.map((d) => ({ etiqueta: String(Number(d.fecha.slice(8))), valor: d.total }));
  bloque(doc, M, y, W, 150, 'Registros por día', `${s.porDia.length} días`);
  columnas(doc, M + 12, y + 32, W - 24, 106, porDia, { cadaEtiqueta: Math.max(1, Math.ceil(porDia.length / 15)) });
  y += 162;

  // Comunas y edades
  const mitad = (W - 12) / 2;
  const comunas = s.comunas.slice(0, 8).map((c) => ({ etiqueta: c.nombre, valor: c.total }));
  bloque(doc, M, y, mitad, 160, 'Por comuna', 'personas');
  if (comunas.length) barrasH(doc, M + 12, y + 32, mitad - 24, comunas, { alto: 15 });
  else doc.texto(M + 12, y + 60, 'Sin datos', { tam: 8, color: C.tenue });
  bloque(doc, M + mitad + 12, y, mitad, 160, 'Por edad', 'años');
  columnas(doc, M + mitad + 24, y + 34, mitad - 24, 114, s.edades.map((e) => ({ etiqueta: e.rango, valor: e.total })), { valores: true });
  y += 172;

  // Semana, hora y barrios
  const tercio = (W - 24) / 3;
  bloque(doc, M, y, tercio, 150, 'Día de la semana');
  columnas(doc, M + 10, y + 34, tercio - 20, 104, s.porSemana.map((d) => ({ etiqueta: d.dia, valor: d.total })), { valores: true });
  bloque(doc, M + tercio + 12, y, tercio, 150, 'Hora del registro');
  const franjas = [['Mañana', s.porHora[1].total], ['Tarde', s.porHora[2].total], ['Noche', s.porHora[3].total], ['Madrugada', s.porHora[0].total]];
  const totalHora = franjas.reduce((a, f) => a + f[1], 0) || 1;
  franjas.forEach(([n, v], i) => {
    const yy = y + 40 + i * 26;
    const x = M + tercio + 24;
    doc.rect(x, yy, 8, 8, { relleno: SERIES[i] });
    doc.texto(x + 14, yy + 7, n, { tam: 8, color: C.tinta });
    doc.texto(x + tercio - 36, yy + 7, `${Math.round((v / totalHora) * 100)}%`, { tam: 8, fuente: 'negrita', color: C.tinta, alinear: 'der' });
    doc.rect(x, yy + 12, tercio - 36, 4, { relleno: '#F1ECE2' });
    doc.rect(x, yy + 12, ((tercio - 36) * v) / totalHora, 4, { relleno: SERIES[i] });
  });
  bloque(doc, M + (tercio + 12) * 2, y, tercio, 150, 'Barrios más fuertes');
  const barrios = s.barrios.slice(0, 7).map((b) => ({ etiqueta: b.nombre, valor: b.total }));
  if (barrios.length) barrasH(doc, M + (tercio + 12) * 2 + 10, y + 32, tercio - 20, barrios, { color: C.oroOscuro, alto: 15, etiqueta: 62 });

  // ===== Páginas siguientes: listado =====
  const lista = datos.lista;
  const cols = [
    ['#', 20, 'der'], ['Nombre completo', 120], ['Cédula', 62], ['Edad', 26, 'der'], ['Teléfono', 60],
    ['Barrio', 86], ['Comuna', 62], ['Fecha', 79],
  ];
  const porPagina = 40;
  const paginasLista = Math.max(1, Math.ceil(lista.length / porPagina));
  for (let p = 0; p < paginasLista; p++) {
    doc.nuevaPagina();
    marcaAgua(doc);
    doc.texto(M, 46, 'Listado de personas registradas', { tam: 16, fuente: 'serif', color: C.noche });
    doc.texto(M, 60, `${fmt.format(lista.length)} personas · ${datos.filtroTexto}`, { tam: 7.5, color: C.tenue, ancho: W });
    let yy = 74;
    doc.rect(M, yy, W, 18, { relleno: C.noche });
    let x = M;
    for (const [t, w, al] of cols) {
      doc.texto(al === 'der' ? x + w - 6 : x + 6, yy + 12, t.toUpperCase(), { tam: 6.5, fuente: 'negrita', color: '#F4EFE6', alinear: al === 'der' ? 'der' : 'izq' });
      x += w;
    }
    yy += 18;
    const pagina = lista.slice(p * porPagina, (p + 1) * porPagina);
    if (!pagina.length) doc.texto(M + 6, yy + 16, 'No hay registros con estos filtros.', { tam: 8, color: C.tenue });
    pagina.forEach((r, i) => {
      if (i % 2) doc.rect(M, yy, W, 16, { relleno: '#FBF8F2' });
      const fecha = new Date(r.fecha).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: '2-digit', month: 'short', year: 'numeric' });
      const valores = [String(p * porPagina + i + 1), `${r.nombre} ${r.apellido}`, fmt.format(Number(r.cedula)), String(r.edad), r.telefono, r.barrio, r.comuna, fecha];
      let cx = M;
      cols.forEach(([, w, al], k) => {
        doc.texto(al === 'der' ? cx + w - 6 : cx + 6, yy + 11, valores[k], { tam: 7.5, color: k === 1 ? C.noche : C.tinta, fuente: k === 1 ? 'negrita' : 'normal', alinear: al === 'der' ? 'der' : 'izq', ancho: w - 10 });
        cx += w;
      });
      doc.linea(M, yy + 16, M + W, yy + 16, { color: '#EFE9DD', grosor: 0.4 });
      yy += 16;
    });
  }

  const total = doc.paginas.length;
  doc.paginas.forEach((ops, i) => { doc.ops = ops; pie(doc, i + 1, total); });
  return doc.guardar({ titulo: `Reporte de campaña · ${datos.nombre || ''}` });
}

module.exports = { crearReportePDF, Documento };
