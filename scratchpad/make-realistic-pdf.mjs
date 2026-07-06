import fs from 'node:fs';

// PDF minimo valido (sin dependencias externas) con un perfil de LinkedIn REALISTA:
// about ~400 palabras, 3 experiencias, skills largos, recomendaciones.
// Objetivo: forzar al modelo a generar una respuesta completa (no un caso trivial
// que subestime el tiempo real de generacion).

const about400 = `Llevo mas de 12 anos ayudando a empresas B2B de tecnologia y servicios profesionales a
estructurar procesos de ventas predecibles. Empece mi carrera como comercial de campo en el sector
industrial, donde aprendi que la mayoria de los equipos comerciales dependen de referidos y contactos
personales del fundador, y que ese modelo deja de escalar en cuanto la empresa crece por encima de
cierto tamano. Desde 2014 me especialice en diseñar sistemas de prospeccion outbound combinados con
contenido en LinkedIn, trabajando primero como consultora independiente y despues fundando mi propia
agencia de estrategia comercial B2B. He acompanado a mas de 60 empresas de software, consultoria y
servicios profesionales en Espana, Mexico y Colombia, ayudandolas a pasar de depender de referidos a
tener un pipeline propio y predecible. Mi metodologia combina cuatro pilares: diagnostico comercial
profundo del ICP real de la empresa, diseno de un sistema de prospeccion multicanal, activacion y
formacion del equipo comercial existente, y optimizacion continua basada en metricas semanales de
conversion. Los resultados tipicos de mis clientes incluyen incrementos de entre el 25% y el 45% en
el pipeline cualificado durante los primeros noventa dias de colaboracion, y una reduccion notable en
la dependencia de referidos como unica fuente de oportunidades comerciales. Ademas de la consultoria,
imparto formacion in-company sobre venta consultiva B2B y social selling en LinkedIn, y colaboro
regularmente con aceleradoras y programas de mentoria para startups en fase de escalado comercial.
Creo firmemente que la venta B2B moderna no se trata de presionar al cliente, sino de construir
sistemas repetibles que generen conversaciones cualificadas de forma constante, sin depender de la
suerte ni del carisma individual de una sola persona en el equipo. Estoy siempre abierta a conectar
con fundadores, directores comerciales y directores de marketing que esten pensando en profesionalizar
su motor de ventas B2B.`.replace(/\s+/g, ' ').trim();

const lines = [
  'Maria Fernandez Ruiz',
  'Fundadora en Escala Comercial B2B | Consultora de Ventas y Social Selling',
  '',
  'Madrid, Espana',
  '4.800 seguidores  500+ contactos',
  '',
  'About',
  ...wrapText(about400, 95),
  '',
  'Experiencia',
  'Fundadora y Consultora Principal, Escala Comercial B2B (2019 - actualidad)',
  ...wrapText('Diseno e implementacion de sistemas de prospeccion B2B para mas de 60 empresas de software, consultoria y servicios profesionales en Espana y Latinoamerica. Incremento medio del 30% en pipeline cualificado en los primeros 90 dias. Formacion in-company en venta consultiva y social selling.', 95),
  '',
  'Consultora Senior de Ventas, Grupo Comercial Iberia (2016 - 2019)',
  ...wrapText('Responsable de estrategia comercial para cuentas key account del sector industrial y tecnologico. Liderazgo de equipo de 8 comerciales, implementacion de CRM y metodologia de venta consultiva. Incremento del 20% en tasa de cierre.', 95),
  '',
  'Comercial de Campo, Industrias del Norte SA (2012 - 2016)',
  ...wrapText('Prospeccion y venta de soluciones industriales B2B en la zona centro de Espana. Gestion de cartera de mas de 120 cuentas activas. Premio al mejor comercial del año 2015.', 95),
  '',
  'Destacados',
  'Sin destacados configurados',
  '',
  'Skills',
  'Ventas B2B, Estrategia comercial, LinkedIn, Negociacion, Liderazgo, Social Selling,',
  'Prospeccion outbound, CRM, Formacion comercial, Venta consultiva, Gestion de equipos,',
  'Key Account Management',
  '',
  'Recomendaciones',
  '6 recomendaciones de clientes, colaboradores y antiguos jefes.',
];

function wrapText(text, width) {
  const words = text.split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) {
      out.push(cur.trim());
      cur = w;
    } else {
      cur += ' ' + w;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Multi-pagina: ~45 lineas por pagina a 11pt con TL 14
const LINES_PER_PAGE = 50;
const pages = [];
for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
  pages.push(lines.slice(i, i + LINES_PER_PAGE));
}

const objects = [];
let objIndex = 1;
const catalogNum = objIndex++;
const pagesNum = objIndex++;
const fontNum = objIndex++;

const pageNums = [];
const contentNums = [];
for (let p = 0; p < pages.length; p++) {
  pageNums.push(objIndex++);
  contentNums.push(objIndex++);
}

objects[catalogNum] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
objects[pagesNum] = `<< /Type /Pages /Kids [${pageNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
objects[fontNum] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

for (let p = 0; p < pages.length; p++) {
  let content = 'BT /F1 11 Tf 50 780 Td 14 TL\n';
  for (const line of pages[p]) {
    content += `(${esc(line)}) Tj T*\n`;
  }
  content += 'ET';
  objects[pageNums[p]] = `<< /Type /Page /Parent ${pagesNum} 0 R /Resources << /Font << /F1 ${fontNum} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentNums[p]} 0 R >>`;
  objects[contentNums[p]] = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`;
}

const totalObjs = objIndex - 1;
let pdf = '%PDF-1.4\n';
const offsets = [0];
for (let i = 1; i <= totalObjs; i++) {
  offsets[i] = Buffer.byteLength(pdf);
  pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= totalObjs; i++) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${totalObjs + 1} /Root ${catalogNum} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

const outPath = process.argv[2] || 'realistic-profile.pdf';
fs.writeFileSync(outPath, pdf, 'latin1');
console.log('PDF realista escrito:', outPath, Buffer.byteLength(pdf), 'bytes,', pages.length, 'pagina(s)');
