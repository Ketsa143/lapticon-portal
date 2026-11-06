const BASE_URL = "https://lapticon-backend.onrender.com";
const FIREBASE_API_KEY = "AIzaSyAuh64b_I2OtC7KYuubCVx9plEe2pojp2M";


const CAMPO_CIUDAD = "_id";

let idToken = null;
let uid = null;
let ciudadesPorId = {}; // id -> "Ciudad (País)", para mostrar nombres en la tabla

const $ = (id) => document.getElementById(id);

// ---------- Utilidades ----------
function setStatus(el, mensaje, tipo = "info") {
  el.textContent = mensaje;
  el.className = `status ${tipo}`;
}

// Algunas APIs devuelven [ ... ] y otras { data: [ ... ] }; aceptamos ambas.
function comoLista(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    for (const k of ["data", "ciudades", "paises", "encomiendas", "items", "results"]) {
      if (Array.isArray(json[k])) return json[k];
    }
  }
  return [];
}

// Lee la respuesta como JSON sin romperse si viene vacía o en texto plano.
async function leerJSON(res) {
  const texto = await res.text();
  try { return texto ? JSON.parse(texto) : {}; } catch { return { message: texto }; }
}

function mensajeError(data, res) {
  return (
    data?.error?.message || data?.message || data?.error || data?.msg ||
    `Error ${res.status} ${res.statusText}`
  );
}

const nombreDe = (obj) =>
  obj?.nombre ?? obj?.name ?? obj?.ciudad ?? obj?.pais ?? obj?._id ?? String(obj ?? "");

// Una ciudad en la encomienda puede venir como id, como texto o como objeto poblado.
function nombreCiudad(valor) {
  if (valor && typeof valor === "object") {
    return ciudadesPorId[valor._id] || nombreDe(valor);
  }
  return ciudadesPorId[valor] || valor || "—";
}

