import { cachedJsonRequest, invalidateRequestCache } from "../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const API = API_URL.replace(/\/$/, "");

async function manejarRespuesta(res, mensaje) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || mensaje);
  return data;
}

export async function obtenerFincasUsuario(idUsuario, options = {}) {
  return cachedJsonRequest(`${API}/fincas/usuario/${idUsuario}`, {}, { ttl: options.ttl ?? 30000, force: options.force });
}

export async function obtenerCatalogoFincas(options = {}) {
  return cachedJsonRequest(`${API}/fincas/catalogo`, {}, { ttl: options.ttl ?? 60000, force: options.force });
}

export async function crearFinca(payload) {
  const res = await fetch(`${API}/fincas/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo crear la finca");
  invalidateRequestCache("fincas");
  invalidateRequestCache("admin");
  return data;
}

export async function obtenerFincaPorId(idFinca) {
  return cachedJsonRequest(`${API}/fincas/${idFinca}`, {}, { ttl: 30000 });
}

export async function actualizarFinca(idFinca, payload) {
  const res = await fetch(`${API}/fincas/${idFinca}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo actualizar la finca");
  invalidateRequestCache("fincas");
  invalidateRequestCache("admin");
  return data;
}

export async function eliminarFinca(idFinca, idUsuario) {
  const res = await fetch(`${API}/fincas/${idFinca}?id_usuario=${idUsuario}`, {
    method: "DELETE",
  });
  const data = await manejarRespuesta(res, "No se pudo eliminar la finca");
  invalidateRequestCache("fincas");
  invalidateRequestCache("admin");
  return data;
}

export const getFincasUsuario = obtenerFincasUsuario;
export const getCatalogoFincas = obtenerCatalogoFincas;
export const getFincaPorId = obtenerFincaPorId;
