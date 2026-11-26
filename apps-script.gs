/**
 * Cera que sí: recibe lo que llega del sitio, lo guarda en la hoja "Pedidos Cera que sí"
 * y manda correos desde ceraquesimx@gmail.com:
 *   - Pestaña "Pedidos": pedidos del catálogo. Aviso a ceraquesimx@gmail.com + copia al cliente.
 *   - Pestaña "Cotizaciones": talleres y cotizaciones de empresas o eventos.
 *   - Aviso corto aparte a CORREO_REGINA (correo separado, sin datos de contacto del cliente).
 * Estado: lista desplegable con colores. Para volver a aplicar el formato a mano: ejecutar darFormato().
 * Si cambias este código: Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar.
 */

const CORREO_AVISOS = "ceraquesimx@gmail.com";
const CORREO_REGINA = ""; // aviso corto aparte. El correo real se pone solo en el editor de Apps Script (este repo es público).
const HOJA_ID = "1sM-zDKOA0WUoQ_QWfnetCN43KgW485WZ-1NUUTj6cPI";
const INSTAGRAM = "ceraquesi_mx";

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.items && d.items.length) pedido(d); else cotizacion(d);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

const ENC_PEDIDOS = ["Fecha", "Folio", "Nombre", "WhatsApp", "Instagram", "Correo", "Tipo", "Marca / empresa / evento", "Personalización", "Entrega", "Dirección de envío", "Para cuándo", "Piezas", "Subtotal", "Notas", "Estado"];
const ENC_COTIZ = ["Fecha", "Folio", "Tipo", "Nombre", "WhatsApp", "Instagram", "Correo", "Empresa / evento", "Qué necesita", "Taller", "Piezas o personas", "Fecha tentativa", "Lugar", "Notas", "Estado"];

// Estados y su color (fondo, texto)
const ESTADOS_PEDIDO = [
  ["Nuevo", "#E2C7BC", "#3A2A22"],
  ["En contacto", "#F1E3B8", "#3A2A22"],
  ["Anticipo pagado", "#D7DEC2", "#3A2A22"],
  ["En proceso", "#E6D3B8", "#3A2A22"],
  ["Listo para entregar", "#A4A68F", "#1F1B18"],
  ["Entregado", "#6B5A3A", "#EDE6D8"],
  ["Cancelado", "#D6CEBD", "#5E5247"]
];
const ESTADOS_COTIZ = [
  ["Nuevo", "#E2C7BC", "#3A2A22"],
  ["En contacto", "#F1E3B8", "#3A2A22"],
  ["Propuesta enviada", "#E6D3B8", "#3A2A22"],
  ["Confirmado", "#A4A68F", "#1F1B18"],
  ["Terminado", "#6B5A3A", "#EDE6D8"],
  ["Cancelado", "#D6CEBD", "#5E5247"]
];

function hoja(nombre, encabezados) {
  const libro = SpreadsheetApp.openById(HOJA_ID);
  let h = libro.getSheetByName(nombre);
  if (!h) h = libro.insertSheet(nombre);
  h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  return h;
}

function formato(h, encabezados, estados, anchos) {
  const n = encabezados.length, filas = Math.max(h.getMaxRows() - 1, 1);
  h.setFrozenRows(1);
  h.setFrozenColumns(3);
  h.getRange(1, 1, 1, n).setValues([encabezados]).setFontWeight("bold").setFontFamily("Courier Prime")
    .setBackground("#3A2A22").setFontColor("#EDE6D8").setVerticalAlignment("middle").setWrap(true);
  h.setRowHeight(1, 36);
  const datos = h.getRange(2, 1, filas, n);
  datos.setFontFamily("Hanken Grotesk").setVerticalAlignment("top").setWrap(true).setFontColor("#1F1B18");
  h.getRange(2, 1, filas, 1).setNumberFormat("d mmm yyyy, h:mm");
  anchos.forEach((w, i) => h.setColumnWidth(i + 1, w));
  // Estado: lista desplegable + colores
  const est = h.getRange(2, n, filas, 1);
  est.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(estados.map(e => e[0]), true).setAllowInvalid(false).build())
    .setFontWeight("bold").setHorizontalAlignment("center");
  h.setConditionalFormatRules(estados.map(([v, fondo, texto]) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(v).setBackground(fondo).setFontColor(texto).setRanges([est]).build()));
  // Bordes suaves entre filas
  datos.setBorder(null, null, null, null, null, true, "#D6CEBD", SpreadsheetApp.BorderStyle.SOLID);
}

function formatoPedidos(h) {
  formato(h, ENC_PEDIDOS, ESTADOS_PEDIDO, [130, 110, 150, 110, 120, 190, 130, 160, 180, 200, 220, 100, 320, 100, 220, 150]);
  h.getRange(2, 14, Math.max(h.getMaxRows() - 1, 1), 1).setNumberFormat('"$"#,##0" MXN"');
}
function formatoCotiz(h) {
  formato(h, ENC_COTIZ, ESTADOS_COTIZ, [130, 110, 130, 150, 110, 120, 190, 160, 260, 140, 120, 110, 160, 220, 150]);
}