// ---------- Bloque 1: Login ----------
$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  const btn = $("login-btn");

  btn.disabled = true;
  setStatus($("login-status"), "Iniciando sesión…", "loading");

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      const errores = {
        INVALID_LOGIN_CREDENTIALS: "Correo o contraseña incorrectos.",
        INVALID_PASSWORD: "Contraseña incorrecta.",
        EMAIL_NOT_FOUND: "El correo no está registrado.",
        USER_DISABLED: "La cuenta está deshabilitada.",
      };
      const codigo = data?.error?.message || "";
      setStatus($("login-status"), errores[codigo] || `Error al iniciar sesión: ${codigo}`, "error");
      return;
    }

    idToken = data.idToken;
    uid = data.localId;

    $("login-section").hidden = true;
    $("app-section").hidden = false;
    $("welcome-message").textContent = `¡Bienvenido, ${data.email}!`;

    // Primero ciudades (para poder traducir ids a nombres en la tabla), luego encomiendas
    await cargarCiudades();
    await cargarEncomiendas();
  } catch (err) {
    setStatus($("login-status"), `No se pudo conectar: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
  }
});

$("logout-btn").addEventListener("click", () => {
  idToken = null;
  uid = null;
  $("app-section").hidden = true;
  $("login-section").hidden = false;
  $("login-password").value = "";
  setStatus($("login-status"), "Sesión cerrada.", "info");
});

// ---------- Bloque 2: Catálogo de ciudades ----------
async function cargarCiudades() {
  const status = $("ciudades-status");
  setStatus(status, "Cargando ciudades… (el servidor gratuito puede tardar hasta 1 minuto en despertar)", "loading");

  try {
    const [paisesRes, ciudadesRes] = await Promise.all([
      fetch(`${BASE_URL}/api/ciudades/paises`),
      fetch(`${BASE_URL}/api/ciudades/ciudades`),
    ]);

    const paisesJson = await leerJSON(paisesRes);
    const ciudadesJson = await leerJSON(ciudadesRes);

    if (!paisesRes.ok) throw new Error(`países: ${mensajeError(paisesJson, paisesRes)}`);
    if (!ciudadesRes.ok) throw new Error(`ciudades: ${mensajeError(ciudadesJson, ciudadesRes)}`);

    const paises = comoLista(paisesJson);
    const ciudades = comoLista(ciudadesJson);

    // Mapa id de país -> nombre del país
    const paisPorId = {};
    paises.forEach((p) => {
      if (typeof p === "object") paisPorId[p._id ?? p.id] = nombreDe(p);
    });

    const origen = $("origen-select");
    const destino = $("destino-select");
    origen.innerHTML = '<option value="">-- Ciudad de origen --</option>';
    destino.innerHTML = '<option value="">-- Ciudad de destino --</option>';
    ciudadesPorId = {};

    ciudades.forEach((c) => {
      const esObjeto = typeof c === "object";
      const nombre = esObjeto ? nombreDe(c) : c;

      // El país puede venir como id, como texto o como objeto poblado
      const paisRaw = esObjeto ? (c.pais ?? c.paisId ?? c.country) : null;
      const pais =
        paisRaw && typeof paisRaw === "object" ? nombreDe(paisRaw) : paisPorId[paisRaw] || paisRaw || "";

      const etiqueta = pais ? `${nombre} (${pais})` : nombre;
      const valor = esObjeto ? (c[CAMPO_CIUDAD] ?? c._id ?? nombre) : c;

      if (esObjeto && c._id) ciudadesPorId[c._id] = etiqueta;

      origen.add(new Option(etiqueta, valor));
      destino.add(new Option(etiqueta, valor));
    });

    setStatus(status, `${ciudades.length} ciudades en ${paises.length} países disponibles.`, "ok");
  } catch (err) {
    setStatus(status, `Error cargando ciudades: ${err.message}`, "error");
  }
}

// ---------- Bloque 3: Crear encomienda ----------
$("encomienda-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = $("encomienda-status");
  const btn = $("encomienda-btn");

  const body = {
    ciudadOrigen: $("origen-select").value,
    ciudadDestino: $("destino-select").value,
    valor: $("valor-input").value.trim(),
    moneda: $("moneda-select").value,
    observaciones: $("observaciones-input").value.trim(),
  };

  // Validación en el cliente: ningún campo vacío
  const nombres = {
    ciudadOrigen: "ciudad de origen",
    ciudadDestino: "ciudad de destino",
    valor: "valor",
    moneda: "moneda",
    observaciones: "observaciones",
  };
  const vacios = Object.keys(body).filter((k) => !body[k]);
  if (vacios.length) {
    setStatus(status, `Completa: ${vacios.map((k) => nombres[k]).join(", ")}.`, "error");
    return;
  }
  if (body.ciudadOrigen === body.ciudadDestino) {
    setStatus(status, "El origen y el destino deben ser ciudades distintas.", "error");
    return;
  }
  const valorNum = Number(body.valor);
  if (!Number.isFinite(valorNum) || valorNum <= 0) {
    setStatus(status, "El valor debe ser un número mayor que 0.", "error");
    return;
  }
  body.valor = valorNum;

  btn.disabled = true;
  setStatus(status, "Creando encomienda…", "loading");

  try {
    const res = await fetch(`${BASE_URL}/api/encomiendas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
    const data = await leerJSON(res);

    if (!res.ok) {
      setStatus(status, `No se pudo crear: ${mensajeError(data, res)}`, "error");
      return;
    }

    setStatus(status, "✅ Encomienda creada con éxito.", "ok");
    $("encomienda-form").reset();
    await cargarEncomiendas(); // refresca la tabla sin recargar la página
  } catch (err) {
    setStatus(status, `Error de conexión: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
  }
});

// ---------- Bloque 4: Listar mis encomiendas ----------
async function cargarEncomiendas() {
  const status = $("encomiendas-status");
  const tbody = $("encomiendas-body");
  setStatus(status, "Cargando encomiendas…", "loading");

  try {
    const res = await fetch(`${BASE_URL}/api/encomiendas`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await leerJSON(res);

    if (!res.ok) {
      setStatus(status, `Error cargando encomiendas: ${mensajeError(data, res)}`, "error");
      return;
    }

    const encomiendas = comoLista(data);
    tbody.innerHTML = "";

    if (encomiendas.length === 0) {
      setStatus(status, "Todavía no tienes encomiendas registradas.", "info");
      return;
    }

    // Las más recientes primero, si la API trae fecha de creación
    encomiendas.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    encomiendas.forEach((enc) => tbody.appendChild(crearFila(enc)));

    setStatus(status, `${encomiendas.length} encomienda(s).`, "ok");
  } catch (err) {
    setStatus(status, `Error de conexión: ${err.message}`, "error");
  }
}

function crearFila(enc) {
  const tr = document.createElement("tr");
  const id = enc._id ?? enc.id;
  tr.dataset.id = id;

  const celdas = [
    nombreCiudad(enc.ciudadOrigen),
    nombreCiudad(enc.ciudadDestino),
    null, // estado (se pinta aparte con badge)
    `${Number(enc.valor).toLocaleString("es-CO")} ${enc.moneda ?? ""}`.trim(),
  ];

  celdas.forEach((texto, i) => {
    const td = document.createElement("td");
    if (i === 2) {
      td.className = "estado";
      td.appendChild(badgeEstado(enc.estado));
    } else {
      td.textContent = texto;
    }
    tr.appendChild(td);
  });

  const tdAccion = document.createElement("td");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Cancelar";
  btn.className = "danger";
  const estado = String(enc.estado || "").toLowerCase();
  btn.disabled = ["cancelada", "entregada"].includes(estado);
  btn.addEventListener("click", () => cancelarEncomienda(id, tr));
  tdAccion.appendChild(btn);
  tr.appendChild(tdAccion);

  return tr;
}

function badgeEstado(estado) {
  const span = document.createElement("span");
  const valor = String(estado || "sin estado").toLowerCase();
  span.className = `badge badge-${valor.replace(/\s+/g, "-")}`;
  span.textContent = valor;
  return span;
}

// ---------- Bloque 5 (reto opcional): cambiar estado ----------
async function cancelarEncomienda(encomiendaId, fila) {
  if (!confirm("¿Seguro que quieres cancelar esta encomienda?")) return;

  const btn = fila.querySelector("button");
  const status = $("encomiendas-status");
  btn.disabled = true;
  btn.textContent = "Cancelando…";

  try {
    const res = await fetch(`${BASE_URL}/api/encomiendas/${encomiendaId}/estado`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ estado: "cancelada" }),
    });
    const data = await leerJSON(res);

    if (!res.ok) {
      setStatus(status, `No se pudo cancelar: ${mensajeError(data, res)}`, "error");
      btn.disabled = false;
      btn.textContent = "Cancelar";
      return;
    }

    // Actualiza solo esa fila, sin recargar
    const tdEstado = fila.querySelector(".estado");
    tdEstado.innerHTML = "";
    tdEstado.appendChild(badgeEstado("cancelada"));
    btn.textContent = "Cancelar";
    btn.disabled = true;
    setStatus(status, "Encomienda cancelada.", "ok");
  } catch (err) {
    setStatus(status, `Error de conexión: ${err.message}`, "error");
    btn.disabled = false;
    btn.textContent = "Cancelar";
  }
}
