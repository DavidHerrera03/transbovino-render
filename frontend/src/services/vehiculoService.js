import { cachedJsonRequest, invalidateRequestCache } from "../utils/requestCache";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = `${API_URL}/admin`;

const manejarRespuesta = async (res, mensajeDefault) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || mensajeDefault);
  }
  return data;
};

export const getVehiculos = async (id_usuario, options = {}) => {
  return cachedJsonRequest(`${API}/vehiculos/usuario/${id_usuario}`, {}, { ttl: options.ttl ?? 30000, force: options.force });
};

export const crearVehiculo = async (payload) => {
  const res = await fetch(`${API}/vehiculos/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await manejarRespuesta(res, "No se pudo crear el vehículo");
  invalidateRequestCache("vehiculos");
  invalidateRequestCache("admin");
  return data;
};

export const eliminarVehiculo = async (idVehiculo, idUsuario) => {
  const res = await fetch(`${API}/vehiculos/${idVehiculo}?id_usuario=${idUsuario}`, {
    method: "DELETE",
  });
  const data = await manejarRespuesta(res, "No se pudo eliminar el vehículo");
  invalidateRequestCache("vehiculos");
  invalidateRequestCache("admin");
  return data;
};

export const subirDocumentacionVehiculo = async (idVehiculo, idUsuario, files) => {
  const formData = new FormData();
  formData.append("id_usuario", idUsuario);
  Array.from(files).forEach((file) => formData.append("files", file));

  const res = await fetch(`${API}/vehiculos/${idVehiculo}/documentos`, {
    method: "POST",
    body: formData,
  });

  const data = await manejarRespuesta(res, "No se pudo cargar la documentación del vehículo");
  invalidateRequestCache("vehiculos");
  invalidateRequestCache("admin");
  return data;
};

export const getDocumentosVehiculo = async (idVehiculo, idUsuario) => {
  const res = await fetch(`${API}/vehiculos/${idVehiculo}/documentos?id_usuario=${idUsuario}`);
  const data = await manejarRespuesta(res, "No se pudo cargar la documentación del vehículo");
  invalidateRequestCache("vehiculos");
  invalidateRequestCache("admin");
  return data;
};

export const getUrlDocumentoVehiculo = async (idVehiculo, idDocumento, idUsuario) => {
  const res = await fetch(`${API}/vehiculos/${idVehiculo}/documentos/${idDocumento}/url?id_usuario=${idUsuario}`);
  return manejarRespuesta(res, "No se pudo obtener el documento");
};

export const eliminarDocumentoVehiculo = async (idVehiculo, idDocumento, idUsuario) => {
  const res = await fetch(`${API}/vehiculos/${idVehiculo}/documentos/${idDocumento}?id_usuario=${idUsuario}`, {
    method: "DELETE",
  });
  const data = await manejarRespuesta(res, "No se pudo eliminar el documento");
  invalidateRequestCache("vehiculos");
  invalidateRequestCache("admin");
  return data;
};
