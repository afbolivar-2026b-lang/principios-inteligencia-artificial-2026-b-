/*!
 * © Opita Digital — Todos los derechos reservados.
 * Genera el tablero de la campaña en Excel (.xlsx) sin librerías externas:
 * hoja "Tablero" con indicadores, filtros y 8 gráficas; hoja "Datos" con las
 * fórmulas que alimentan las gráficas; hoja "Registros" como tabla de Excel.
 * Las fórmulas leen la hoja Registros, así que el tablero se actualiza solo
 * si se cambian los filtros o se agregan filas.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { crearZip } = require('./zip');

let LOGO = null;
try { LOGO = fs.readFileSync(path.join(__dirname, '..', 'public', 'marca', 'opita-digital-logo.png')); } catch { LOGO = null; }

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function letra(n) { // 1 -> A
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
const ref = (col, fila) => `${letra(col)}${fila}`;

// Fecha "YYYY-MM-DD" -> número de serie de Excel
function serieExcel(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / 86400000 + 25569;
}

// ---------- Hojas ----------
class Hoja {
  constructor(nombre) {
    this.nombre = nombre;
    this.celdas = new Map(); // fila -> Map(col -> xml)
    this.anchos = [];
    this.altos = new Map();
    this.combinadas = [];
    this.validaciones = [];
    this.extra = '';
  }

  poner(col, fila, valor, estilo = 0, { formula, tipo } = {}) {
    if (!this.celdas.has(fila)) this.celdas.set(fila, new Map());
    const r = ref(col, fila);
    const s = estilo ? ` s="${estilo}"` : '';
    let xml;
    if (formula) {
      const esTexto = typeof valor === 'string';
      xml = `<c r="${r}"${s}${esTexto ? ' t="str"' : ''}><f>${esc(formula)}</f><v>${esc(valor ?? 0)}</v></c>`;
    } else if (valor === null || valor === undefined || valor === '') {
      xml = `<c r="${r}"${s}/>`;
    } else if (typeof valor === 'number' || tipo === 'n') {
      xml = `<c r="${r}"${s}><v>${valor}</v></c>`;
    } else {
      xml = `<c r="${r}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`;
    }
    this.celdas.get(fila).set(col, xml);
  }

  combinar(c1, f1, c2, f2) { this.combinadas.push(`${ref(c1, f1)}:${ref(c2, f2)}`); }

  xml({ congelar = false, drawing = null, tabla = null, cuadricula = true, unaPagina = false } = {}) {
    const filas = [...this.celdas.keys()].sort((a, b) => a - b).map((f) => {
      const cols = this.celdas.get(f);
      const alto = this.altos.get(f);
      const attr = alto ? ` ht="${alto}" customHeight="1"` : '';
      return `<row r="${f}"${attr}>${[...cols.keys()].sort((a, b) => a - b).map((c) => cols.get(c)).join('')}</row>`;
    }).join('');
    const cols = this.anchos.length
      ? `<cols>${this.anchos.map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : '')).join('')}</cols>`
      : '';
    const vista = congelar
      ? '<sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>'
      : `<sheetView workbookViewId="0"${cuadricula ? '' : ' showGridLines="0"'}/>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><tabColor rgb="FF${this.color || '0E1B2C'}"/><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews>${vista}</sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${filas}</sheetData>${
  this.combinadas.length ? `<mergeCells count="${this.combinadas.length}">${this.combinadas.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}${
  this.validaciones.length ? `<dataValidations count="${this.validaciones.length}">${this.validaciones.join('')}</dataValidations>` : ''}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${unaPagina ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="${unaPagina ? 1 : 0}"/><headerFooter><oddFooter>&amp;L&amp;8Desarrollado por Opita Digital&amp;R&amp;8Página &amp;P de &amp;N</oddFooter></headerFooter>${
  drawing ? '<drawing r:id="rId1"/>' : ''}${tabla ? `<tableParts count="1"><tablePart r:id="${drawing ? 'rId2' : 'rId1'}"/></tableParts>` : ''}${this.extra}</worksheet>`;
  }
}

// ---------- Estilos ----------
// Índices de cellXfs usados abajo
const E = {
  titulo: 1, subtitulo: 2, encabezado: 3, kpiEtiqueta: 4, kpiNum: 5, kpiPct: 6, texto: 7, fecha: 8,
  entero: 9, filtro: 10, filtroEtiqueta: 11, pie: 12, seccion: 13, fechaCorta: 14, kpiDestacadoEtiqueta: 15,
  kpiDestacadoNum: 16,
};
const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="4"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="+0%;-0%;0%"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/><numFmt numFmtId="167" formatCode="d mmm"/></numFmts>
<fonts count="10">
<font><sz val="11"/><color rgb="FF1F2937"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="20"/><color rgb="FF0E1B2C"/><name val="Georgia"/><family val="1"/></font>
<font><sz val="9"/><color rgb="FF7B8290"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFF4EFE6"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="8"/><color rgb="FF7B8290"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="22"/><color rgb="FF0E1B2C"/><name val="Georgia"/><family val="1"/></font>
<font><b/><sz val="11"/><color rgb="FF0E1B2C"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="8"/><color rgb="FFB0B4BC"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="12"/><color rgb="FF0E1B2C"/><name val="Georgia"/><family val="1"/></font>
<font><b/><sz val="22"/><color rgb="FFC9A45C"/><name val="Georgia"/><family val="1"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0E1B2C"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFAF6EE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3E6C4"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF13243A"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="4">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFE4DCCB"/></left><right style="thin"><color rgb="FFE4DCCB"/></right><top style="thin"><color rgb="FFE4DCCB"/></top><bottom style="thin"><color rgb="FFE4DCCB"/></bottom><diagonal/></border>
<border><left/><right/><top/><bottom style="medium"><color rgb="FFC9A45C"/></bottom><diagonal/></border>
<border><left style="thin"><color rgb="FFC9A45C"/></left><right style="thin"><color rgb="FFC9A45C"/></right><top style="thin"><color rgb="FFC9A45C"/></top><bottom style="thin"><color rgb="FFC9A45C"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="17">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="164" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="165" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="6" fillId="4" borderId="3" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="8" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
<xf numFmtId="164" fontId="9" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" indent="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

// ---------- Gráficas (DrawingML) ----------
const COLORES_DONA = ['2A78D6', 'EB6834', '1BAF7A', 'EDA100'];

function cacheNum(valores, formato = 'General') {
  return `<c:numCache><c:formatCode>${esc(formato)}</c:formatCode><c:ptCount val="${valores.length}"/>${
    valores.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')}</c:numCache>`;
}
function cacheTexto(valores) {
  return `<c:strCache><c:ptCount val="${valores.length}"/>${valores.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('')}</c:strCache>`;
}

function graficaXml({ tipo, titulo, cat, val, nombreSerie, color = '2A5C9E', dir = 'col' }) {
  const catXml = cat.numerica
    ? `<c:cat><c:numRef><c:f>${cat.ref}</c:f>${cacheNum(cat.valores, cat.formato)}</c:numRef></c:cat>`
    : `<c:cat><c:strRef><c:f>${cat.ref}</c:f>${cacheTexto(cat.valores)}</c:strRef></c:cat>`;
  const valXml = `<c:val><c:numRef><c:f>${val.ref}</c:f>${cacheNum(val.valores)}</c:numRef></c:val>`;
  const relleno = `<c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr>`;
  const etiquetas = (pos) => `<c:dLbls><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800" b="1"><a:solidFill><a:srgbClr val="3B4759"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`;
  const serie = (extra) => `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${esc(nombreSerie)}</c:v></c:tx>${extra}${catXml}${valXml}</c:ser>`;
  const texto = (sz, colorTxt = '7B8290') => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}"><a:solidFill><a:srgbClr val="${colorTxt}"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>`;
  const ejes = (horizontal) => `<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="${horizontal ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${horizontal ? 'l' : 'b'}"/>${cat.numerica ? `<c:numFmt formatCode="${esc(cat.formato)}" sourceLinked="0"/>` : ''}<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="B0B4BC"/></a:solidFill></a:ln></c:spPr>${texto(800)}<c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx><c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="${horizontal ? 1 : 0}"/><c:axPos val="${horizontal ? 't' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E4DCCB"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${texto(800)}<c:crossAx val="10"/><c:crosses val="${horizontal ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;

  let plot;
  if (tipo === 'barras') {
    plot = `<c:barChart><c:barDir val="${dir}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${serie(relleno + etiquetas('outEnd'))}<c:gapWidth val="${dir === 'bar' ? 60 : 40}"/><c:axId val="10"/><c:axId val="20"/></c:barChart>${ejes(dir === 'bar')}`;
  } else if (tipo === 'linea') {
    plot = `<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${esc(nombreSerie)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${color}"><a:alpha val="22000"/></a:srgbClr></a:solidFill><a:ln w="25400"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>${catXml}${valXml}</c:ser><c:axId val="10"/><c:axId val="20"/></c:areaChart>${ejes(false)}`;
  } else { // dona
    const puntos = val.valores.map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${COLORES_DONA[i % COLORES_DONA.length]}"/></a:solidFill><a:ln w="19050"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('');
    const etiquetasPct = '<c:dLbls><c:numFmt formatCode="0%" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr><c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="1"/><c:showBubbleSize val="0"/><c:showLeaderLines val="0"/></c:dLbls>';
    plot = `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${esc(nombreSerie)}</c:v></c:tx>${puntos}${etiquetasPct}${catXml}${valXml}</c:ser><c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`;
  }
  const leyenda = tipo === 'dona'
    ? `<c:legend><c:legendPos val="r"/><c:overlay val="0"/>${texto(900, '3B4759')}</c:legend>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:lang val="es-CO"/><c:roundedCorners val="0"/>
<c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"><a:solidFill><a:srgbClr val="0E1B2C"/></a:solidFill><a:latin typeface="Georgia"/></a:defRPr></a:pPr><a:r><a:rPr lang="es-CO" sz="1200" b="1"><a:solidFill><a:srgbClr val="0E1B2C"/></a:solidFill><a:latin typeface="Georgia"/></a:rPr><a:t>${esc(titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>${plot}<c:spPr><a:noFill/></c:spPr></c:plotArea>${leyenda}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>
<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E4DCCB"/></a:solidFill></a:ln></c:spPr>
<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="es-CO"/></a:p></c:txPr>
</c:chartSpace>`;
}

function dibujoXml(posiciones, logo) {
  // Logo de Opita Digital arriba a la derecha (ancho fijo en EMU)
  const imagenLogo = logo ? `<xdr:oneCellAnchor><xdr:from><xdr:col>15</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="1600000" cy="${Math.round(1600000 * logo.alto / logo.ancho)}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="100" name="Logo Opita Digital" descr="Desarrollado por Opita Digital"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId${posiciones.length + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${imagenLogo}
${posiciones.map(([c1, f1, c2, f2], i) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${f1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${f2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Gráfica ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join('\n')}
</xdr:wsDr>`;
}

// ---------- Libro completo ----------
const RANGOS = [['18–25', 18, 25], ['26–35', 26, 35], ['36–45', 36, 45], ['46–55', 46, 55], ['56–65', 56, 65], ['66+', 66, 120]];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const FRANJAS = [['Mañana (6 a. m. – 12 m.)', 6, 12], ['Tarde (12 m. – 6 p. m.)', 12, 18], ['Noche (6 p. m. – 12 a. m.)', 18, 24], ['Madrugada (12 a. m. – 6 a. m.)', 0, 6]];

const diaBogota = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
const horaBogota = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hourCycle: 'h23' });
const semanaBogota = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', weekday: 'short' });
const SEMANA_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * registros: lista completa (de registros.listar())
 * opciones: { nombre, comuna, edad, encuesta: {pregunta, opciones:[{texto,votos}]} | null, votos, ahora }
 */
