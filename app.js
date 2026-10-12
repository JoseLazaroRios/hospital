// =====================================================================
// Control de Visitas — versión estática para GitHub Pages
// Reemplaza el backend Flask: los datos viven en localStorage del navegador
// y la sesión en sessionStorage. Usuario: Diego  |  Clave: 12345
// =====================================================================

// ---------- utilidades ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg, error = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (error ? " err" : "");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = "toast"), 2800);
}

// ---------- sesión ----------
const USUARIO = "Diego", CLAVE = "12345";
const sesion = {
  get: () => { try { return sessionStorage.getItem("usuario"); } catch { return null; } },
  set: (u) => { try { sessionStorage.setItem("usuario", u); } catch {} },
  clear: () => { try { sessionStorage.removeItem("usuario"); } catch {} },
};

// ---------- datos (simulados + localStorage) ----------
const KEY = "control_visitas_v1";
const SEED = [
  ["jose",          "73016661", "oscar",       "ll",               "2026-09-09", "17:37:34", "17:40:00"],
  ["Sofía Herrera", "71234567", "María Salas", "Gerencia",         "2026-09-09", "17:35:43", "17:40:01"],
  ["Rosa Quispe",   "48990011", "Edith Ramos", "Mesa de partes",   "2026-09-09", "14:30:00", "17:39:58"],
  ["Jorge Paredes", "42334455", "Oscar Díaz",  "Tesorería",        "2026-09-09", "11:00:00", "17:40:01"],
  ["Carmen Vega",   "47665544", "Elena Ríos",  "Legal",            "2026-09-09", "08:40:00", "09:15:00"],
  ["Luis Mendoza",  "40112233", "Pedro Núñez", "Recursos Humanos", "2026-09-08", "10:20:00", "11:05:00"],
  ["Ana Torres",    "45891234", "María Salas", "Gerencia",         "2026-09-08", "09:10:00", "09:45:00"],
].map(([nombre, dni, persona_visitada, despacho, fecha, hora_entrada, hora_salida], i) =>
  ({ id_visita: i + 1, nombre, dni, persona_visitada, despacho, fecha, hora_entrada, hora_salida }));

let memoria = null; // respaldo si localStorage no está disponible
function leerDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return memoria ?? { visitas: structuredClone(SEED), next: SEED.length + 1 };
}
function guardarDB(db) {
  memoria = db;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
}

const pad = (n) => String(n).padStart(2, "0");
const hms = (s) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

function segundos(v) {
  if (!v.hora_salida) return null;
  const ini = new Date(`${v.fecha}T${v.hora_entrada}`);
  const fin = new Date(`${v.fecha}T${v.hora_salida}`);
  return Math.max(Math.floor((fin - ini) / 1000), 0);
}

const serializar = (v) => {
  const s = segundos(v);
  return { ...v, tiempo: s !== null ? hms(s) : null };
};

