/* =====================================================================
   CONFIGURACIÓN — lo único que tienes que editar (vale para todas las páginas)
   ===================================================================== */
const CONFIG = {
  marca: "Cera que sí",
  logo: ["Cera", "que", "sí"],       // logo provisional en texto: palabra, palabra en itálica, palabra
  logoImg: "img/logo.png",            // logo para fondo claro (déjalo vacío "" para usar el logo de texto)
  logoImgClaro: "img/logo-claro.png", // logo para el pie de página oscuro
  puntos: ["Metepec", "Calimaya", "Toluca", "CDMX"], // puntos de entrega (las colonias de CDMX están en index.html)
  correo: "ceraquesimx@gmail.com",    // correo de contacto (se muestra en el sitio)
  instagram: "ceraquesi_mx",          // usuario de Instagram, sin @
  tiktok: "",                         // usuario de TikTok, sin @ (vacío = no se muestra)
  scriptUrl: "https://script.google.com/macros/s/AKfycbzxGV79Wub-O_1iUVJa59o1ntMMzXPUDeoQ0zk_K7if5xXVDgKQpU79o0fzxbfMmoxM/exec" // Google Apps Script (Pedidos Cera que sí)
};

/* Talleres abiertos. Para abrir uno, pon la fecha (ej. "Sáb 6 dic, 11:00") y el precio.
   Si fecha está vacía, sale como "Sin fechas por ahora" y la gente puede pedir que le avisen. */
const TALLERES = [
  { id: "navidad", titulo: "Velas navideñas", desc: "Haz tu propia vela de pino de cera de soya y decórala para llevar a casa.",
    fecha: "", lugar: "Metepec", duracion: "2 horas aprox.", cupo: "10 personas", precio: "" },
  { id: "suculenta", titulo: "Vela en vaso con suculenta", desc: "Vacía tu vela en vaso y decórala con una suculenta de cera hecha por ti.",
    fecha: "", lugar: "Calimaya", duracion: "2 horas aprox.", cupo: "10 personas", precio: "" }
];

/* ===================================================================== */
const $ = s => document.querySelector(s);
const mxn = n => "$" + n.toLocaleString("es-MX") + " MXN";
/* Mensaje directo de Instagram (el número de WhatsApp de la marca no se muestra: tu mamá contacta a cada cliente) */
const dmLink = () => "https://ig.me/m/" + CONFIG.instagram;
const esc = t => String(t || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function folioNuevo(pref) {
  return pref + "-" + new Date().toISOString().slice(5, 10).replace("-", "") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}
async function enviarAlScript(data) {
  if (!CONFIG.scriptUrl) return;
  await fetch(CONFIG.scriptUrl, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
}
const igUrl = () => "https://instagram.com/" + CONFIG.instagram;
const porVia = via => via === "Instagram" ? "por Instagram" : "por WhatsApp";

/* Contacto: WhatsApp o Instagram. Devuelve los datos de contacto, o null si falta algo. */
function validarContacto(f, err) {
  const nombre = f.nombre.value.trim();
  const via = f.via ? f.via.value : "WhatsApp";
  const telefono = f.telefono.value.replace(/\D/g, "");
  const instagram = f.instagram ? f.instagram.value.trim().replace(/^@+/, "").replace(/\s/g, "") : "";
  if (!nombre) { err.textContent = "Escribe tu nombre."; f.nombre.focus(); return null; }
  if (via === "WhatsApp" && telefono.length < 10) { err.textContent = "Escribe un número de WhatsApp de 10 dígitos."; f.telefono.focus(); return null; }
  if (via === "Instagram" && !instagram) { err.textContent = "Escribe tu usuario de Instagram."; f.instagram.focus(); return null; }
  if (telefono && telefono.length < 10) { err.textContent = "Revisa tu número: deben ser 10 dígitos, o déjalo vacío."; f.telefono.focus(); return null; }
  if (f.email && f.email.value && !f.email.checkValidity()) { err.textContent = "Revisa tu correo o déjalo vacío."; f.email.focus(); return null; }
  return { nombre, via, telefono, instagram, email: f.email ? f.email.value.trim() : "" };
}
function syncVia(f) {
  if (!f || !f.via) return;
  const ig = f.via.value === "Instagram";
  const campo = f.querySelector("[data-campo-ig]"); if (campo) campo.hidden = !ig;
  const lbl = f.querySelector("[data-lbl-tel]"); if (lbl) lbl.textContent = ig ? "Celular (opcional)" : "WhatsApp";
}
document.addEventListener("change", e => { if (e.target.name === "via") syncVia(e.target.form); });

/* Botones después de enviar: mandar el resumen por WhatsApp o escribir por Instagram */
function botonesResumen(resumen, folio) {
  return `<p style="margin-top:22px">¿Prefieres adelantarte?</p>
    <div class="botones-resumen">
      <a class="wa" href="${dmLink()}" target="_blank" rel="noopener">Escríbenos por Instagram</a>
    </div>
    <p class="ayuda" style="margin-top:12px">Si nos escribes, mándanos tu folio ${folio}.</p>`;
}

/* Menú hamburguesa en celular */
(function () {
  const btn = document.getElementById("menu-btn"), nav = document.querySelector(".nav");
  if (!btn || !nav) return;
  const cerrar = () => { nav.classList.remove("menu-abierto"); document.documentElement.classList.remove("sin-scroll"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Abrir menú"); };
  btn.addEventListener("click", () => {
    nav.style.setProperty("--alto-nav", Math.max(0, nav.getBoundingClientRect().bottom) + "px");
    const abierto = nav.classList.toggle("menu-abierto");
    document.documentElement.classList.toggle("sin-scroll", abierto);
    btn.setAttribute("aria-expanded", abierto); btn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
  });
  document.querySelectorAll("#menu-principal a").forEach(a => a.addEventListener("click", cerrar));
  document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("menu-abierto")) { cerrar(); btn.focus(); } });
  addEventListener("resize", () => { if (innerWidth > 820) cerrar(); });
})();

/* Encabezado y pie, iguales en todas las páginas */
(function () {
  document.querySelectorAll("[data-c]").forEach(el => el.textContent = CONFIG[el.dataset.c]);
  document.querySelectorAll("[data-logo]").forEach(el => {
    if (CONFIG.logoImg) {
      const enPie = !!el.closest("footer");
      el.closest(".logo").innerHTML = `<img class="logo-img" src="${enPie && CONFIG.logoImgClaro ? CONFIG.logoImgClaro : CONFIG.logoImg}" alt="${CONFIG.marca}">`;
      return;
    }
    const [a, b, c] = CONFIG.logo; el.innerHTML = `${a} <span class="de">${b}</span> ${c}`;
  });
  const anio = $("#anio"); if (anio) anio.textContent = new Date().getFullYear();
  ["#ig-footer", "#ig-top"].forEach(sel => { const ig = $(sel); if (ig) { if (CONFIG.instagram) ig.href = igUrl(); else ig.remove(); } });
  const redes = { correo: CONFIG.correo && "mailto:" + CONFIG.correo, instagram: CONFIG.instagram && igUrl(), tiktok: CONFIG.tiktok && "https://www.tiktok.com/@" + CONFIG.tiktok };
  document.querySelectorAll("[data-red]").forEach(a => { const url = redes[a.dataset.red]; if (url) a.href = url; else a.remove(); });
  const n = $("#contador");
  if (n) { try { const p = JSON.parse(localStorage.getItem("pedido") || "{}"); n.textContent = Object.values(p).reduce((a, b) => a + b, 0); } catch (e) {} }
})();
