import { cachedJsonRequest, invalidateRequestCache } from "../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = `${API_URL}/admin`;

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") {
    return cachedJsonRequest(`${API}${path}`, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options }, { ttl: options.ttl ?? 20000, force: options.force });
  }

  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.mensaje || "Error en la operación");
  }
  invalidateRequestCache("admin");
  return data;
}

export const adminService = {
  getResumen: () => request("/resumen"),
  getUsuarios: (rol = "") => request(`/usuarios${rol ? `?rol=${rol}` : ""}`),
  createUsuario: (payload) => request("/usuarios", { method: "POST", body: JSON.stringify(payload) }),
  updateUsuario: (id, payload) => request(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteUsuario: (id) => request(`/usuarios/${id}`, { method: "DELETE" }),

  getFincas: () => request("/fincas"),
  createFinca: (payload) => request("/fincas", { method: "POST", body: JSON.stringify(payload) }),
  updateFinca: (id, payload) => request(`/fincas/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteFinca: (id) => request(`/fincas/${id}`, { method: "DELETE" }),

  getBovinos: () => request("/bovinos"),
  createBovino: (payload) => request("/bovinos", { method: "POST", body: JSON.stringify(payload) }),
  updateBovino: (id, payload) => request(`/bovinos/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteBovino: (id) => request(`/bovinos/${id}`, { method: "DELETE" }),

  getVehiculos: () => request("/vehiculos"),
  createVehiculo: (payload) => request("/vehiculos", { method: "POST", body: JSON.stringify(payload) }),
  updateVehiculo: (id, payload) => request(`/vehiculos/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteVehiculo: (id) => request(`/vehiculos/${id}`, { method: "DELETE" }),

  getSolicitudes: () => request("/solicitudes"),
  getViajes: () => request("/viajes"),
  updateEstadoViaje: (id, estado) => request(`/viajes/${id}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }),
  getPerfil: (id) => cachedJsonRequest(`${API_URL}/perfil/${id}`, {}, { ttl: 30000 }),
  updatePerfil: (id, payload) => fetch(`${API_URL}/perfil/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(async (res) => { const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.detail || data.mensaje || 'Error al actualizar perfil'); invalidateRequestCache("perfil"); invalidateRequestCache("admin"); return data; }),
};