// ---------- "API" local (misma lógica que app.py) ----------
const API = {
  visitas() {
    const { visitas } = leerDB();
    return [...visitas]
      .sort((a, b) => (b.fecha + b.hora_entrada).localeCompare(a.fecha + a.hora_entrada))
      .map(serializar);
  },

  entrada({ nombre, dni, visitado, despacho }) {
    nombre = (nombre || "").trim(); dni = (dni || "").trim();
    visitado = (visitado || "").trim(); despacho = (despacho || "").trim();
    if (!nombre || !dni || !visitado || !despacho) throw new Error("Completa todos los campos");
    if (!/^\d{8,12}$/.test(dni)) throw new Error("El DNI debe tener entre 8 y 12 dígitos");

    const db = leerDB();
    if (db.visitas.some(v => v.dni === dni && !v.hora_salida)) throw new Error("Ese visitante ya está en sede");
    const ahora = new Date();
    db.visitas.push({
      id_visita: db.next++, nombre, dni, persona_visitada: visitado, despacho,
      fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
      hora_entrada: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`,
      hora_salida: null,
    });
    guardarDB(db);
    return { mensaje: "Entrada registrada correctamente" };
  },

  salida(id) {
    const db = leerDB();
    const v = db.visitas.find(x => x.id_visita === id);
    if (!v) throw new Error("Visita no encontrada");
    if (v.hora_salida) throw new Error("La salida ya estaba registrada");
    const a = new Date();
    v.hora_salida = `${pad(a.getHours())}:${pad(a.getMinutes())}:${pad(a.getSeconds())}`;
    guardarDB(db);
    return { mensaje: "Salida registrada" };
  },

  reportes() {
    const { visitas } = leerDB();
    const dur = visitas.map(segundos).filter(s => s !== null);
    const prom = dur.length ? Math.floor(dur.reduce((a, b) => a + b, 0) / dur.length) : 0;
    const contar = (clave) => visitas.reduce((m, v) => m.set(v[clave], (m.get(v[clave]) || 0) + 1), new Map());
    return {
      promedio_txt: `${Math.floor(prom / 3600)} h ${Math.floor((prom % 3600) / 60)} min`,
      por_dia: [...contar("fecha")].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([fecha, total]) => ({ fecha, total })),
      por_despacho: [...contar("despacho")]
        .sort((a, b) => b[1] - a[1] || a[0].toLowerCase().localeCompare(b[0].toLowerCase()))
        .map(([despacho, total]) => ({ despacho, total })),
    };
  },
};

let TODAS = [];
const cargar = () => (TODAS = API.visitas());

function actualizarCards(lista) {
  if (!$("total")) return;
  const activos = lista.filter(v => !v.hora_salida).length;
  $("total").textContent = lista.length;
  $("activos").textContent = activos;
  $("finalizados").textContent = lista.length - activos;
}

function salida(id, btn) {
  try {
    const r = API.salida(id);
    toast("✔ " + r.mensaje);
    refrescar();
  } catch (e) { toast("❌ " + e.message, true); }
}

// ---------- LOGIN (index.html) ----------
if ($("loginForm")) {
  if (sesion.get()) location.replace("inicio.html");
  $("loginForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const u = $("usuario").value.trim(), p = $("password").value;
    if (!u || !p) return toast("⚠ Completa los campos", true);
    if (u === USUARIO && p === CLAVE) {
      sesion.set(USUARIO);
      location.href = "inicio.html";
    } else toast("❌ Usuario o contraseña incorrectos", true);
  });
}

// ---------- páginas internas: guardia + logout ----------
const page = document.body.dataset.page;
if (page) {
  if (!sesion.get()) location.replace("index.html");
  const av = $("avatar"); if (av) av.title = sesion.get() || "";
  const lo = $("logout");
  if (lo) lo.addEventListener("click", () => sesion.clear());
}

// ---------- búsqueda global ----------
const buscar = $("buscarGlobal");
if (buscar) {
  buscar.value = new URLSearchParams(location.search).get("q") || "";
  buscar.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && page !== "registros") location.href = "registros.html?q=" + encodeURIComponent(buscar.value);
  });
  if (page === "registros") buscar.addEventListener("input", () => renderRegistros());
}

// ---------- INICIO ----------
function renderActivos() {
  const act = TODAS.filter(v => !v.hora_salida);
  $("panelActivos").style.display = act.length ? "block" : "none";
  $("tablaActivos").innerHTML = act.map(v => `
    <tr><td>${esc(v.nombre)}</td><td>${esc(v.dni)}</td><td>${esc(v.persona_visitada)}</td>
    <td>${esc(v.despacho)}</td><td>${esc(v.hora_entrada)}</td>
    <td><button class="btn btn-sm" onclick="salida(${v.id_visita}, this)">Registrar salida</button></td></tr>`).join("");
}

if (page === "inicio") {
  window.refrescar = () => { cargar(); actualizarCards(TODAS); renderActivos(); };
  refrescar();
  $("btnEntrada").addEventListener("click", () => {
    const d = { nombre: $("nombre").value, dni: $("dni").value,
                visitado: $("visitado").value, despacho: $("despacho").value };
    if (Object.values(d).some(v => !v.trim())) return toast("⚠ Completa todos los campos", true);
    try {
      const r = API.entrada(d);
      toast("✔ " + r.mensaje);
      ["nombre", "dni", "visitado", "despacho"].forEach(i => ($(i).value = ""));
      refrescar();
    } catch (e) { toast("❌ " + e.message, true); }
  });
}

// ---------- REGISTROS ----------
function filtrados() {
  const f = $("filtroFecha").value, d = $("filtroDespacho").value.toLowerCase();
  const q = (buscar?.value || "").toLowerCase();
  return TODAS.filter(v =>
    (!f || v.fecha === f) &&
    (!d || v.despacho.toLowerCase().includes(d)) &&
    (!q || [v.nombre, v.dni, v.despacho, v.persona_visitada].some(x => x.toLowerCase().includes(q))));
}

function renderRegistros() {
  const lista = filtrados();
  $("tabla").innerHTML = lista.length ? lista.map(v => `
    <tr><td>${esc(v.nombre)}</td><td>${esc(v.dni)}</td><td>${esc(v.persona_visitada)}</td>
    <td>${esc(v.despacho)}</td><td>${esc(v.fecha)}</td><td>${esc(v.hora_entrada)}</td>
    <td>${esc(v.hora_salida ?? "-")}</td><td>${esc(v.tiempo ?? "-")}</td>
    <td>${v.hora_salida ? '<span class="badge ok">Finalizada</span>' : '<span class="badge live">En sede</span>'}</td>
    <td>${v.hora_salida ? "" : `<button class="btn btn-sm" onclick="salida(${v.id_visita}, this)">Salida</button>`}</td></tr>`).join("")
    : `<tr><td colspan="10" style="text-align:center;color:#64748b">Sin resultados</td></tr>`;
}

if (page === "registros") {
  window.refrescar = () => { cargar(); renderRegistros(); };
  refrescar();
  $("btnFiltrar").onclick = () => { renderRegistros(); toast("✔ Filtro aplicado"); };
  $("btnLimpiar").onclick = () => { $("filtroFecha").value = ""; $("filtroDespacho").value = ""; buscar.value = ""; renderRegistros(); };
  $("btnCSV").onclick = () => {
    const lista = filtrados();
    if (!lista.length) return toast("No hay datos para exportar", true);
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    let csv = "Nombre,DNI,Visitado,Despacho,Fecha,Entrada,Salida,Tiempo\n";
    lista.forEach(v => csv += [v.nombre, v.dni, v.persona_visitada, v.despacho, v.fecha,
                               v.hora_entrada, v.hora_salida, v.tiempo].map(q).join(",") + "\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "visitas.csv"; a.click();
    toast("✔ Archivo exportado");
  };
}

// ---------- REPORTES ----------
function cargarReportes() {
  const r = API.reportes();
  $("promedio").textContent = r.promedio_txt;
  const fila = (nombre, total, max) => `<div class="row"><span>${esc(nombre)}</span>
    <span class="bar"><i style="width:${total / max * 100}%"></i></span><b>${total}</b></div>`;
  const maxD = Math.max(1, ...r.por_dia.map(x => x.total));
  const maxS = Math.max(1, ...r.por_despacho.map(x => x.total));
  $("porDia").innerHTML = r.por_dia.map(x => fila(x.fecha, x.total, maxD)).join("");
  $("porDespacho").innerHTML = r.por_despacho.map(x => fila(x.despacho, x.total, maxS)).join("");
}
if (page === "reportes") {
  cargarReportes();
  $("btnActualizar").onclick = () => { cargarReportes(); toast("✔ Reportes actualizados"); };
}
