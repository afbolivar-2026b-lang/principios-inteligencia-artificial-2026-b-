/* Descargas del dashboard: Excel con gráficas reales de Excel, íconos, logo y foto, y PDF con el mismo tablero. */

const DX_LIB = {
  zip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
};
const dxScript = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar la herramienta de descarga. Revise la conexión a internet.')); document.head.appendChild(s); });
// Paleta validada para tema claro (la misma de las gráficas del dashboard).
const DX_COL = ['A87A1E', '2A78D6', 'D4507F', '6250D6', '1BAF7A', '8A8A8A'];
const DX = { dark: '15120F', gold: 'C9A45C', soft: 'E3C98F', ink: '1A150C', cream: 'F7F1E6', muted: '7A6C52', line: 'E5DCCB' };
const DX_KPIS = [
  ['monto', 'Monto de ventas', '💰'], ['conv', 'Tasa de conversión', '🔄'], ['crec', 'Crecimiento de ventas', '📈'], ['sat', 'Índice de satisfacción', '⭐'],
  ['reclamos', 'Índice de reclamos', '⚠️'], ['cumpl', 'Cumplimiento de meta', '🎯'], ['ciclo', 'Tiempo de ciclo', '⏱️'], ['frec', 'Frecuencia de compra', '🔁']
];
const dxFoot = (k, S) => ({
  monto: `${S.kpi.ventas} ventas · IVA incluido`, conv: `${S.kpi.apr} de ${S.kpi.env} cotizaciones`, crec: `frente a ${S.PY}`, sat: `${S.kpi.encuestas} encuestas`,
  reclamos: `${S.kpi.nReclamos} reclamos`, cumpl: `Meta ${moneyTxt(S.kpi.metaPeriodo)}`, ciclo: 'días del pedido a la entrega', frec: `compras por cliente · ${S.kpi.clientes} clientes`
}[k]);

/* Conjunto más vendido del período, para la foto del maniquí. */
function dxFotoEstrella(S) {
  const units = {};
  S.ventas.forEach(x => units[x.productoId] = (units[x.productoId] || 0) + x.und);
  let o = {};
  Object.entries(units).sort((a, b) => b[1] - a[1]).forEach(([id]) => { const p = DB.find('productos', id); if (!p) return; const s = mqKind(p).slot; if (o[s] || (s === 'full' && (o.top || o.bottom)) || (['top', 'bottom'].includes(s) && o.full)) return; o[s] = id; });
  const f = typeof mqFoto === 'function' ? mqFoto(o).front : null;
  return { src: f || 'img/maniqui/p1-p5.jpg', items: mqItems ? mqItems(o).map(p => p.nombre) : [] };
}
async function dxDataURL(src) { const b = await (await fetch(src)).blob(); return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
function dxLogoPNG(size = 256, fondo = null) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); if (fondo) { x.fillStyle = fondo; x.fillRect(0, 0, size, size); } x.drawImage(img, 0, 0, size, size); res(c.toDataURL('image/png')); };
    img.onerror = () => res(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSVG(size).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  });
}
const dxB64 = (dataURL) => dataURL.split(',')[1];
const dxDownload = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); };

