/**
 * Recibe todo lo que llega del sitio y lo guarda en esta Hoja de cálculo:
 *   - Pestaña "Pedidos": pedidos del catálogo.
 *   - Pestaña "Cotizaciones": talleres (avisos y privados) y cotizaciones de empresas o eventos.
 * Manda un correo a tu mamá por cada uno y una confirmación al cliente si dejó correo.
 *
 * Instalación (5 min, gratis):
 * 1. Crea una Hoja de cálculo nueva en Google Drive (con la cuenta de Gmail de tu mamá).
 * 2. Extensiones → Apps Script. Borra lo que haya y pega este archivo.
 * 3. Cambia CORREO_AVISOS abajo.
 * 4. Implementar → Nueva implementación → Tipo: Aplicación web.
 *    Ejecutar como: Yo.  Quién tiene acceso: Cualquier usuario.
 * 5. Autoriza los permisos y copia la URL que termina en /exec.
 * 6. Pégala en js/comun.js → CONFIG.scriptUrl.
 * Si cambias este código después: Implementar → Administrar implementaciones → editar → Nueva versión.
 */

const CORREO_AVISOS = "correo-de-tu-mama@gmail.com";

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  if (d.items && d.items.length) pedido(d); else cotizacion(d);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function hoja(nombre, encabezados) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(nombre);
  if (!h) h = libro.insertSheet(nombre);
  if (h.getLastRow() === 0) { h.appendRow(encabezados); h.setFrozenRows(1); }
  return h;
}

function pedido(d) {
  const h = hoja("Pedidos", ["Fecha", "Folio", "Nombre", "Contactar por", "WhatsApp", "Instagram", "Correo", "Tipo", "Empresa / evento", "Entrega", "Ciudad (envío)", "Para cuándo", "Piezas", "Subtotal", "Notas", "Estado"]);
  const piezas = d.items.map(i => i.cantidad + " × " + i.nombre).join("\n");
  h.appendRow([new Date(), d.folio, d.nombre, d.via, d.telefono ? "'" + d.telefono : "", d.instagram ? "@" + d.instagram : "", d.email, d.tipo, d.empresa, d.entrega, d.ciudad, d.fecha, piezas, d.subtotal, d.notas, "Nuevo"]);

  const filas = d.items.map(i =>
    `<tr><td>${esc(i.nombre)}</td><td align="center">${i.cantidad}</td><td align="right">$${i.total.toLocaleString("es-MX")}</td></tr>`).join("");
  const tabla = `<table cellpadding="6" style="border-collapse:collapse;font-family:Georgia,serif">
      <tr style="border-bottom:1px solid #ccc"><th align="left">Pieza</th><th>Cant.</th><th align="right">Total</th></tr>${filas}
      <tr><td colspan="2"><b>Subtotal estimado</b></td><td align="right"><b>$${d.subtotal.toLocaleString("es-MX")} MXN</b></td></tr></table>`;

  MailApp.sendEmail({
    to: CORREO_AVISOS,
    subject: `Nuevo pedido ${d.folio} · ${d.tipo} · ${d.nombre} · $${d.subtotal.toLocaleString("es-MX")}`,
    replyTo: d.email || CORREO_AVISOS,
    htmlBody: contacto(d) +
      `<p>Tipo: <b>${esc(d.tipo)}</b>${d.empresa ? " · " + esc(d.empresa) : ""}</p>
      <p>Entrega: ${esc(d.entrega)} ${d.ciudad ? "(" + esc(d.ciudad) + ")" : ""}<br>Para: ${esc(d.fecha || "sin fecha")}</p>
      ${tabla}${d.notas ? "<p><b>Notas:</b> " + esc(d.notas) + "</p>" : ""}`
  });
  confirmar(d, `Recibimos tu pedido ${d.folio}`,
    `<p>Gracias por tu pedido. Te escribiremos ${porVia(d)} en menos de 24 horas para confirmar disponibilidad, entrega y forma de pago.</p>
     ${tabla}<p style="color:#777">Precios sujetos a confirmación. No incluye envío.</p>`);
}

function cotizacion(d) {
  const h = hoja("Cotizaciones", ["Fecha", "Folio", "Tipo", "Nombre", "Contactar por", "WhatsApp", "Instagram", "Correo", "Empresa / evento", "Qué necesita", "Taller", "Piezas o personas", "Fecha tentativa", "Lugar", "Notas", "Estado"]);
  h.appendRow([new Date(), d.folio, d.tipo, d.nombre, d.via, d.telefono ? "'" + d.telefono : "", d.instagram ? "@" + d.instagram : "", d.email, d.empresa, d.idea, d.taller, d.personas, d.fecha, d.lugar, d.notas, "Nuevo"]);

  const linea = (k, v) => v ? `${k}: ${esc(v)}<br>` : "";
  MailApp.sendEmail({
    to: CORREO_AVISOS,
    subject: `${d.tipo} ${d.folio} · ${d.nombre}`,
    replyTo: d.email || CORREO_AVISOS,
    htmlBody: contacto(d) + `<p>${linea("Tipo", d.tipo)}${linea("Empresa o evento", d.empresa)}${linea("Qué necesita", d.idea)}${linea("Taller", d.taller)}${linea("Piezas o personas", d.personas)}${linea("Fecha", d.fecha)}${linea("Lugar", d.lugar)}${linea("Notas", d.notas)}</p>`
  });
  const aviso = d.tipo === "Aviso de taller";
  confirmar(d, aviso ? "Te avisaremos de los próximos talleres" : `Recibimos tu solicitud ${d.folio}`,
    aviso ? `<p>Gracias. Te escribiremos ${porVia(d)} en cuanto abramos fechas.</p>`
          : `<p>Gracias. Te escribiremos ${porVia(d)} en menos de 24 horas con una propuesta.</p>`);
}

function contacto(d) {
  const partes = [];
  if (d.telefono) partes.push(`<a href="https://wa.me/52${String(d.telefono).slice(-10)}">WhatsApp ${esc(d.telefono)}</a>`);
  if (d.instagram) partes.push(`<a href="https://instagram.com/${encodeURIComponent(d.instagram)}">Instagram @${esc(d.instagram)}</a>`);
  if (d.email) partes.push(esc(d.email));
  return `<p><b>${esc(d.nombre)}</b> · prefiere <b>${esc(d.via || "WhatsApp")}</b></p><p>${partes.join(" · ")}</p>`;
}

function confirmar(d, asunto, cuerpo) {
  if (!d.email) return;
  MailApp.sendEmail({ to: d.email, name: d.marca, replyTo: CORREO_AVISOS, subject: asunto,
    htmlBody: `<p>Hola ${esc(d.nombre)},</p>${cuerpo}<p>${esc(d.marca)}</p>` });
}

function porVia(d) { return d.via === "Instagram" ? "por Instagram" : "por WhatsApp"; }

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
