import { cachedJsonRequest, invalidateRequestCache } from "../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = API_URL.replace(/\/$/, "");

const manejarRespuesta = async (res, mensajeDefault) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || mensajeDefault);
  }
  return data;
};

export const getPerfil = async (id_usuario) => {
  return cachedJsonRequest(`${API}/perfil/${id_usuario}`, {}, { ttl: 30000 });
};

export const actualizarPerfil = async (id_usuario, payload) => {
  const res = await fetch(`${API}/perfil/${id_usuario}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo actualizar el perfil");
  invalidateRequestCache("perfil");
  invalidateRequestCache("admin");
  return data;
};

export const getMisViajesTransportador = async (id_usuario, filtros = {}) => {
  const params = new URLSearchParams();

  if (filtros.estado) params.append("estado", filtros.estado);
  if (filtros.fecha) params.append("fecha", filtros.fecha);

  const query = params.toString();
  const url = `${API}/transportador/${id_usuario}/viajes${query ? `?${query}` : ""}`;

  return cachedJsonRequest(url, {}, { ttl: filtros.force ? 0 : 15000, force: filtros.force });
};

export const actualizarEstadoViajeTransportador = async (idViaje, idTransportador, estado) => {
  const res = await fetch(`${API}/transportador/viajes/${idViaje}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_transportador: idTransportador, estado }),
  });

  const data = await manejarRespuesta(res, "No se pudo actualizar el estado del viaje");
  invalidateRequestCache("viajes");
  invalidateRequestCache("solicitudes");
  invalidateRequestCache("admin");
  return data;
};

export const getDashboardTransportador = async (id_usuario) => {
  return cachedJsonRequest(`${API}/transportador/${id_usuario}/dashboard`, {}, { ttl: 15000 });
};
