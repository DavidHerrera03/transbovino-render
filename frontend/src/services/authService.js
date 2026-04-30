const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Base del backend sin slash final. IMPORTANTE: no agregar /admin aqui,
// porque las rutas de autenticacion viven en /auth/*.
const API = API_URL.replace(/\/$/, "");

function obtenerMensajeError(data, fallback) {
  if (!data) return fallback;

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.mensaje === "string") return data.mensaje;

  if (Array.isArray(data.detail)) {
    return (
      data.detail
        .map((item) => item?.msg || item?.message || String(item))
        .filter(Boolean)
        .join(" ") || fallback
    );
  }

  return fallback;
}

async function leerRespuesta(response, fallback) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(obtenerMensajeError(data, fallback));
  }

  return data;
}

// LOGIN
export async function loginUser(datos) {
  const response = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });

  return leerRespuesta(response, "Error al iniciar sesión");
}

// REGISTRO
export async function registerUser(datos) {
  const response = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  });

  return leerRespuesta(response, "Error en el registro");
}

// RECUPERAR CONTRASEÑA
export async function solicitarRecuperacion(correo) {
  const response = await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ correo }),
  });

  return leerRespuesta(response, "No se pudo enviar el correo de recuperación");
}

// RESTABLECER CONTRASEÑA
export async function restablecerPassword({ token, password }) {
  const response = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, password }),
  });

  return leerRespuesta(response, "No se pudo restablecer la contraseña");
}

// Funciones auxiliares antiguas. Se dejan usando la base correcta por compatibilidad
// si alguna pantalla todavia las importa desde este archivo.
export const crearBovino = async (data) => {
  const res = await fetch(`${API}/admin/bovinos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return leerRespuesta(res, "No se pudo crear el bovino");
};

export const obtenerBovinos = async () => {
  const res = await fetch(`${API}/admin/bovinos/`);
  return leerRespuesta(res, "No se pudieron obtener los bovinos");
};

export const obtenerUsuario = async (id) => {
  const res = await fetch(`${API}/usuarios/${id}`);
  return leerRespuesta(res, "No se pudo obtener el usuario");
};