/* ======================= EXCEL ======================= */
const xe = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const colL = (n) => { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const ref = (c, r) => colL(c) + (r + 1);
/* Hoja sencilla: celdas por fila y columna (desde 0), estilos por índice, combinaciones, anchos y altos. */
function xSheet() {
  const rows = {}, merges = [], heights = {};
  const api = {
    set(c, r, v, st = 0, f) { (rows[r] = rows[r] || {})[c] = { v, st, f }; return api; },
    fill(c0, r0, c1, r1, st) { for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!rows[r]?.[c]) api.set(c, r, null, st); return api; },
    merge(c0, r0, c1, r1, v, st = 0) { api.fill(c0, r0, c1, r1, st); api.set(c0, r0, v, st); merges.push(`${ref(c0, r0)}:${ref(c1, r1)}`); return api; },
    height(r, h) { heights[r] = h; return api; },
    xml({ cols = [], drawing = false, freeze = null, autoFilter = null, grid = true, tab = false } = {}) {
      const rs = Object.keys({ ...rows, ...heights }).map(Number).sort((a, b) => a - b);
      const sd = rs.map(r => {
        const cells = Object.entries(rows[r] || {}).map(([c, x]) => [+c, x]).sort((a, b) => a[0] - b[0]).map(([c, x]) => {
          const R = ref(c, r), s = x.st ? ` s="${x.st}"` : '';
          if (x.f) return `<c r="${R}"${s}><f>${xe(x.f)}</f>${typeof x.v === 'number' ? `<v>${x.v}</v>` : ''}</c>`;
          if (x.v === null || x.v === undefined || x.v === '') return `<c r="${R}"${s}/>`;
          if (typeof x.v === 'number') return `<c r="${R}"${s}><v>${Number.isFinite(x.v) ? x.v : 0}</v></c>`;
          return `<c r="${R}"${s} t="inlineStr"><is><t xml:space="preserve">${xe(x.v)}</t></is></c>`;
        }).join('');
        return `<row r="${r + 1}"${heights[r] ? ` ht="${heights[r]}" customHeight="1"` : ''}>${cells}</row>`;
      }).join('');
      const pane = freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` : '';
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"${grid ? '' : ' showGridLines="0"'}${tab ? ' tabSelected="1"' : ''} zoomScale="90">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols.length ? `<cols>${cols.map(([a, b, w]) => `<col min="${a + 1}" max="${b + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : ''}
<sheetData>${sd}</sheetData>
${autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ''}
${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.2" footer="0.2"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
${drawing ? '<drawing r:id="rId1"/>' : ''}
</worksheet>`;
    }
  };
  return api;
}
/* Estilos: índices usados por las hojas (ver la lista ST). */
const ST = { dark: 1, title: 2, sub: 3, small: 4, panelH: 5, item: 6, itemOn: 7, kLabel: 8, kMoney: 9, kPct: 10, kDec: 11, kFoot: 12, tH: 13, tTxt: 14, tMoney: 15, tInt: 16, tPct: 17, kDays: 18, bestN: 19, bestV: 20, tDate: 21 };
function xStyles() {
  const font = (sz, color, b = false) => `<font>${b ? '<b/>' : ''}<sz val="${sz}"/><color rgb="FF${color}"/><name val="Calibri"/><family val="2"/></font>`;
  const fonts = [font(11, DX.ink), font(22, DX.gold, true), font(10, DX.soft), font(9, 'A39182'), font(10, 'FFFFFF', true), font(10, DX.ink), font(10, DX.ink, true), font(9.5, 'FFFFFF', true), font(16, DX.ink, true), font(8.5, DX.muted), font(12, 'FFFFFF', true), font(12, DX.soft, true)];
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>', ...[DX.dark, DX.cream, DX.gold, 'FFFFFF'].map(c => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`)];
  const side = (c) => `<left style="thin"><color rgb="FF${c}"/></left><right style="thin"><color rgb="FF${c}"/></right><top style="thin"><color rgb="FF${c}"/></top><bottom style="thin"><color rgb="FF${c}"/></bottom><diagonal/>`;
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>', `<border>${side(DX.gold)}</border>`, `<border>${side(DX.line)}</border>`];
  // [fuente, relleno, borde, formato, horizontal, vertical, ajuste]
  const xf = [[0, 0, 0, 0], [0, 2, 0, 0], [1, 2, 0, 0, 'left', 'center'], [2, 2, 0, 0, 'left', 'center'], [3, 2, 0, 0, 'left', 'center'], [4, 2, 0, 0, 'center', 'center'],
    [5, 3, 2, 0, 'center', 'center'], [6, 4, 2, 0, 'center', 'center'], [7, 2, 1, 0, 'center', 'center', 1], [8, 5, 1, 164, 'center', 'center'], [8, 5, 1, 165, 'center', 'center'], [8, 5, 1, 166, 'center', 'center'],
    [9, 3, 1, 0, 'center', 'center', 1], [4, 2, 2, 0, 'center', 'center', 1], [5, 0, 2, 0, 'left', 'center'], [5, 0, 2, 164, 'right', 'center'], [5, 0, 2, 167, 'right', 'center'], [5, 0, 2, 165, 'right', 'center'],
    [8, 5, 1, 168, 'center', 'center'], [10, 2, 0, 0, 'left', 'center'], [11, 2, 0, 164, 'left', 'center'], [5, 0, 2, 14, 'left', 'center']];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/><numFmt numFmtId="165" formatCode="0.0&quot;%&quot;"/><numFmt numFmtId="166" formatCode="0.0"/><numFmt numFmtId="167" formatCode="#,##0"/><numFmt numFmtId="168" formatCode="0.0&quot; días&quot;"/></numFmts>
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xf.length}">${xf.map(([f, fi, b, n, h, v, w]) => `<xf numFmtId="${n}" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0"${n ? ' applyNumberFormat="1"' : ''} applyFont="1" applyFill="1" applyBorder="1"${h ? ` applyAlignment="1"><alignment horizontal="${h}" vertical="${v}"${w ? ' wrapText="1"' : ''}/></xf>` : '/>'}`).join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/* ---------- Gráficas nativas de Excel (DrawingML) ---------- */
const cTxt = (sz, color, b = false) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}" b="${b ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>`;
const cFill = (c) => `<c:spPr><a:solidFill><a:srgbClr val="${c}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>`;
const cStr = (f, arr) => `<c:strRef><c:f>${xe(f)}</c:f><c:strCache><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${xe(v)}</c:v></c:pt>`).join('')}</c:strCache></c:strRef>`;
const cNum = (f, arr) => `<c:numRef><c:f>${xe(f)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${arr.length}"/>${arr.map((v, i) => `<c:pt idx="${i}"><c:v>${+v || 0}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`;
const cLbls = (fmt, pos, extra = '') => `<c:dLbls><c:numFmt formatCode="${xe(fmt)}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${cTxt(800, '3A3226', true)}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="${extra === 'pct' ? 0 : 1}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="${extra === 'pct' ? 1 : 0}"/><c:showBubbleSize val="0"/></c:dLbls>`;
const cAxes = (fmt, { hor = false, rev = false, del = false } = {}) => `
<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="${rev ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${hor ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="D9CDB6"/></a:solidFill></a:ln></c:spPr>${cTxt(800, '5B5040')}<c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>
<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="${del ? 1 : 0}"/><c:axPos val="${hor ? 'b' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="EFE7D8"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="${xe(fmt)}" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${cTxt(800, '8A7C62')}<c:crossAx val="10"/><c:crosses val="${rev ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;
function cChart(title, plot, legend = false) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:lang val="es-CO"/><c:roundedCorners val="0"/>
<c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="es-CO" sz="1100" b="1"><a:solidFill><a:srgbClr val="${DX.ink}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${xe(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}</c:plotArea>
${legend ? `<c:legend><c:legendPos val="${legend}"/><c:overlay val="0"/>${cTxt(800, '5B5040')}</c:legend>` : ''}
<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>
<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="${DX.gold}"/></a:solidFill></a:ln></c:spPr>
</c:chartSpace>`;
}
/* Una serie: [nombre, celda del nombre, rango de valores, valores, color]. */
const cSer = (i, [name, nameRef, valRef, vals, color], catRef, cats, inner) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx>${cStr(nameRef, [name])}</c:tx>${inner(color)}<c:cat>${cStr(catRef, cats)}</c:cat><c:val>${cNum(valRef, vals)}</c:val>`;
const chBar = (title, cats, catRef, series, { fmt = '#,##0', hor = false, vary = false } = {}) => cChart(title,
  `<c:barChart><c:barDir val="${hor ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series.map((s, i) => cSer(i, s, catRef, cats, color => `${cFill(color)}<c:invertIfNegative val="0"/>${vary ? cats.map((_, k) => `<c:dPt><c:idx val="${k}"/><c:invertIfNegative val="0"/><c:bubble3D val="0"/>${cFill(DX_COL[k % DX_COL.length])}</c:dPt>`).join('') : ''}${cLbls(fmt, hor ? 'outEnd' : 'outEnd')}`) + '</c:ser>').join('')}<c:gapWidth val="${series.length > 1 ? 80 : 55}"/><c:axId val="10"/><c:axId val="20"/></c:barChart>${cAxes(fmt, { hor, rev: hor, del: hor })}`, series.length > 1 ? 'b' : false);