// Ejecútala a mano una vez desde el editor para dar formato a las pestañas existentes.
function darFormato() {
  formatoPedidos(hoja("Pedidos", ENC_PEDIDOS));
  formatoCotiz(hoja("Cotizaciones", ENC_COTIZ));
}

function avisoRegina(asunto, lineas) {
  if (!CORREO_REGINA) return;
  MailApp.sendEmail({
    to: CORREO_REGINA,
    name: "Avisos Cera que sí",
    subject: asunto,
    htmlBody: correo(esc(asunto), `<p style="margin:0 0 14px">${lineas.filter(Boolean).map(esc).join("<br>")}</p>
      <p style="margin:0"><a href="https://docs.google.com/spreadsheets/d/${HOJA_ID}/edit" style="color:#6E2B1E">Abrir la hoja de pedidos</a></p>`)
  });
}

const peso = n => "$" + Number(n || 0).toLocaleString("es-MX") + " MXN";
const fechaBonita = f => {
  if (!f) return "Sin fecha";
  const [a, m, d] = f.split("-").map(Number);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return d + " de " + meses[m - 1] + " de " + a;
};

function pedido(d) {
  const h = hoja("Pedidos", ENC_PEDIDOS);
  const piezas = d.items.map(i => i.cantidad + " × " + i.nombre).join("\n");
  h.appendRow([new Date(), d.folio, d.nombre, d.telefono ? "'" + d.telefono : "", d.instagram ? "@" + d.instagram : "", d.email, d.tipo, d.empresa, d.personalizacion, d.entrega, d.direccion, d.fecha, piezas, d.subtotal, d.notas, "Nuevo"]);
  try { formatoPedidos(h); } catch (x) { console.error(x); }

  // Aviso para Cera que sí
  const wa = d.telefono ? `<a href="https://wa.me/52${String(d.telefono).slice(-10)}">Escribirle por WhatsApp (${esc(d.telefono)})</a>` : "";
  const ig = d.instagram ? ` · <a href="https://instagram.com/${encodeURIComponent(d.instagram)}">@${esc(d.instagram)}</a>` : "";
  MailApp.sendEmail({
    to: CORREO_AVISOS,
    subject: `Nuevo pedido ${d.folio} · ${d.nombre} · ${peso(d.subtotal)}`,
    replyTo: d.email || CORREO_AVISOS,
    name: "Pedidos Cera que sí",
    htmlBody: correo(`Nuevo pedido ${esc(d.folio)}`,
      `<p style="margin:0 0 6px"><b>${esc(d.nombre)}</b> · ${esc(d.email)}${ig}</p><p style="margin:0 0 18px">${wa}</p>` + resumen(d) +
      `<p style="margin:18px 0 0;color:#5E5247;font-size:13px">También quedó guardado en la hoja "Pedidos Cera que sí".</p>`)
  });

  // Aviso corto aparte para Regina (sin datos de contacto del cliente)
  try {
    avisoRegina(`Nuevo pedido ${d.folio} · ${peso(d.subtotal)}`, [
      `${d.items.reduce((t, i) => t + Number(i.cantidad || 0), 0)} piezas · ${d.tipo}`,
      `Entrega: ${d.entrega}`, `Para cuándo: ${fechaBonita(d.fecha)}`]);
  } catch (x) { console.error(x); }

  // Copia para el cliente
  if (d.email) {
    MailApp.sendEmail({
      to: d.email,
      name: "Cera que sí",
      replyTo: CORREO_AVISOS,
      subject: `Recibimos tu pedido ${d.folio} · Cera que sí`,
      htmlBody: correo("Recibimos tu pedido",
        `<p style="margin:0 0 14px">Hola ${esc(d.nombre)}, gracias por tu pedido. Te escribiremos por WhatsApp en menos de 24 horas para confirmar disponibilidad, entrega y el anticipo.</p>
         <p style="margin:0 0 18px;font-family:'Courier New',monospace;font-size:13px;letter-spacing:1px">FOLIO ${esc(d.folio)}</p>` +
        resumen(d) +
        `<div style="background:#E0D8C8;border-radius:8px;padding:14px 16px;margin:20px 0 0">
           <p style="margin:0 0 6px;font-family:'Courier New',monospace;font-size:12px;letter-spacing:1px;color:#5E5247">CÓMO SE PAGA</p>
           <p style="margin:0">Para confirmar tu pedido pedimos el 50% de anticipo por transferencia o Mercado Pago. El otro 50% es contra entrega y también puede ser en efectivo. Los precios están sujetos a confirmación y no incluyen envío.</p>
         </div>
         <p style="margin:20px 0 0">¿Dudas? Responde a este correo o escríbenos en Instagram: <a href="https://instagram.com/${INSTAGRAM}" style="color:#6E2B1E">@${INSTAGRAM}</a>.</p>`)
    });
  }
}