function crearExcelTablero(registros, opciones = {}) {
  const ahora = opciones.ahora || new Date();
  const hoySerie = serieExcel(diaBogota.format(ahora));
  const filtroComuna = opciones.comuna || 'Todas';
  const filtroEdad = opciones.edad || 'Todas';

  // Registros enriquecidos (en orden de fecha, del más reciente al más antiguo)
  const filas = registros.map((r) => {
    const f = new Date(r.fecha);
    const rango = RANGOS.find(([, a, b]) => r.edad >= a && r.edad <= b);
    return {
      ...r,
      rango: rango ? rango[0] : '',
      serie: serieExcel(diaBogota.format(f)),
      hora: Number(horaBogota.format(f)),
      dia: DIAS[SEMANA_EN.indexOf(semanaBogota.format(f))],
    };
  });
  const N = Math.max(filas.length, 1);
  const ultima = N + 1;
  const R = (col) => `Registros!$${col}$2:$${col}$${ultima}`;
  const rC = R('H'); const rE = R('E'); const rF = R('I'); const rEd = R('D'); const rD = R('K'); const rHo = R('J'); const rB = R('G');
  const CRIT = `${rC},Datos!$B$2,${rE},Datos!$B$3`;
  const pasa = (r) => (filtroComuna === 'Todas' || r.comuna === filtroComuna) && (filtroEdad === 'Todas' || r.rango === filtroEdad);
  const vista = filas.filter(pasa);
  const cuenta = (pred) => vista.filter(pred).length;

  // ===== Hoja Registros =====
  const reg = new Hoja('Registros');
  const columnas = ['Nombre', 'Apellido', 'Cédula', 'Edad', 'Rango de edad', 'Teléfono', 'Barrio', 'Comuna', 'Fecha', 'Hora', 'Día', 'Firmado'];
  reg.anchos = [18, 22, 14, 8, 14, 14, 20, 13, 12, 7, 7, 9];
  columnas.forEach((c, i) => reg.poner(i + 1, 1, c, E.encabezado));
  filas.forEach((r, k) => {
    const f = k + 2;
    reg.poner(1, f, r.nombre, E.texto);
    reg.poner(2, f, r.apellido, E.texto);
    reg.poner(3, f, r.cedula, E.texto);
    reg.poner(4, f, r.edad, E.entero);
    reg.poner(5, f, r.rango, E.texto);
    reg.poner(6, f, r.telefono, E.texto);
    reg.poner(7, f, r.barrio, E.texto);
    reg.poner(8, f, r.comuna, E.texto);
    reg.poner(9, f, r.serie, E.fecha);
    reg.poner(10, f, r.hora, E.entero);
    reg.poner(11, f, r.dia, E.texto);
    reg.poner(12, f, r.firma ? 'Sí' : 'No', E.texto);
  });
  if (!filas.length) for (let c = 1; c <= 12; c++) reg.poner(c, 2, '', E.texto);

  // ===== Hoja Datos =====
  const dat = new Hoja('Datos');
  dat.anchos = [14, 11, 11, 2, 16, 10, 2, 12, 10, 2, 8, 10, 2, 32, 10, 6, 6, 2, 22, 14, 10, 2, 34, 10, 2, 18, 14];
  dat.poner(1, 1, 'Datos del tablero — se calculan solos desde la hoja Registros', E.seccion);
  dat.poner(1, 2, 'Filtro comuna', E.filtroEtiqueta);
  dat.poner(2, 2, filtroComuna === 'Todas' ? '*' : filtroComuna, 0, { formula: 'IF(Tablero!$D$5="Todas","*",Tablero!$D$5)' });
  dat.poner(1, 3, 'Filtro edad', E.filtroEtiqueta);
  dat.poner(2, 3, filtroEdad === 'Todas' ? '*' : filtroEdad, 0, { formula: 'IF(Tablero!$H$5="Todas","*",Tablero!$H$5)' });

  // Por día (30 días)
  ['Fecha', 'Registros', 'Acumulado'].forEach((t, i) => dat.poner(1 + i, 5, t, E.encabezado));
  const dias = [];
  for (let i = 0; i < 30; i++) {
    const serie = hoySerie - 29 + i;
    const f = 6 + i;
    const total = cuenta((r) => r.serie === serie);
    const acum = cuenta((r) => r.serie <= serie);
    dias.push({ serie, total, acum });
    dat.poner(1, f, serie, E.fechaCorta, { formula: i === 0 ? 'TODAY()-29' : `A${f - 1}+1` });
    dat.poner(2, f, total, E.entero, { formula: `COUNTIFS(${CRIT},${rF},A${f})` });
    dat.poner(3, f, acum, E.entero, { formula: `COUNTIFS(${CRIT},${rF},"<="&A${f})` });
  }

  // Por comuna
  const listaComunas = [...new Set(filas.map((r) => r.comuna))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  ['Comuna', 'Personas'].forEach((t, i) => dat.poner(5 + i, 5, t, E.encabezado));
  const comunas = listaComunas.map((c, i) => {
    const total = cuenta((r) => r.comuna === c);
    dat.poner(5, 6 + i, c, E.texto);
    dat.poner(6, 6 + i, total, E.entero, { formula: `COUNTIFS(${CRIT},${rC},E${6 + i})` });
    return { c, total };
  });
  const finComunas = 5 + Math.max(comunas.length, 1);

  // Por edad
  ['Rango', 'Personas'].forEach((t, i) => dat.poner(8 + i, 5, t, E.encabezado));
  const edades = RANGOS.map(([nombre], i) => {
    const total = cuenta((r) => r.rango === nombre);
    dat.poner(8, 6 + i, nombre, E.texto);
    dat.poner(9, 6 + i, total, E.entero, { formula: `COUNTIFS(${CRIT},${rE},H${6 + i})` });
    return total;
  });

  // Día de la semana
  ['Día', 'Personas'].forEach((t, i) => dat.poner(11 + i, 5, t, E.encabezado));
  const semana = DIAS.map((d, i) => {
    const total = cuenta((r) => r.dia === d);
    dat.poner(11, 6 + i, d, E.texto);
    dat.poner(12, 6 + i, total, E.entero, { formula: `COUNTIFS(${CRIT},${rD},K${6 + i})` });
    return total;
  });

  // Hora del día
  ['Franja', 'Personas', 'Desde', 'Hasta'].forEach((t, i) => dat.poner(14 + i, 5, t, E.encabezado));
  const franjas = FRANJAS.map(([nombre, a, b], i) => {
    const total = cuenta((r) => r.hora >= a && r.hora < b);
    const f = 6 + i;
    dat.poner(14, f, nombre, E.texto);
    dat.poner(15, f, total, E.entero, { formula: `COUNTIFS(${CRIT},${rHo},">="&P${f},${rHo},"<"&Q${f})` });
    dat.poner(16, f, a, E.entero);
    dat.poner(17, f, b, E.entero);
    return total;
  });

  // Barrios (todos, ordenados por total)
  ['Barrio', 'Comuna', 'Personas'].forEach((t, i) => dat.poner(19 + i, 5, t, E.encabezado));
  const mapaBarrios = new Map();
  for (const r of filas) {
    const k = `${r.barrio}|${r.comuna}`;
    mapaBarrios.set(k, (mapaBarrios.get(k) || 0) + 1);
  }
  const barrios = [...mapaBarrios.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k.split('|'));
  const barriosCuenta = barrios.map(([b, c], i) => {
    const total = cuenta((r) => r.barrio === b && r.comuna === c);
    dat.poner(19, 6 + i, b, E.texto);
    dat.poner(20, 6 + i, c, E.texto);
    dat.poner(21, 6 + i, total, E.entero, { formula: `COUNTIFS(${CRIT},${rB},S${6 + i},${rC},T${6 + i})` });
    return total;
  });
  const finBarrios = 5 + Math.max(barrios.length, 1);
  const topBarrios = Math.min(8, Math.max(barrios.length, 1));

  // Encuesta destacada (votos tal como están en la app)
  const enc = opciones.encuesta;
  dat.poner(23, 4, enc ? enc.pregunta : 'Sin encuestas', E.filtroEtiqueta);
  ['Opción', 'Votos'].forEach((t, i) => dat.poner(23 + i, 5, t, E.encabezado));
  const opcionesEnc = enc ? enc.opciones : [{ texto: 'Sin datos', votos: 0 }];
  opcionesEnc.forEach((o, i) => { dat.poner(23, 6 + i, o.texto, E.texto); dat.poner(24, 6 + i, o.votos, E.entero); });

  // Listas para los filtros desplegables
  dat.poner(26, 5, 'Lista comunas', E.encabezado);
  dat.poner(27, 5, 'Lista edades', E.encabezado);
  ['Todas', ...listaComunas].forEach((c, i) => dat.poner(26, 6 + i, c, E.texto));
  ['Todas', ...RANGOS.map((r) => r[0])].forEach((c, i) => dat.poner(27, 6 + i, c, E.texto));

  // ===== Hoja Tablero =====
  const tab = new Hoja('Tablero');
  tab.anchos = [2, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 2];
  tab.poner(2, 2, `Tablero de campaña · ${opciones.nombre || 'Mi campaña'}`, E.titulo);
  tab.altos.set(2, 30);
  const fechaTxt = ahora.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' });
  tab.poner(2, 3, `Generado el ${fechaTxt}. Todas las cifras se calculan con fórmulas desde la hoja Registros.`, E.subtitulo);

  tab.poner(3, 5, 'Comuna', E.filtroEtiqueta);
  tab.poner(4, 5, filtroComuna, E.filtro); tab.combinar(4, 5, 5, 5);
  tab.poner(7, 5, 'Rango de edad', E.filtroEtiqueta);
  tab.poner(8, 5, filtroEdad, E.filtro); tab.combinar(8, 5, 9, 5);
  tab.poner(11, 5, '◄ Cambie los filtros y todo el tablero se actualiza', E.subtitulo);
  tab.altos.set(5, 22);
  tab.validaciones.push(`<dataValidation type="list" allowBlank="0" showInputMessage="1" showErrorMessage="1" sqref="D5"><formula1>Datos!$Z$6:$Z$${6 + listaComunas.length}</formula1></dataValidation>`);
  tab.validaciones.push(`<dataValidation type="list" allowBlank="0" showInputMessage="1" showErrorMessage="1" sqref="H5"><formula1>Datos!$AA$6:$AA$${6 + RANGOS.length}</formula1></dataValidation>`);

  const total = vista.length;
  const semana7 = cuenta((r) => r.serie >= hoySerie - 6);
  const previa7 = cuenta((r) => r.serie >= hoySerie - 13 && r.serie <= hoySerie - 7);
  const edadProm = vista.length ? Math.round(vista.reduce((s, r) => s + r.edad, 0) / vista.length) : 0;
  const kpis = [
    ['PERSONAS REGISTRADAS', total, `COUNTIFS(${CRIT})`, true],
    ['HOY', cuenta((r) => r.serie === hoySerie), `COUNTIFS(${CRIT},${rF},TODAY())`],
    ['ÚLTIMOS 7 DÍAS', semana7, `COUNTIFS(${CRIT},${rF},">="&(TODAY()-6))`],
    ['CRECIMIENTO SEMANAL', previa7 ? semana7 / previa7 - 1 : 0,
      `IFERROR(COUNTIFS(${CRIT},${rF},">="&(TODAY()-6))/COUNTIFS(${CRIT},${rF},">="&(TODAY()-13),${rF},"<="&(TODAY()-7))-1,0)`, false, true],
    ['EDAD PROMEDIO', edadProm, `IFERROR(ROUND(AVERAGEIFS(${rEd},${CRIT}),0),0)`],
    ['COMUNAS', comunas.filter((c) => c.total > 0).length, `COUNTIF(Datos!$F$6:$F$${finComunas},">0")`],
    ['BARRIOS', barriosCuenta.filter((t) => t > 0).length, `COUNTIF(Datos!$U$6:$U$${finBarrios},">0")`],
    ['VOTOS EN ENCUESTAS', opciones.votos || 0, null],
  ];
  kpis.forEach(([etiqueta, valor, formula, destacado, pct], i) => {
    const c = 2 + i * 2;
    tab.poner(c, 7, etiqueta, destacado ? E.kpiDestacadoEtiqueta : E.kpiEtiqueta);
    tab.poner(c + 1, 7, '', destacado ? E.kpiDestacadoEtiqueta : E.kpiEtiqueta);
    tab.combinar(c, 7, c + 1, 7);
    const estilo = destacado ? E.kpiDestacadoNum : pct ? E.kpiPct : E.kpiNum;
    tab.poner(c, 8, valor, estilo, formula ? { formula } : {});
    tab.poner(c + 1, 8, '', estilo);
    tab.combinar(c, 8, c + 1, 8);
  });
  tab.altos.set(7, 20);
  tab.altos.set(8, 40);
  tab.poner(2, 86, 'Desarrollado por Opita Digital · © Todos los derechos reservados', E.pie);

  // Gráficas (filas/columnas base 0 para el dibujo)
  const D = (c, f1, f2) => `Datos!$${c}$${f1}:$${c}$${f2}`;
  const graficas = [
    { pos: [1, 9, 11, 26], tipo: 'barras', titulo: 'Registros por día · últimos 30 días', nombreSerie: 'Registros',
      cat: { ref: D('A', 6, 35), valores: dias.map((d) => d.serie), numerica: true, formato: 'd mmm' }, val: { ref: D('B', 6, 35), valores: dias.map((d) => d.total) } },
    { pos: [11, 9, 17, 26], tipo: 'dona', titulo: 'Hora del registro', nombreSerie: 'Personas',
      cat: { ref: D('N', 6, 9), valores: FRANJAS.map((f) => f[0]) }, val: { ref: D('O', 6, 9), valores: franjas } },
    { pos: [1, 27, 9, 44], tipo: 'linea', titulo: 'Crecimiento acumulado', nombreSerie: 'Acumulado',
      cat: { ref: D('A', 6, 35), valores: dias.map((d) => d.serie), numerica: true, formato: 'd mmm' }, val: { ref: D('C', 6, 35), valores: dias.map((d) => d.acum) } },
    { pos: [9, 27, 17, 44], tipo: 'barras', titulo: 'Día de la semana', nombreSerie: 'Personas',
      cat: { ref: D('K', 6, 12), valores: DIAS }, val: { ref: D('L', 6, 12), valores: semana } },
    { pos: [1, 45, 9, 64], tipo: 'barras', dir: 'bar', titulo: 'Personas por comuna', nombreSerie: 'Personas',
      cat: { ref: D('E', 6, finComunas), valores: comunas.length ? comunas.map((c) => c.c) : [''] }, val: { ref: D('F', 6, finComunas), valores: comunas.length ? comunas.map((c) => c.total) : [0] } },
    { pos: [9, 45, 17, 64], tipo: 'barras', titulo: 'Personas por rango de edad', nombreSerie: 'Personas',
      cat: { ref: D('H', 6, 11), valores: RANGOS.map((r) => r[0]) }, val: { ref: D('I', 6, 11), valores: edades } },
    { pos: [1, 65, 9, 84], tipo: 'barras', dir: 'bar', titulo: 'Barrios más fuertes', nombreSerie: 'Personas', color: 'B08A3E',
      cat: { ref: D('S', 6, 5 + topBarrios), valores: barrios.length ? barrios.slice(0, 8).map((b) => b[0]) : [''] }, val: { ref: D('U', 6, 5 + topBarrios), valores: barrios.length ? barriosCuenta.slice(0, 8) : [0] } },
    { pos: [9, 65, 17, 84], tipo: 'barras', dir: 'bar', titulo: enc ? `Encuesta: ${enc.pregunta}`.slice(0, 80) : 'Encuesta destacada', nombreSerie: 'Votos', color: '0E1B2C',
      cat: { ref: D('W', 6, 5 + opcionesEnc.length), valores: opcionesEnc.map((o) => o.texto) }, val: { ref: D('X', 6, 5 + opcionesEnc.length), valores: opcionesEnc.map((o) => o.votos) } },
  ];

  // ===== Ensamblar el paquete =====
  const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const archivos = [];
  const agregar = (nombre, datos) => archivos.push({ nombre, datos });
  agregar('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
<Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
${graficas.map((_, i) => `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join('\n')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);
  agregar('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${NS_REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const iso = ahora.toISOString().replace(/\.\d+Z$/, 'Z');
  agregar('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(`Tablero de campaña · ${opciones.nombre || ''}`)}</dc:title><dc:creator>Opita Digital</dc:creator><cp:keywords>Opita Digital</cp:keywords><dc:rights>© Opita Digital. Todos los derechos reservados.</dc:rights><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`);
  agregar('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Opita Digital</Application><Company>Opita Digital</Company></Properties>`);
  agregar('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS_REL}"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="Tablero" sheetId="1" r:id="rId1"/><sheet name="Datos" sheetId="2" r:id="rId2"/><sheet name="Registros" sheetId="3" r:id="rId3"/></sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
  agregar('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS_REL}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${NS_REL}/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`);
  agregar('xl/styles.xml', ESTILOS);
  tab.color = 'C9A45C';
  agregar('xl/worksheets/sheet1.xml', tab.xml({ drawing: true, cuadricula: false, unaPagina: true }));
  agregar('xl/worksheets/sheet2.xml', dat.xml());
  agregar('xl/worksheets/sheet3.xml', reg.xml({ congelar: true, tabla: true }));
  agregar('xl/worksheets/_rels/sheet1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
  agregar('xl/worksheets/_rels/sheet3.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/table" Target="../tables/table1.xml"/></Relationships>`);
  agregar('xl/tables/table1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="TablaRegistros" displayName="TablaRegistros" ref="A1:L${ultima}" totalsRowShown="0"><autoFilter ref="A1:L${ultima}"/><tableColumns count="12">${columnas.map((c, i) => `<tableColumn id="${i + 1}" name="${esc(c)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`);
  const logo = LOGO ? { ancho: LOGO.readUInt32BE(16), alto: LOGO.readUInt32BE(20) } : null;
  agregar('xl/drawings/drawing1.xml', dibujoXml(graficas.map((g) => g.pos), logo));
  agregar('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${graficas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/chart" Target="../charts/chart${i + 1}.xml"/>`).join('')}${
  logo ? `<Relationship Id="rId${graficas.length + 1}" Type="${NS_REL}/image" Target="../media/logo.png"/>` : ''}</Relationships>`);
  if (LOGO) agregar('xl/media/logo.png', LOGO);
  graficas.forEach((g, i) => agregar(`xl/charts/chart${i + 1}.xml`, graficaXml(g)));

  return crearZip(archivos);
}

module.exports = { crearExcelTablero, serieExcel };
