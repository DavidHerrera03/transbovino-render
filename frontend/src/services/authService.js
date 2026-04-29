const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = `${API_URL}/admin`;

function obtenerMensajeError(data, fallback) {
  if (!data) return fallback;

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.mensaje === "string") return data.mensaje;

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean)
      .join(" ") || fallback;
  }

  return fallback;
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(obtenerMensajeError(data, "Error al iniciar sesión"));
  }

  return data;
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(obtenerMensajeError(data, "Error en el registro"));
  }

  return data;
}

export async function solicitarRecuperacion(correo) {
  const response = await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ correo }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(obtenerMensajeError(data, "No se pudo enviar el correo de recuperación"));
  }

  return data;
}

export async function restablecerPassword({ token, password }) {
  const response = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(obtenerMensajeError(data, "No se pudo restablecer la contraseña"));
  }

  return data;
}

export const crearBovino = async (data) => {
  const res = await fetch(`${API}/bovinos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
};

export const obtenerBovinos = async () => {
  const res = await fetch(`${API}/bovinos/`);
  return res.json();
};

export const obtenerUsuario = async (id) => {
  const res = await fetch(`${API}/usuarios/${id}`);
  return res.json();
};