function resumen(d) {
  const filas = d.items.map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #D6CEBD">${esc(i.nombre)}</td><td style="padding:8px;border-bottom:1px solid #D6CEBD;text-align:center">${i.cantidad}</td><td style="padding:8px 0;border-bottom:1px solid #D6CEBD;text-align:right;white-space:nowrap">${i.precio ? peso(i.total) : "Por confirmar"}</td></tr>`).join("");
  const dato = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#5E5247;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "";
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><th style="text-align:left;padding:0 0 6px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:1px;color:#5E5247">PIEZA</th><th style="padding:0 8px 6px;font-family:'Courier New',monospace;font-size:11px;color:#5E5247">CANT.</th><th style="text-align:right;padding:0 0 6px;font-family:'Courier New',monospace;font-size:11px;color:#5E5247">TOTAL</th></tr>
      ${filas}
      <tr><td colspan="2" style="padding:10px 0 0"><b>Subtotal estimado</b></td><td style="padding:10px 0 0;text-align:right;white-space:nowrap"><b>${peso(d.subtotal)}</b></td></tr></table>
    <table style="border-collapse:collapse;font-size:14px;margin-top:16px">
      ${dato("Tipo", d.tipo)}${dato("Marca / empresa", d.empresa)}${dato("Personalización", d.personalizacion)}
      ${dato("Entrega", d.entrega)}${dato("Dirección", d.direccion)}${dato("Para cuándo", fechaBonita(d.fecha))}${dato("Notas", d.notas)}
    </table>`;
}

function correo(titulo, cuerpo) {
  return `<div style="background:#EDE6D8;padding:28px 16px;font-family:Helvetica,Arial,sans-serif;color:#1F1B18;line-height:1.55">
    <div style="max-width:560px;margin:0 auto;background:#F6F2EA;border-radius:14px;padding:28px 26px">
      <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#3A2A22">Cera <i style="color:#6E2B1E">que</i> sí</p>
      <p style="margin:0 0 22px;font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;color:#5E5247">VELAS DE CERA DE SOYA HECHAS A MANO</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:30px;color:#3A2A22">${titulo}</h1>
      ${cuerpo}
    </div></div>`;
}

function cotizacion(d) {
  const h = hoja("Cotizaciones", ENC_COTIZ);
  h.appendRow([new Date(), d.folio, d.tipo, d.nombre, d.telefono ? "'" + d.telefono : "", d.instagram ? "@" + d.instagram : "", d.email, d.empresa, d.idea, d.taller, d.personas, d.fecha, d.lugar, d.notas, "Nuevo"]);
  try { formatoCotiz(h); } catch (x) { console.error(x); }
  try { avisoRegina(`${d.tipo} ${d.folio}`, [d.empresa && `Empresa o evento: ${d.empresa}`, d.personas && `Piezas o personas: ${d.personas}`, d.fecha && `Fecha: ${d.fecha}`]); } catch (x) { console.error(x); }
  const linea = (k, v) => v ? `${k}: ${esc(v)}<br>` : "";
  MailApp.sendEmail({
    to: CORREO_AVISOS,
    name: "Pedidos Cera que sí",
    subject: `${d.tipo} ${d.folio} · ${d.nombre}`,
    replyTo: d.email || CORREO_AVISOS,
    htmlBody: correo(esc(d.tipo), `<p><b>${esc(d.nombre)}</b>${d.telefono ? ` · <a href="https://wa.me/52${String(d.telefono).slice(-10)}">WhatsApp ${esc(d.telefono)}</a>` : ""}${d.email ? " · " + esc(d.email) : ""}</p><p>${linea("Empresa o evento", d.empresa)}${linea("Qué necesita", d.idea)}${linea("Taller", d.taller)}${linea("Piezas o personas", d.personas)}${linea("Fecha", d.fecha)}${linea("Lugar", d.lugar)}${linea("Notas", d.notas)}</p>`)
  });
  if (d.email) {
    const aviso = d.tipo === "Aviso de taller";
    MailApp.sendEmail({ to: d.email, name: "Cera que sí", replyTo: CORREO_AVISOS,
      subject: aviso ? "Te avisaremos de los próximos talleres · Cera que sí" : `Recibimos tu solicitud ${d.folio} · Cera que sí`,
      htmlBody: correo(aviso ? "Te avisaremos" : "Recibimos tu solicitud",
        `<p>Hola ${esc(d.nombre)}, gracias. ${aviso ? "Te escribiremos por WhatsApp en cuanto abramos fechas." : "Te escribiremos por WhatsApp en menos de 24 horas con una propuesta."}</p>`) });
  }
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