const chLine = (title, cats, catRef, s, { fmt = '#,##0', area = false } = {}) => cChart(title, area
  ? `<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/>${cSer(0, s, catRef, cats, color => `<c:spPr><a:solidFill><a:srgbClr val="${color}"><a:alpha val="55000"/></a:srgbClr></a:solidFill><a:ln w="22225"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>${cLbls(fmt)}`)}</c:ser><c:axId val="10"/><c:axId val="20"/></c:areaChart>${cAxes(fmt)}`
  : `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${cSer(0, s, catRef, cats, color => `<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="6"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>${cLbls(fmt, 't')}`)}<c:smooth val="0"/></c:ser><c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>${cAxes(fmt)}`);
const chPie = (title, cats, catRef, s, { hole = 0 } = {}) => cChart(title,
  `<c:${hole ? 'doughnut' : 'pie'}Chart><c:varyColors val="1"/>${cSer(0, s, catRef, cats, () => `${cats.map((_, k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${DX_COL[k % DX_COL.length]}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('')}${cLbls('0.0%', hole ? '' : 'bestFit', 'pct')}`)}</c:ser><c:firstSliceAng val="0"/>${hole ? `<c:holeSize val="${hole}"/>` : ''}</c:${hole ? 'doughnut' : 'pie'}Chart>`, 'r');
/* Barras con una línea de referencia (meta del 100 %). */
const chBarRef = (title, cats, catRef, s, refS, { fmt = '0"%"' } = {}) => cChart(title,
  `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${cSer(0, s, catRef, cats, color => `${cFill(color)}<c:invertIfNegative val="0"/>${cLbls(fmt, 'outEnd')}`)}</c:ser><c:gapWidth val="55"/><c:axId val="10"/><c:axId val="20"/></c:barChart>
   <c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${cSer(1, refS, catRef, cats, color => `<c:spPr><a:ln w="19050"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr><c:marker><c:symbol val="none"/></c:marker>`)}<c:smooth val="0"/></c:ser><c:marker val="1"/><c:axId val="10"/><c:axId val="20"/></c:lineChart>${cAxes(fmt)}`, 'b');

function xDrawing(anchors) {
  const a = anchors.map((x, i) => {
    const pos = `<xdr:from><xdr:col>${x.c0}</xdr:col><xdr:colOff>${x.o0 || 0}</xdr:colOff><xdr:row>${x.r0}</xdr:row><xdr:rowOff>${x.ro0 || 0}</xdr:rowOff></xdr:from><xdr:to><xdr:col>${x.c1}</xdr:col><xdr:colOff>${x.o1 || 0}</xdr:colOff><xdr:row>${x.r1}</xdr:row><xdr:rowOff>${x.ro1 || 0}</xdr:rowOff></xdr:to>`;
    // Imágenes con tamaño fijo en píxeles (9525 EMU por píxel) para que no se deformen.
    if (x.img) return `<xdr:oneCellAnchor><xdr:from><xdr:col>${x.c0}</xdr:col><xdr:colOff>${x.o0 || 0}</xdr:colOff><xdr:row>${x.r0}</xdr:row><xdr:rowOff>${x.ro0 || 0}</xdr:rowOff></xdr:from><xdr:ext cx="${x.w * 9525}" cy="${x.h * 9525}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="${xe(x.name)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${x.rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    return `<xdr:twoCellAnchor editAs="oneCell">${pos}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="${xe(x.name)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${x.rid}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${a}</xdr:wsDr>`;
}

async function dashExcel(S) {
  if (!S) return toast('Abra el dashboard primero.', true);
  toast('Preparando el Excel del dashboard…');
  try { await dxScript(DX_LIB.zip, () => window.JSZip); } catch (e) { return toast(e.message, true); }
  const c = DB.data.config, n = S.meses.length, K = S.kpi;
  const logo = await dxLogoPNG(256, '#' + DX.dark), est = dxFotoEstrella(S);
  let foto = null; try { foto = await dxDataURL(est.src); } catch { foto = null; }

  /* --- Hoja Datos: de aquí leen todas las gráficas, así que al cambiar un número la gráfica cambia --- */
  const dat = xSheet();
  const H = ['Mes', 'Prendas', 'Monto', 'Costo', 'Compras', 'Clientes únicos', 'Conversión %', 'Crecimiento %', 'Cumplimiento %', 'Meta %'];
  H.forEach((h, i) => dat.set(i, 0, h, ST.tH));
  S.meses.forEach((m, i) => {
    const r = i + 1;
    dat.set(0, r, m, ST.tTxt).set(1, r, S.und[i], ST.tInt).set(2, r, S.monto[i], ST.tMoney).set(3, r, S.costo[i], ST.tMoney).set(4, r, S.compras[i], ST.tInt).set(5, r, S.unicos[i], ST.tInt)
      .set(6, r, S.conv[i], ST.tPct).set(7, r, S.crec[i], ST.tPct).set(8, r, S.meta[i], ST.tPct).set(9, r, 100, ST.tPct);
  });
  const blocks = [['Categoría', S.categoria, 11], ['Vendedor', S.vendedor, 14], ['Canal', S.canal, 17], ['Método de pago', S.metodo, 20], ['Tipo de cliente', S.tipo, 23]];
  blocks.forEach(([t, rows, col]) => { dat.set(col, 0, t, ST.tH).set(col + 1, 0, 'Monto', ST.tH); rows.forEach(([l, v], i) => dat.set(col, i + 1, l, ST.tTxt).set(col + 1, i + 1, v, ST.tMoney)); });
  const D = (col, r0, r1) => `Datos!$${colL(col)}$${r0 + 1}:$${colL(col)}$${r1 + 1}`, Dn = (col) => `Datos!$${colL(col)}$1`;
  const mes = (col) => [D(0, 1, n), D(col, 1, n)];

  /* --- Hoja Ventas: el detalle filtrable --- */
  const ven = xSheet(), VH = ['Fecha', 'Vendedor', 'Canal', 'Método de pago', 'Tipo de cliente', 'Categoría', 'Prenda', 'Unidades', 'Monto', 'Costo', 'Margen'];
  VH.forEach((h, i) => ven.set(i, 0, h, ST.tH));
  S.ventas.forEach((x, i) => {
    const r = i + 1, p = DB.find('productos', x.productoId);
    ven.set(0, r, x.fecha, ST.tTxt).set(1, r, x.vendedor, ST.tTxt).set(2, r, x.canal, ST.tTxt).set(3, r, x.metodo, ST.tTxt).set(4, r, x.tipo, ST.tTxt).set(5, r, x.categoria, ST.tTxt)
      .set(6, r, p?.nombre || x.productoId, ST.tTxt).set(7, r, x.und, ST.tInt).set(8, r, x.monto, ST.tMoney).set(9, r, x.costo, ST.tMoney).set(10, r, x.monto - x.costo, ST.tMoney, `I${r + 1}-J${r + 1}`);
  });
  const nv = S.ventas.length;

  /* --- Hoja Dashboard --- */
  const ds = xSheet(), C0 = 3; // columnas A:C panel lateral, D:AA tablero
  ds.fill(0, 0, 26, 3, ST.dark);
  ds.merge(C0, 0, 16, 1, 'Dashboard de ventas', ST.title).merge(C0, 2, 16, 2, `${c.empresa} · ${S.filtros}`, ST.sub).merge(C0, 3, 16, 3, `Generado ${S.generado} · Monto con IVA incluido`, ST.small);
  ds.merge(18, 0, 26, 0, '🏆 Mejor vendedor del período', ST.sub).merge(18, 1, 26, 2, S.best ? S.best[0] : '—', ST.bestN).merge(18, 3, 26, 3, S.best ? S.best[1] : 0, ST.bestV);
  [0, 1, 2, 3].forEach(r => ds.height(r, [30, 26, 18, 18][r]));
  // Panel lateral como los segmentadores del tablero
  let r = 5;
  ds.merge(0, r, 2, r, '📅 Año', ST.panelH); ds.merge(0, r + 1, 2, r + 1, S.Y, ST.itemOn); r += 3;
  ds.merge(0, r, 2, r, '👕 Conjunto estrella', ST.panelH); const fotoR = r + 1; r += 15;
  ds.merge(0, r, 2, r, '🧑‍💼 Vendedor', ST.panelH); r++;
  S.vendedor.forEach(([v]) => { ds.merge(0, r, 2, r, v, S.filtros.includes('Vendedores: todos') || S.filtros.includes(v) ? ST.itemOn : ST.item); r++; });
  r++; ds.merge(0, r, 2, r, '🗓️ Mes', ST.panelH); r++;
  for (let i = 0; i < 12; i += 3) { [0, 1, 2].forEach(k => { const m = MESES[i + k]; ds.set(k, r, m, S.meses.includes(m) && (S.filtros.includes('Meses: todos') || S.filtros.includes(m)) ? ST.itemOn : ST.item); }); r++; }
  // Indicadores con ícono
  DX_KPIS.forEach(([k, t, ic], i) => {
    const c0 = C0 + i * 3, c1 = c0 + 2, st = k === 'monto' ? ST.kMoney : k === 'ciclo' ? ST.kDays : k === 'frec' ? ST.kDec : ST.kPct;
    const val = k === 'monto' ? K.monto : +K[k].toFixed(k === 'frec' || k === 'ciclo' ? 1 : 1);
    ds.merge(c0, 5, c1, 5, `${ic}  ${t}`, ST.kLabel).merge(c0, 6, c1, 6, val, st).merge(c0, 7, c1, 7, dxFoot(k, S), ST.kFoot);
    if (k === 'monto') ds.set(c0, 6, val, st, `SUM(Ventas!I2:I${nv + 1})`);
  });
  ds.height(5, 30).height(6, 34).height(7, 26);
  // Resumen mensual con fórmulas a la hoja Datos
  const rr = 58;
  ds.merge(C0, rr - 1, C0 + 9, rr - 1, '📊 Resumen mensual', ST.panelH);
  ['Mes', 'Ventas', 'Prendas', 'Costo', 'Margen', 'Clientes', 'Cumplimiento'].forEach((h, i) => ds.merge(C0 + [0, 1, 3, 4, 6, 7, 8][i], rr, C0 + [0, 2, 3, 5, 6, 7, 9][i], rr, h, ST.tH));
  S.meses.forEach((m, i) => {
    const R = rr + 1 + i, d = i + 2;
    ds.set(C0, R, m, ST.tTxt).merge(C0 + 1, R, C0 + 2, R, S.monto[i], ST.tMoney).set(C0 + 1, R, S.monto[i], ST.tMoney, `Datos!C${d}`)
      .set(C0 + 3, R, S.und[i], ST.tInt, `Datos!B${d}`).merge(C0 + 4, R, C0 + 5, R, S.costo[i], ST.tMoney).set(C0 + 4, R, S.costo[i], ST.tMoney, `Datos!D${d}`)
      .set(C0 + 6, R, S.monto[i] ? +((1 - S.costo[i] / (S.monto[i] / 1.19)) * 100).toFixed(1) : 0, ST.tPct, `IF(Datos!C${d}=0,0,(1-Datos!D${d}/(Datos!C${d}/1.19))*100)`)
      .set(C0 + 7, R, S.compras[i], ST.tInt, `Datos!E${d}`).merge(C0 + 8, R, C0 + 9, R, S.meta[i], ST.tPct).set(C0 + 8, R, S.meta[i], ST.tPct, `Datos!I${d}`);
  });
  const tot = rr + 1 + n;
  ds.set(C0, tot, 'Total', ST.tH).merge(C0 + 1, tot, C0 + 2, tot, K.monto, ST.tMoney).set(C0 + 1, tot, K.monto, ST.tMoney, `SUM(Datos!C2:C${n + 1})`)
    .set(C0 + 3, tot, S.und.reduce((a, b) => a + b, 0), ST.tInt, `SUM(Datos!B2:B${n + 1})`).merge(C0 + 4, tot, C0 + 5, tot, 0, ST.tMoney).set(C0 + 4, tot, S.costo.reduce((a, b) => a + b, 0), ST.tMoney, `SUM(Datos!D2:D${n + 1})`);

  // 12 gráficas nativas: 4 por fila, 6 columnas por 16 filas cada una
  const charts = [
    chBar('Prendas vendidas por mes (und)', S.meses, D(0, 1, n), [['Prendas', Dn(1), D(1, 1, n), S.und, DX_COL[3]]]),
    chBar('Ventas por categoría ($)', S.categoria.map(x => x[0]), D(11, 1, S.categoria.length), [['Monto', Dn(12), D(12, 1, S.categoria.length), S.categoria.map(x => x[1]), DX_COL[4]]], { hor: true, fmt: '"$"#,##0,,"M"' }),
    chPie('Ventas por canal (%)', S.canal.map(x => x[0]), D(17, 1, S.canal.length), ['Monto', Dn(18), D(18, 1, S.canal.length), S.canal.map(x => x[1])], { hole: 55 }),
    chBar('Ventas por tipo de cliente ($)', S.tipo.map(x => x[0]), D(23, 1, S.tipo.length), [['Monto', Dn(24), D(24, 1, S.tipo.length), S.tipo.map(x => x[1]), DX_COL[1]]], { vary: true, fmt: '"$"#,##0,,"M"' }),
    chLine('Monto de ventas por mes ($)', S.meses, D(0, 1, n), ['Monto', Dn(2), D(2, 1, n), S.monto, DX_COL[1]], { fmt: '"$"#,##0,,"M"' }),
    chBar('Ventas por vendedor ($)', S.vendedor.map(x => x[0]), D(14, 1, S.vendedor.length), [['Monto', Dn(15), D(15, 1, S.vendedor.length), S.vendedor.map(x => x[1]), 'E08A2E']], { hor: true, fmt: '"$"#,##0,,"M"' }),
    chPie('Ventas por método de pago (%)', S.metodo.map(x => x[0]), D(20, 1, S.metodo.length), ['Monto', Dn(21), D(21, 1, S.metodo.length), S.metodo.map(x => x[1])]),
    chBar('Compras y clientes únicos por mes', S.meses, D(0, 1, n), [['Compras', Dn(4), D(4, 1, n), S.compras, DX_COL[1]], ['Clientes únicos', Dn(5), D(5, 1, n), S.unicos, 'E08A2E']]),
    chBar('Costo de ventas por mes ($)', S.meses, D(0, 1, n), [['Costo', Dn(3), D(3, 1, n), S.costo, '8A8A8A']], { fmt: '"$"#,##0,,"M"' }),
    chLine('Tasa de conversión (%)', S.meses, D(0, 1, n), ['Conversión %', Dn(6), D(6, 1, n), S.conv, 'D9A520'], { area: true, fmt: '0"%"' }),
    chBar('Crecimiento de ventas (%)', S.meses, D(0, 1, n), [['Crecimiento %', Dn(7), D(7, 1, n), S.crec, DX_COL[1]]], { fmt: '0"%"' }),
    chBarRef('Cumplimiento de meta (%)', S.meses, D(0, 1, n), ['Cumplimiento %', Dn(8), D(8, 1, n), S.meta, DX_COL[4]], ['Meta %', Dn(9), D(9, 1, n), S.meses.map(() => 100), DX_COL[2]])
  ];
  const anchors = charts.map((_, i) => { const row = Math.floor(i / 4), col = i % 4; return { name: 'Gráfica ' + (i + 1), rid: 'rIdC' + (i + 1), c0: C0 + col * 6, c1: C0 + col * 6 + 6, r0: 9 + row * 16, r1: 9 + row * 16 + 15, o1: -60000, ro1: -40000 }; });
  anchors.push({ img: true, name: 'Logo', rid: 'rIdL', c0: 0, r0: 0, o0: 520000, ro0: 60000, w: 108, h: 108 });
  if (foto) anchors.push({ img: true, name: 'Conjunto estrella', rid: 'rIdF', c0: 0, r0: fotoR, o0: 60000, ro0: 30000, w: 198, h: 264 });

  /* --- Paquete .xlsx --- */
  const z = new JSZip(), ns = 'http://schemas.openxmlformats.org';
  const sheets = [['Dashboard', ds.xml({ cols: [[0, 2, 9.5], [3, 26, 9.8]], drawing: true, grid: false, tab: true })], ['Datos', dat.xml({ cols: [[0, 25, 15]], freeze: 1 })], ['Ventas', ven.xml({ cols: [[0, 0, 12], [1, 6, 18], [7, 7, 10], [8, 10, 15]], freeze: 1, autoFilter: `A1:K${nv + 1}` })]];
  z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="${ns}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
${charts.map((_, i) => `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="${ns}/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${ns}/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  z.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="${ns}/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Dashboard de ventas ${xe(S.Y)}</dc:title><dc:creator>${xe(c.empresa)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`);
  z.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="${ns}/officeDocument/2006/extended-properties"><Application>Aurea Atelier</Application></Properties>`);
  z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map(([nm], i) => `<sheet name="${nm}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${ns}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rIdS" Type="${ns}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml', xStyles());
  sheets.forEach(([, x], i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, x));
  z.file('xl/worksheets/_rels/sheet1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships"><Relationship Id="rId1" Type="${ns}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  z.file('xl/drawings/drawing1.xml', xDrawing(anchors));
  z.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${ns}/package/2006/relationships">${charts.map((_, i) => `<Relationship Id="rIdC${i + 1}" Type="${ns}/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`).join('')}<Relationship Id="rIdL" Type="${ns}/officeDocument/2006/relationships/image" Target="../media/logo.png"/>${foto ? `<Relationship Id="rIdF" Type="${ns}/officeDocument/2006/relationships/image" Target="../media/conjunto.jpeg"/>` : ''}</Relationships>`);
  charts.forEach((x, i) => z.file(`xl/charts/chart${i + 1}.xml`, x));
  if (logo) z.file('xl/media/logo.png', dxB64(logo), { base64: true });
  if (foto) z.file('xl/media/conjunto.jpeg', dxB64(foto), { base64: true });
  const blob = await z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
  dxDownload(blob, `dashboard-ventas-${S.Y}-${todayISO()}.xlsx`);
  audit('Descargó el dashboard en Excel'); toast('Excel del dashboard descargado');
}

/* ======================= PDF ======================= */
const rgb = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const fmtM = (n) => { const a = Math.abs(n); return (n < 0 ? '-' : '') + (a >= 1e6 ? '$' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + 'M' : a >= 1e3 ? '$' + Math.round(a / 1e3) + 'K' : '$' + Math.round(a)); };
/* Íconos de los indicadores dibujados con líneas. */
function pdfIcon(doc, k, x, y, s = 7) {
  const g = rgb(DX.gold); doc.setDrawColor(...g); doc.setFillColor(...g); doc.setLineWidth(0.5);
  const cx = x + s / 2, cy = y + s / 2;
  if (k === 'monto') { doc.circle(cx, cy, s / 2, 'S'); doc.setFont('helvetica', 'bold'); doc.setFontSize(s * 1.7); doc.setTextColor(...g); doc.text('$', cx, cy + s * 0.22, { align: 'center' }); }
  else if (k === 'conv') { doc.lines([[s, 0], [-s * 0.35, s * 0.5], [0, s * 0.5], [-s * 0.3, 0], [0, -s * 0.5]], x, y, [1, 1], 'S', true); }
  else if (k === 'crec') { [0.35, 0.6, 0.9].forEach((h, i) => doc.rect(x + i * s * 0.34, y + s * (1 - h), s * 0.24, s * h, 'F')); }
  else if (k === 'sat') { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.22 : s * 0.5; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } doc.lines(p.slice(1).map((q, i) => [q[0] - p[i][0], q[1] - p[i][1]]), p[0][0], p[0][1], [1, 1], 'F', true); }
  else if (k === 'reclamos') { doc.lines([[s / 2, s], [-s, 0]], cx, y, [1, 1], 'S', true); doc.setFont('helvetica', 'bold'); doc.setFontSize(s * 1.4); doc.setTextColor(...g); doc.text('!', cx, y + s * 0.88, { align: 'center' }); }
  else if (k === 'cumpl') { doc.circle(cx, cy, s / 2, 'S'); doc.circle(cx, cy, s / 3.2, 'S'); doc.circle(cx, cy, s / 9, 'F'); }
  else if (k === 'ciclo') { doc.circle(cx, cy, s / 2, 'S'); doc.line(cx, cy, cx, cy - s * 0.32); doc.line(cx, cy, cx + s * 0.25, cy + s * 0.08); }
  else if (k === 'frec') { doc.circle(cx, cy, s * 0.42, 'S'); doc.lines([[s * 0.28, 0], [-s * 0.14, -s * 0.22]], cx + s * 0.3, cy - s * 0.05, [1, 1], 'F', true); }
}
function pdfFrame(doc, x, y, w, h, title) {
  doc.setFillColor(255, 255, 255); doc.setDrawColor(...rgb(DX.line)); doc.setLineWidth(0.3); doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...rgb(DX.dark)); doc.roundedRect(x, y, w, 7, 2, 2, 'F'); doc.rect(x, y + 4, w, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...rgb(DX.soft)); doc.text(title, x + w / 2, y + 4.9, { align: 'center' });
  return { x: x + 4, y: y + 11, w: w - 8, h: h - 14 };
}
function pdfBars(doc, A, labels, vals, color, fmt, { ref } = {}) {
  const max = Math.max(...vals, ref || 0, 1), min = Math.min(0, ...vals), span = max - min || 1, bw = A.w / vals.length, z = A.y + A.h - 6 - (0 - min) / span * (A.h - 12);
  doc.setDrawColor(...rgb(DX.line)); doc.line(A.x, z, A.x + A.w, z);
  vals.forEach((v, i) => {
    const h = Math.abs(v) / span * (A.h - 12), x = A.x + i * bw + bw * 0.18, top = v >= 0 ? z - h : z;
    doc.setFillColor(...rgb(v < 0 ? DX_COL[2] : color)); doc.rect(x, top, bw * 0.64, Math.max(0.3, h), 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(...rgb('3A3226')); doc.text(fmt(v), x + bw * 0.32, v >= 0 ? top - 1 : top + h + 2.6, { align: 'center' });
    doc.setTextColor(...rgb('8A7C62')); doc.text(String(labels[i]), x + bw * 0.32, A.y + A.h, { align: 'center' });
  });
  if (ref) { const yr = z - ref / span * (A.h - 12); doc.setDrawColor(...rgb(DX_COL[2])); doc.setLineDashPattern([1, 1], 0); doc.line(A.x, yr, A.x + A.w, yr); doc.setLineDashPattern([], 0); doc.setFontSize(5.5); doc.setTextColor(...rgb(DX_COL[2])); doc.text('Meta 100%', A.x + A.w, yr - 1, { align: 'right' }); }
}
function pdfHBars(doc, A, rows, color, fmt) {
  const max = Math.max(...rows.map(r => r[1]), 1), rh = Math.min(7, A.h / Math.max(rows.length, 1)), lw = A.w * 0.38;
  rows.forEach(([l, v], i) => {
    const y = A.y + i * rh;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...rgb('3A3226')); doc.text(String(l).slice(0, 26), A.x + lw - 1.5, y + rh * 0.62, { align: 'right' });
    const w = v / max * (A.w - lw - 14); doc.setFillColor(...rgb(color)); doc.rect(A.x + lw, y + rh * 0.2, Math.max(0.4, w), rh * 0.6, 'F');
    doc.text(fmt(v), A.x + lw + w + 1.2, y + rh * 0.62);
  });
}
function pdfLine(doc, A, labels, vals, color, fmt, area = false) {
  const max = Math.max(...vals, 1) * 1.1, n = vals.length, step = A.w / Math.max(n - 1, 1), px = i => A.x + i * step, py = v => A.y + (A.h - 6) * (1 - v / max);
  if (area) { doc.setFillColor(...rgb(color)); doc.setGState?.(new doc.GState({ opacity: 0.35 })); const p = vals.map((v, i) => [px(i), py(v)]); const pts = [[px(0), py(0)], ...p, [px(n - 1), py(0)]]; doc.lines(pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'F', true); doc.setGState?.(new doc.GState({ opacity: 1 })); }
  doc.setDrawColor(...rgb(color)); doc.setLineWidth(0.7);
  for (let i = 1; i < n; i++) doc.line(px(i - 1), py(vals[i - 1]), px(i), py(vals[i]));
  vals.forEach((v, i) => { doc.setFillColor(...rgb(color)); doc.circle(px(i), py(v), 0.8, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.4); doc.setTextColor(...rgb('3A3226')); doc.text(fmt(v), px(i), py(v) - 1.6, { align: 'center' }); doc.setTextColor(...rgb('8A7C62')); doc.text(String(labels[i]), px(i), A.y + A.h, { align: 'center' }); });
  doc.setLineWidth(0.3);
}
function pdfPie(doc, A, items, hole = 0) {
  const tot = items.reduce((s, x) => s + x[1], 0) || 1, R = Math.min(A.h / 2, A.w * 0.26), cx = A.x + R + 2, cy = A.y + A.h / 2;
  let a0 = -Math.PI / 2;
  items.forEach(([, v], k) => {
    const a1 = a0 + v / tot * Math.PI * 2, steps = Math.max(2, Math.ceil((a1 - a0) / 0.08)), pts = [[cx, cy]];
    for (let s = 0; s <= steps; s++) { const a = a0 + (a1 - a0) * s / steps; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    doc.setFillColor(...rgb(DX_COL[k % DX_COL.length])); doc.lines(pts.slice(1).map((q, i) => [q[0] - pts[i][0], q[1] - pts[i][1]]), cx, cy, [1, 1], 'F', true);
    const m = (a0 + a1) / 2, pc = v / tot * 100;
    if (pc >= 6) { doc.setFont('helvetica', 'bold'); doc.setFontSize(5.8); doc.setTextColor(255, 255, 255); doc.text(pc.toFixed(1).replace('.', ',') + '%', cx + R * (hole ? 0.78 : 0.62) * Math.cos(m), cy + R * (hole ? 0.78 : 0.62) * Math.sin(m) + 1, { align: 'center' }); }
    a0 = a1;
  });
  if (hole) { doc.setFillColor(255, 255, 255); doc.circle(cx, cy, R * hole, 'F'); }
  items.forEach(([l, v], k) => { const y = A.y + 4 + k * 6; doc.setFillColor(...rgb(DX_COL[k % DX_COL.length])); doc.rect(cx + R + 5, y - 2.2, 2.6, 2.6, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); doc.setTextColor(...rgb('3A3226')); doc.text(`${l}  ${(v / tot * 100).toFixed(1).replace('.', ',')}%`, cx + R + 9, y); });
}
function pdfGrouped(doc, A, labels, series) {
  const max = Math.max(...series.flatMap(s => s[1]), 1), bw = A.w / labels.length, gw = bw * 0.7 / series.length, z = A.y + A.h - 10;
  labels.forEach((l, i) => {
    series.forEach(([, vals, color], k) => { const h = vals[i] / max * (A.h - 16); doc.setFillColor(...rgb(color)); doc.rect(A.x + i * bw + bw * 0.15 + k * gw, z - h, gw * 0.9, Math.max(0.3, h), 'F'); doc.setFontSize(4.8); doc.setTextColor(...rgb('3A3226')); doc.text(String(vals[i]), A.x + i * bw + bw * 0.15 + k * gw + gw * 0.45, z - h - 0.8, { align: 'center' }); });
    doc.setFontSize(5.6); doc.setTextColor(...rgb('8A7C62')); doc.text(String(l), A.x + i * bw + bw / 2, z + 3.4, { align: 'center' });
  });
  series.forEach(([n, , color], k) => { doc.setFillColor(...rgb(color)); doc.rect(A.x + k * 32, A.y + A.h - 2.6, 2.6, 2.6, 'F'); doc.setFontSize(6); doc.text(n, A.x + k * 32 + 4, A.y + A.h - 0.3); });
}

async function dashPDF(v, S) {
  if (!S) return toast('Abra el dashboard primero.', true);
  toast('Preparando el PDF del dashboard…');
  try { await dxScript(DX_LIB.pdf, () => window.jspdf?.jsPDF); } catch (e) { return toast(e.message, true); }
  const { jsPDF } = window.jspdf, doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }), W = 297, Hh = 210, c = DB.data.config, K = S.kpi;
  const logo = await dxLogoPNG(256), est = dxFotoEstrella(S);
  let foto = null; try { foto = await dxDataURL(est.src); } catch { foto = null; }
  const fondo = () => { doc.setFillColor(...rgb('FBF8F2')); doc.rect(0, 0, W, Hh, 'F'); };
  const cabecera = (pag) => {
    doc.setFillColor(...rgb(DX.dark)); doc.rect(0, 0, W, 26, 'F');
    if (logo) doc.addImage(logo, 'PNG', 8, 3, 20, 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...rgb(DX.gold)); doc.text('Dashboard de ventas', 32, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...rgb(DX.soft)); doc.text(`${c.empresa} · ${S.filtros}`, 32, 18);
    doc.setFontSize(7); doc.setTextColor(...rgb('A39182')); doc.text(`Generado ${S.generado} · Montos con IVA incluido · Página ${pag}`, 32, 22.5);
    if (S.best) { doc.setFontSize(7); doc.setTextColor(...rgb(DX.soft)); doc.text('MEJOR VENDEDOR', W - 8, 9, { align: 'right' }); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.text(S.best[0], W - 8, 15, { align: 'right' }); doc.setTextColor(...rgb(DX.gold)); doc.text(moneyTxt(S.best[1]), W - 8, 21, { align: 'right' }); }
  };
  // Página 1: indicadores, foto del conjunto estrella y tres gráficas
  fondo(); cabecera(1);
  const kv = { monto: moneyTxt(K.monto), conv: K.conv.toFixed(1).replace('.', ',') + '%', crec: (K.crec >= 0 ? '+' : '-') + Math.abs(K.crec).toFixed(1).replace('.', ',') + '%', sat: K.sat.toFixed(1).replace('.', ',') + '%', reclamos: K.reclamos.toFixed(1).replace('.', ',') + '%', cumpl: K.cumpl.toFixed(1).replace('.', ',') + '%', ciclo: K.ciclo.toFixed(1).replace('.', ',') + ' días', frec: K.frec.toFixed(1).replace('.', ',') };
  const kw = (W - 16 - 7 * 3) / 8;
  DX_KPIS.forEach(([k, t], i) => {
    const x = 8 + i * (kw + 3), y = 31;
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...rgb(DX.gold)); doc.setLineWidth(0.35); doc.roundedRect(x, y, kw, 25, 2, 2, 'FD');
    pdfIcon(doc, k, x + 3, y + 3, 6.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.3); doc.setTextColor(...rgb(DX.muted)); doc.text(doc.splitTextToSize(t.toUpperCase(), kw - 12), x + 11, y + 5.2);
    doc.setFontSize(k === 'monto' ? 10 : 12.5); doc.setTextColor(...rgb(k === 'crec' ? (K.crec >= 0 ? '2F7A4F' : 'B0413A') : DX.ink)); doc.text(kv[k], x + kw / 2, y + 17, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.6); doc.setTextColor(...rgb('8A7C62')); doc.text(doc.splitTextToSize(dxFoot(k, S), kw - 4), x + kw / 2, y + 21.5, { align: 'center' });
  });
  doc.setLineWidth(0.3);
  const gw = (W - 16 - 2 * 4) / 3, gh = 68, y1 = 61;
  const panel = (i, y, title, fn) => { const x = 8 + i * (gw + 4); const A = pdfFrame(doc, x, y, gw, gh, title); fn(A); };
  if (foto) { const A = pdfFrame(doc, 8, y1, gw, gh + 74, 'Conjunto más vendido'); const fh = A.h - 10, fw = fh * 0.75; doc.addImage(foto, 'JPEG', A.x + (A.w - fw) / 2, A.y, fw, fh); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...rgb('3A3226')); doc.text(doc.splitTextToSize(est.items.join(' + ') || 'Conjunto del catálogo', A.w), A.x + A.w / 2, A.y + fh + 4, { align: 'center' }); }
  const firstCol = foto ? 1 : 0;
  const graficas = [
    ['Prendas vendidas por mes (und)', A => pdfBars(doc, A, S.meses, S.und, DX_COL[3], n => Math.round(n).toLocaleString('es-CO'))],
    ['Monto de ventas por mes ($)', A => pdfLine(doc, A, S.meses, S.monto, DX_COL[1], fmtM)],
    ['Ventas por categoría ($)', A => pdfHBars(doc, A, S.categoria, DX_COL[4], fmtM)],
    ['Ventas por vendedor ($)', A => pdfHBars(doc, A, S.vendedor, 'E08A2E', fmtM)],
    ['Ventas por canal (%)', A => pdfPie(doc, A, S.canal, 0.55)],
    ['Ventas por método de pago (%)', A => pdfPie(doc, A, S.metodo)],
    ['Ventas por tipo de cliente ($)', A => pdfBars(doc, A, S.tipo.map(x => x[0]), S.tipo.map(x => x[1]), DX_COL[1], fmtM)],
    ['Compras y clientes únicos por mes', A => pdfGrouped(doc, A, S.meses, [['Compras', S.compras, DX_COL[1]], ['Clientes únicos', S.unicos, 'E08A2E']])],
    ['Costo de ventas por mes ($)', A => pdfBars(doc, A, S.meses, S.costo, '8A8A8A', fmtM)],
    ['Tasa de conversión (%)', A => pdfLine(doc, A, S.meses, S.conv, 'D9A520', n => Math.round(n) + '%', true)],
    ['Crecimiento de ventas (%)', A => pdfBars(doc, A, S.meses, S.crec, DX_COL[1], n => (n > 0 ? '+' : '') + n + '%')],
    ['Cumplimiento de meta (%)', A => pdfBars(doc, A, S.meses, S.meta, DX_COL[4], n => n + '%', { ref: 100 })]
  ];
  // Página 1: 2 gráficas al lado de la foto, dos filas
  let gi = 0;
  for (let row = 0; row < 2; row++) for (let col = firstCol; col < 3; col++) { if (gi >= graficas.length) break; const [t, fn] = graficas[gi++]; panel(col, y1 + row * (gh + 6), t, fn); }
  // Páginas siguientes: 6 gráficas por página
  let pag = 1;
  while (gi < graficas.length) {
    doc.addPage(); pag++; fondo(); cabecera(pag);
    for (let row = 0; row < 2 && gi < graficas.length; row++) for (let col = 0; col < 3 && gi < graficas.length; col++) { const [t, fn] = graficas[gi++]; panel(col, 32 + row * (gh + 8), t, fn); }
  }
  // Última página: resumen mensual
  doc.addPage(); pag++; fondo(); cabecera(pag);
  const cols = ['Mes', 'Ventas', 'Prendas', 'Costo', 'Margen', 'Compras', 'Clientes', 'Cumplimiento'], cw = [24, 40, 26, 40, 26, 26, 26, 30], tx = 8;
  let ty = 34;
  doc.setFillColor(...rgb(DX.dark)); doc.rect(tx, ty, cw.reduce((a, b) => a + b, 0), 8, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...rgb(DX.soft));
  let cx = tx; cols.forEach((h, i) => { doc.text(h, cx + (i ? cw[i] - 2 : 2), ty + 5.4, { align: i ? 'right' : 'left' }); cx += cw[i]; });
  ty += 8;
  S.meses.forEach((m, i) => {
    const base = S.monto[i] / 1.19, row = [m, moneyTxt(S.monto[i]), S.und[i].toLocaleString('es-CO'), moneyTxt(S.costo[i]), base ? Math.round((1 - S.costo[i] / base) * 100) + '%' : '0%', S.compras[i], S.unicos[i], S.meta[i] + '%'];
    if (i % 2) { doc.setFillColor(...rgb(DX.cream)); doc.rect(tx, ty, cw.reduce((a, b) => a + b, 0), 7, 'F'); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...rgb(DX.ink));
    let x = tx; row.forEach((val, k) => { doc.text(String(val), x + (k ? cw[k] - 2 : 2), ty + 4.9, { align: k ? 'right' : 'left' }); x += cw[k]; });
    ty += 7;
  });
  doc.setFont('helvetica', 'bold'); doc.setDrawColor(...rgb(DX.gold)); doc.line(tx, ty, tx + cw.reduce((a, b) => a + b, 0), ty);
  doc.text('Total', tx + 2, ty + 5.5); doc.text(moneyTxt(K.monto), tx + cw[0] + cw[1] - 2, ty + 5.5, { align: 'right' }); doc.text(S.und.reduce((a, b) => a + b, 0).toLocaleString('es-CO'), tx + cw[0] + cw[1] + cw[2] - 2, ty + 5.5, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...rgb(DX.muted));
  doc.text(doc.splitTextToSize('Los picos de abril, agosto y diciembre coinciden con las fechas legales de entrega de dotación en Colombia: 30 de abril, 31 de agosto y 20 de diciembre.', 230), tx, ty + 16);
  doc.save(`dashboard-ventas-${S.Y}-${todayISO()}.pdf`);
  audit('Descargó el dashboard en PDF'); toast('PDF del dashboard descargado');
}

Object.assign(FUNCIONES, {
  'Dashboard de ventas': [...(FUNCIONES['Dashboard de ventas'] || []), 'Descargar el dashboard en Excel con las 12 gráficas de Excel, íconos, logo y foto', 'Hojas de Excel con los datos de las gráficas y el detalle de ventas con filtros', 'Descargar el dashboard en PDF con indicadores, íconos y gráficas']
});
